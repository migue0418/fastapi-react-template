import asyncio
import os
import re
import uuid
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import asyncpg
import httpx
import jwt
import pytest
from alembic import command
from alembic.config import Config
from alembic.config import main as alembic_main
from alembic.script import ScriptDirectory
from app.core.database import close_database
from app.core.datetime import utcnow
from app.core.limiter import limiter
from app.core.migrations import build_alembic_config
from app.core.settings import BACKEND_DIR, get_settings
from app.main import create_app
from app.web import spa
from fastapi.testclient import TestClient
from sqlalchemy.engine import URL, make_url

DEFAULT_TEST_DATABASE_ADMIN_URL = (
    "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres"
)


def _get_test_database_admin_url() -> str:
    return os.getenv("TEST_DATABASE_ADMIN_URL", DEFAULT_TEST_DATABASE_ADMIN_URL)


def _quote_identifier(identifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", identifier):
        raise ValueError(f"Invalid PostgreSQL identifier: {identifier}")
    return f'"{identifier}"'


def _make_asyncpg_connect_kwargs(url: URL) -> dict[str, object]:
    kwargs: dict[str, object] = {
        "host": url.host or "127.0.0.1",
        "port": int(url.port or 5432),
        "database": url.database or "postgres",
    }
    if url.username is not None:
        kwargs["user"] = url.username
    if url.password is not None:
        kwargs["password"] = url.password
    return kwargs


async def _create_test_database(admin_url: str, database_name: str) -> str:
    url = make_url(admin_url)
    admin_connection = await asyncpg.connect(**_make_asyncpg_connect_kwargs(url))
    try:
        await admin_connection.execute(
            f"CREATE DATABASE {_quote_identifier(database_name)}",
        )
    finally:
        await admin_connection.close()
    return url.set(database=database_name).render_as_string(hide_password=False)


async def _drop_test_database(admin_url: str, database_name: str) -> None:
    url = make_url(admin_url)
    admin_connection = await asyncpg.connect(**_make_asyncpg_connect_kwargs(url))
    try:
        await admin_connection.execute(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
            """,
            database_name,
        )
        await admin_connection.execute(
            f"DROP DATABASE IF EXISTS {_quote_identifier(database_name)}",
        )
    finally:
        await admin_connection.close()


async def _connect_to_database(database_url: str) -> asyncpg.Connection:
    return await asyncpg.connect(**_make_asyncpg_connect_kwargs(make_url(database_url)))


@contextmanager
def temporary_database(monkeypatch) -> Generator[str, None, None]:
    admin_url = _get_test_database_admin_url()
    database_name = f"fastapi_template_test_{uuid.uuid4().hex}"
    try:
        database_url = asyncio.run(_create_test_database(admin_url, database_name))
    except (OSError, asyncpg.PostgresError) as exc:
        raise RuntimeError(
            "PostgreSQL de tests no disponible. Arranca PostgreSQL o ajusta "
            "TEST_DATABASE_ADMIN_URL antes de ejecutar pytest.",
        ) from exc

    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "ChangeMe123!")
    get_settings.cache_clear()
    try:
        yield database_url
    finally:
        get_settings.cache_clear()
        asyncio.run(_drop_test_database(admin_url, database_name))


@contextmanager
def build_client(monkeypatch) -> Generator[TestClient, None, None]:
    with temporary_database(monkeypatch):
        limiter.reset()
        try:
            app = create_app()
            with TestClient(app) as client:
                yield client
        finally:
            asyncio.run(close_database())


async def _fetch_alembic_version(database_url: str) -> str | None:
    connection = await _connect_to_database(database_url)
    try:
        return await connection.fetchval("SELECT version_num FROM alembic_version")
    finally:
        await connection.close()


def auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def login(
    client: TestClient,
    *,
    username: str = "admin",
    password: str = "ChangeMe123!",
    remember_me: bool = True,
) -> dict:
    response = client.post(
        "/api/auth/login",
        json={
            "username": username,
            "password": password,
            "remember_me": remember_me,
        },
    )
    assert response.status_code == 200
    return response.json()


def get_role_map(client: TestClient, access_token: str) -> dict[str, int]:
    response = client.get("/api/roles", headers=auth_headers(access_token))
    assert response.status_code == 200
    return {role["name"]: role["id"] for role in response.json()}


def create_user(
    client: TestClient,
    access_token: str,
    *,
    username: str,
    password: str,
    role_ids: list[int],
    full_name: str | None = None,
    email: str | None = None,
    is_active: bool = True,
) -> dict:
    response = client.post(
        "/api/users",
        json={
            "username": username,
            "password": password,
            "role_ids": role_ids,
            "full_name": full_name,
            "email": email,
            "is_active": is_active,
        },
        headers=auth_headers(access_token),
    )
    assert response.status_code == 201
    return response.json()


INVALID_CREDENTIALS_DETAIL = (
    "Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."
)


def attempt_login(client: TestClient, username: str, password: str) -> httpx.Response:
    return client.post(
        "/api/auth/login",
        json={"username": username, "password": password, "remember_me": False},
    )


def lock_account(client: TestClient, username: str) -> None:
    for _ in range(5):
        response = attempt_login(client, username, "wrongpassword")
        assert response.status_code == 401


async def _update_lockout_state(
    database_url: str,
    username: str,
    failed_login_attempts: int,
    locked_until: datetime | None,
) -> None:
    connection = await _connect_to_database(database_url)
    try:
        await connection.execute(
            """
            UPDATE users
            SET failed_login_attempts = $1, locked_until = $2
            WHERE username = $3
            """,
            failed_login_attempts,
            locked_until,
            username,
        )
    finally:
        await connection.close()


async def _fetch_lockout_state(
    database_url: str,
    username: str,
) -> tuple[int, datetime | None]:
    connection = await _connect_to_database(database_url)
    try:
        row = await connection.fetchrow(
            "SELECT failed_login_attempts, locked_until FROM users WHERE username = $1",
            username,
        )
    finally:
        await connection.close()
    assert row is not None
    return row["failed_login_attempts"], row["locked_until"]


def set_lockout_state(
    username: str,
    *,
    failed_login_attempts: int,
    locked_until: datetime | None,
) -> None:
    asyncio.run(
        _update_lockout_state(
            get_settings().database_url,
            username,
            failed_login_attempts,
            locked_until,
        ),
    )


def get_lockout_state(username: str) -> tuple[int, datetime | None]:
    return asyncio.run(_fetch_lockout_state(get_settings().database_url, username))


async def _expire_refresh_tokens(database_url: str) -> None:
    connection = await _connect_to_database(database_url)
    try:
        await connection.execute(
            "UPDATE auth_refresh_tokens SET expires_at = $1",
            utcnow() - timedelta(minutes=1),
        )
    finally:
        await connection.close()


async def _insert_admin_role(database_url: str, description: str) -> None:
    connection = await _connect_to_database(database_url)
    try:
        now = utcnow()
        await connection.execute(
            """
            INSERT INTO roles (name, description, created_at, updated_at)
            VALUES ('admin', $1, $2, $2)
            """,
            description,
            now,
        )
    finally:
        await connection.close()


async def _fetch_admin_role_description(database_url: str) -> str:
    connection = await _connect_to_database(database_url)
    try:
        return await connection.fetchval(
            "SELECT description FROM roles WHERE name = 'admin'",
        )
    finally:
        await connection.close()


def assert_utc_iso(value: str) -> datetime:
    assert value.endswith(("Z", "+00:00"))
    parsed = datetime.fromisoformat(value)
    assert parsed.utcoffset() == timedelta(0)
    return parsed


@pytest.fixture()
def client(monkeypatch) -> Generator[TestClient, None, None]:
    with build_client(monkeypatch) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_and_me(client: TestClient) -> None:
    tokens = login(client)
    me_response = client.get(
        "/api/auth/me",
        headers=auth_headers(tokens["access_token"]),
    )
    assert me_response.status_code == 200
    assert me_response.json() == {
        "id": 1,
        "username": "admin",
        "full_name": "Administrador",
        "email": None,
        "is_active": True,
        "roles": ["admin"],
    }


def test_me_requires_bearer(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Falta el token de acceso"}


def test_refresh_rotation_and_reuse_detection(client: TestClient) -> None:
    login(client)
    original_cookie = client.cookies.get("refresh_token")
    assert original_cookie is not None

    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    rotated_cookie = client.cookies.get("refresh_token")
    assert rotated_cookie is not None
    assert rotated_cookie != original_cookie

    client.cookies.set(
        "refresh_token",
        original_cookie,
        path="/api/auth",
    )
    reuse_response = client.post("/api/auth/refresh")
    assert reuse_response.status_code == 401
    assert reuse_response.json() == {
        "detail": "Se ha detectado la reutilización del token de refresco",
    }


def test_sessions_and_revoke(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])

    sessions_response = client.get("/api/auth/sessions", headers=headers)
    assert sessions_response.status_code == 200
    sessions = sessions_response.json()
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True

    delete_response = client.delete(
        f"/api/auth/sessions/{sessions[0]['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    sessions_after = client.get("/api/auth/sessions", headers=headers)
    assert sessions_after.status_code == 200
    assert sessions_after.json() == []

    revoked_again_response = client.delete(
        f"/api/auth/sessions/{sessions[0]['id']}",
        headers=headers,
    )
    assert revoked_again_response.status_code == 400
    assert revoked_again_response.json() == {"detail": "Sesión ya revocada"}



def test_admin_can_manage_roles_and_users(client: TestClient) -> None:
    admin_tokens = login(client)
    admin_headers = auth_headers(admin_tokens["access_token"])
    role_map = get_role_map(client, admin_tokens["access_token"])

    create_role_response = client.post(
        "/api/roles",
        json={"name": "manager", "description": "Gestion de stock"},
        headers=admin_headers,
    )
    assert create_role_response.status_code == 201
    manager_role = create_role_response.json()
    assert manager_role["name"] == "manager"

    duplicate_role_response = client.post(
        "/api/roles",
        json={"name": "manager", "description": "Duplicado"},
        headers=admin_headers,
    )
    assert duplicate_role_response.status_code == 409

    update_role_response = client.put(
        f"/api/roles/{manager_role['id']}",
        json={"name": "manager", "description": "Gestion de stock y equipo"},
        headers=admin_headers,
    )
    assert update_role_response.status_code == 200
    assert update_role_response.json()["description"] == "Gestion de stock y equipo"

    created_user = create_user(
        client,
        admin_tokens["access_token"],
        username="operario",
        password="Operario123!",
        role_ids=[role_map["user"], manager_role["id"]],
        full_name="Operario Principal",
        email="operario@example.com",
    )
    assert created_user["roles"] == ["manager", "user"]

    duplicate_user_response = client.post(
        "/api/users",
        json={
            "username": "operario",
            "password": "Operario123!",
            "role_ids": [role_map["user"]],
            "full_name": None,
            "email": None,
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert duplicate_user_response.status_code == 409

    list_users_response = client.get("/api/users", headers=admin_headers)
    assert list_users_response.status_code == 200
    assert any(user["username"] == "operario" for user in list_users_response.json())

    detail_response = client.get(
        f"/api/users/{created_user['id']}",
        headers=admin_headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["role_ids"] == sorted(
        [role_map["user"], manager_role["id"]],
    )

    user_tokens = login(client, username="operario", password="Operario123!")
    user_headers = auth_headers(user_tokens["access_token"])
    user_refresh_cookie = client.cookies.get("refresh_token")
    assert user_refresh_cookie is not None

    forbidden_users_response = client.get("/api/users", headers=user_headers)
    assert forbidden_users_response.status_code == 403
    forbidden_roles_response = client.get("/api/roles", headers=user_headers)
    assert forbidden_roles_response.status_code == 403

    update_user_response = client.put(
        f"/api/users/{created_user['id']}",
        json={
            "username": "operario",
            "full_name": "Operario Desactivado",
            "email": "operario@example.com",
            "is_active": False,
            "role_ids": [manager_role["id"]],
        },
        headers=admin_headers,
    )
    assert update_user_response.status_code == 200
    assert update_user_response.json()["is_active"] is False
    assert update_user_response.json()["roles"] == ["manager"]

    client.cookies.set("refresh_token", user_refresh_cookie, path="/api/auth")
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401


def test_change_own_password_revokes_sessions(client: TestClient) -> None:
    admin_tokens = login(client)
    role_map = get_role_map(client, admin_tokens["access_token"])
    create_user(
        client,
        admin_tokens["access_token"],
        username="tecnico",
        password="Tecnico123!",
        role_ids=[role_map["user"]],
        full_name="Tecnico",
    )

    user_tokens = login(client, username="tecnico", password="Tecnico123!")
    user_refresh_cookie = client.cookies.get("refresh_token")
    assert user_refresh_cookie is not None

    change_password_response = client.post(
        "/api/users/me/change-password",
        json={
            "current_password": "Tecnico123!",
            "new_password": "Tecnico456!",
        },
        headers=auth_headers(user_tokens["access_token"]),
    )
    assert change_password_response.status_code == 204

    client.cookies.set("refresh_token", user_refresh_cookie, path="/api/auth")
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401

    old_login_response = client.post(
        "/api/auth/login",
        json={
            "username": "tecnico",
            "password": "Tecnico123!",
            "remember_me": True,
        },
    )
    assert old_login_response.status_code == 401
    assert old_login_response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}

    new_login_response = client.post(
        "/api/auth/login",
        json={
            "username": "tecnico",
            "password": "Tecnico456!",
            "remember_me": True,
        },
    )
    assert new_login_response.status_code == 200


def test_admin_can_reset_password_and_last_admin_is_protected(
    client: TestClient,
) -> None:
    admin_tokens = login(client)
    admin_headers = auth_headers(admin_tokens["access_token"])
    role_map = get_role_map(client, admin_tokens["access_token"])

    created_user = create_user(
        client,
        admin_tokens["access_token"],
        username="almacen",
        password="Almacen123!",
        role_ids=[role_map["user"]],
        full_name="Usuario Almacen",
    )

    _ = login(client, username="almacen", password="Almacen123!")
    user_refresh_cookie = client.cookies.get("refresh_token")
    assert user_refresh_cookie is not None

    reset_password_response = client.post(
        f"/api/users/{created_user['id']}/reset-password",
        json={"new_password": "Almacen456!"},
        headers=admin_headers,
    )
    assert reset_password_response.status_code == 204

    client.cookies.set("refresh_token", user_refresh_cookie, path="/api/auth")
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401

    old_login_response = client.post(
        "/api/auth/login",
        json={
            "username": "almacen",
            "password": "Almacen123!",
            "remember_me": True,
        },
    )
    assert old_login_response.status_code == 401
    assert old_login_response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}

    new_login_response = client.post(
        "/api/auth/login",
        json={
            "username": "almacen",
            "password": "Almacen456!",
            "remember_me": True,
        },
    )
    assert new_login_response.status_code == 200

    admin_detail_response = client.get("/api/users", headers=admin_headers)
    admin_id = next(
        user["id"]
        for user in admin_detail_response.json()
        if user["username"] == "admin"
    )

    delete_admin_response = client.delete(
        f"/api/users/{admin_id}",
        headers=admin_headers,
    )
    assert delete_admin_response.status_code == 400
    assert delete_admin_response.json() == {
        "detail": "No se puede eliminar o degradar al último admin activo",
    }

    deactivate_admin_response = client.put(
        f"/api/users/{admin_id}",
        json={
            "username": "admin",
            "full_name": "Administrador",
            "email": None,
            "is_active": False,
            "role_ids": [role_map["admin"]],
        },
        headers=admin_headers,
    )
    assert deactivate_admin_response.status_code == 400
    assert deactivate_admin_response.json() == {
        "detail": "No se puede eliminar o degradar al último admin activo",
    }

    demote_admin_response = client.put(
        f"/api/users/{admin_id}",
        json={
            "username": "admin",
            "full_name": "Administrador",
            "email": None,
            "is_active": True,
            "role_ids": [role_map["user"]],
        },
        headers=admin_headers,
    )
    assert demote_admin_response.status_code == 400
    assert demote_admin_response.json() == {
        "detail": "No se puede eliminar o degradar al último admin activo",
    }


def test_login_invalid_credentials(client: TestClient) -> None:
    response = attempt_login(client, "admin", "wrongpassword")
    assert response.status_code == 401
    assert response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}


def test_login_missing_fields(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 422


def test_me_with_invalid_jwt(client: TestClient) -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Token de acceso no válido"}


def test_get_nonexistent_user(client: TestClient) -> None:
    tokens = login(client)
    response = client.get(
        "/api/users/999999",
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 404


def test_delete_nonexistent_user(client: TestClient) -> None:
    tokens = login(client)
    response = client.delete(
        "/api/users/999999",
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 404


def test_list_users_without_token(client: TestClient) -> None:
    response = client.get("/api/users")
    assert response.status_code == 401


def test_create_user_with_short_password(client: TestClient) -> None:
    tokens = login(client)
    role_map = get_role_map(client, tokens["access_token"])
    response = client.post(
        "/api/users",
        json={
            "username": "newuser",
            "password": "short",
            "role_ids": [role_map["user"]],
        },
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 422


def test_delete_role_success(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])

    create_response = client.post(
        "/api/roles",
        json={"name": "temporal", "description": "Rol temporal para test"},
        headers=headers,
    )
    assert create_response.status_code == 201
    role_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/roles/{role_id}", headers=headers)
    assert delete_response.status_code == 204

    get_response = client.get(f"/api/roles/{role_id}", headers=headers)
    assert get_response.status_code == 404


def test_delete_system_role_is_forbidden(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    role_map = get_role_map(client, tokens["access_token"])

    for role_name in ("admin", "user"):
        response = client.delete(f"/api/roles/{role_map[role_name]}", headers=headers)
        assert response.status_code == 400


def test_account_lockout_after_failed_attempts(client: TestClient) -> None:
    lock_account(client, "admin")
    failed_attempts, locked_until = get_lockout_state("admin")
    assert failed_attempts == 5
    assert locked_until is not None
    remaining = locked_until - utcnow()
    assert timedelta(minutes=14) < remaining <= timedelta(minutes=15)

    locked_response = attempt_login(client, "admin", "ChangeMe123!")
    assert locked_response.status_code == 401
    assert locked_response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}
    assert locked_response.cookies.get("refresh_token") is None
    assert get_lockout_state("admin") == (5, locked_until)


def test_get_user_with_zero_id_returns_422(client: TestClient) -> None:
    tokens = login(client)
    response = client.get("/api/users/0", headers=auth_headers(tokens["access_token"]))
    assert response.status_code == 422


def test_get_user_with_negative_id_returns_422(client: TestClient) -> None:
    tokens = login(client)
    response = client.get("/api/users/-1", headers=auth_headers(tokens["access_token"]))
    assert response.status_code == 422


def test_security_headers_present(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"


def test_update_user_without_role_ids_returns_422(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    users_response = client.get("/api/users", headers=headers)
    admin_id = users_response.json()[0]["id"]

    response = client.put(
        f"/api/users/{admin_id}",
        json={"username": "admin", "full_name": "Administrador", "email": None, "is_active": True},
        headers=headers,
    )
    assert response.status_code == 422


def test_create_user_invalid_username_pattern(client: TestClient) -> None:
    tokens = login(client)
    role_map = get_role_map(client, tokens["access_token"])
    response = client.post(
        "/api/users",
        json={
            "username": "usuario invalido",
            "password": "Password123!",
            "role_ids": [role_map["user"]],
        },
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 422


def test_change_password_with_short_new_password(client: TestClient) -> None:
    tokens = login(client)
    response = client.post(
        "/api/users/me/change-password",
        json={"current_password": "ChangeMe123!", "new_password": "corta"},
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 422


def test_user_response_includes_lockout_fields(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    users = client.get("/api/users", headers=headers).json()
    assert users[0]["is_locked"] is False
    assert users[0]["locked_until"] is None

    detail = client.get(f"/api/users/{users[0]['id']}", headers=headers).json()
    assert detail["is_locked"] is False
    assert detail["locked_until"] is None


def test_sessions_dates_have_utc_offset(client: TestClient) -> None:
    tokens = login(client)
    response = client.get("/api/auth/sessions", headers=auth_headers(tokens["access_token"]))
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) == 1
    created_at = assert_utc_iso(sessions[0]["created_at"])
    expires_at = assert_utc_iso(sessions[0]["expires_at"])
    now = datetime.now(UTC)
    assert abs(now - created_at) < timedelta(minutes=1)
    assert expires_at > now


def test_sessions_require_bearer(client: TestClient) -> None:
    response = client.get("/api/auth/sessions")
    assert response.status_code == 401


def test_locked_user_has_utc_locked_until(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    role_map = get_role_map(client, tokens["access_token"])
    created_user = create_user(
        client,
        tokens["access_token"],
        username="bloqueado",
        password="Bloqueado123!",
        role_ids=[role_map["user"]],
    )
    locked_until = utcnow().replace(microsecond=0) + timedelta(minutes=10)
    set_lockout_state("bloqueado", failed_login_attempts=5, locked_until=locked_until)

    users = client.get("/api/users", headers=headers).json()
    listed = next(user for user in users if user["username"] == "bloqueado")
    assert listed["is_locked"] is True
    assert assert_utc_iso(listed["locked_until"]) == locked_until.replace(tzinfo=UTC)

    detail = client.get(f"/api/users/{created_user['id']}", headers=headers).json()
    assert detail["is_locked"] is True
    assert assert_utc_iso(detail["locked_until"]) == locked_until.replace(tzinfo=UTC)


def test_unknown_and_locked_users_get_identical_response(client: TestClient) -> None:
    lock_account(client, "admin")

    locked_response = attempt_login(client, "admin", "wrongpassword")
    unknown_response = attempt_login(client, "no-existe", "wrongpassword")

    assert locked_response.status_code == unknown_response.status_code == 401
    assert locked_response.json() == unknown_response.json() == {
        "detail": INVALID_CREDENTIALS_DETAIL,
    }


def test_failure_after_expired_lockout_restarts_counter(client: TestClient) -> None:
    set_lockout_state(
        "admin",
        failed_login_attempts=5,
        locked_until=utcnow() - timedelta(minutes=1),
    )

    response = attempt_login(client, "admin", "wrongpassword")

    assert response.status_code == 401
    assert response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}
    assert get_lockout_state("admin") == (1, None)


def test_login_after_expired_lockout_clears_state(client: TestClient) -> None:
    set_lockout_state(
        "admin",
        failed_login_attempts=5,
        locked_until=utcnow() - timedelta(minutes=1),
    )

    login(client)

    assert get_lockout_state("admin") == (0, None)


def test_inactive_user_with_valid_password_gets_inactive_detail(client: TestClient) -> None:
    tokens = login(client)
    role_map = get_role_map(client, tokens["access_token"])
    create_user(
        client,
        tokens["access_token"],
        username="inactivo",
        password="Inactivo123!",
        role_ids=[role_map["user"]],
        is_active=False,
    )

    wrong_response = attempt_login(client, "inactivo", "wrongpassword")
    assert wrong_response.status_code == 401
    assert wrong_response.json() == {"detail": INVALID_CREDENTIALS_DETAIL}

    valid_response = attempt_login(client, "inactivo", "Inactivo123!")
    assert valid_response.status_code == 401
    assert valid_response.json() == {"detail": "Usuario inactivo"}


def test_admin_can_unlock_locked_user(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    role_map = get_role_map(client, tokens["access_token"])
    created_user = create_user(
        client,
        tokens["access_token"],
        username="bloqueado",
        password="Bloqueado123!",
        role_ids=[role_map["user"]],
    )
    lock_account(client, "bloqueado")
    assert attempt_login(client, "bloqueado", "Bloqueado123!").status_code == 401

    response = client.post(f"/api/users/{created_user['id']}/unlock", headers=headers)

    assert response.status_code == 204
    assert get_lockout_state("bloqueado") == (0, None)
    login(client, username="bloqueado", password="Bloqueado123!")


def test_unlock_is_idempotent_and_keeps_sessions(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    role_map = get_role_map(client, tokens["access_token"])
    created_user = create_user(
        client,
        tokens["access_token"],
        username="libre",
        password="Libre1234!",
        role_ids=[role_map["user"]],
    )
    login(client, username="libre", password="Libre1234!")

    for _ in range(2):
        response = client.post(f"/api/users/{created_user['id']}/unlock", headers=headers)
        assert response.status_code == 204

    assert get_lockout_state("libre") == (0, None)
    # La cookie del cliente es la de "libre": si unlock revocara sesiones, el refresh fallaría.
    assert client.post("/api/auth/refresh").status_code == 200
    login(client, username="libre", password="Libre1234!")


def test_unlock_nonexistent_user_returns_404(client: TestClient) -> None:
    tokens = login(client)
    response = client.post(
        "/api/users/999999/unlock",
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Usuario no encontrado"}


def test_unlock_requires_admin(client: TestClient) -> None:
    tokens = login(client)
    role_map = get_role_map(client, tokens["access_token"])
    created_user = create_user(
        client,
        tokens["access_token"],
        username="normal",
        password="Normal1234!",
        role_ids=[role_map["user"]],
    )
    user_tokens = login(client, username="normal", password="Normal1234!")

    response = client.post(
        f"/api/users/{created_user['id']}/unlock",
        headers=auth_headers(user_tokens["access_token"]),
    )
    assert response.status_code == 403


def test_unlock_without_token_returns_401(client: TestClient) -> None:
    response = client.post("/api/users/1/unlock")
    assert response.status_code == 401


def test_unlock_with_invalid_id_returns_422(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    for invalid_id in (0, -1):
        response = client.post(f"/api/users/{invalid_id}/unlock", headers=headers)
        assert response.status_code == 422


def test_reset_password_unlocks_user(client: TestClient) -> None:
    tokens = login(client)
    headers = auth_headers(tokens["access_token"])
    role_map = get_role_map(client, tokens["access_token"])
    created_user = create_user(
        client,
        tokens["access_token"],
        username="bloqueado",
        password="Bloqueado123!",
        role_ids=[role_map["user"]],
    )
    lock_account(client, "bloqueado")

    response = client.post(
        f"/api/users/{created_user['id']}/reset-password",
        json={"new_password": "Nueva12345!"},
        headers=headers,
    )

    assert response.status_code == 204
    assert get_lockout_state("bloqueado") == (0, None)
    login(client, username="bloqueado", password="Nueva12345!")


def test_change_password_with_wrong_current_password_returns_400(
    client: TestClient,
) -> None:
    tokens = login(client)
    role_map = get_role_map(client, tokens["access_token"])
    create_user(
        client,
        tokens["access_token"],
        username="tecnico",
        password="Tecnico123!",
        role_ids=[role_map["user"]],
    )
    user_tokens = login(client, username="tecnico", password="Tecnico123!")

    response = client.post(
        "/api/users/me/change-password",
        json={"current_password": "Incorrecta1!", "new_password": "Tecnico456!"},
        headers=auth_headers(user_tokens["access_token"]),
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "La contraseña actual no es válida"}
    assert client.post("/api/auth/refresh").status_code == 200


def test_alembic_ini_has_no_database_url() -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    assert config.get_main_option("sqlalchemy.url") is None


def test_alembic_config_accepts_percent_encoded_database_url(monkeypatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://user:p%40ss@127.0.0.1:5432/db",
    )
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-bytes")
    get_settings.cache_clear()
    try:
        config = build_alembic_config()
    finally:
        get_settings.cache_clear()
    assert config.get_main_option("sqlalchemy.url") is None


def test_alembic_cli_uses_settings_database_url(monkeypatch) -> None:
    # Con URL en el .ini, la CLI migraría otra base antes de que el test pudiera fallar.
    assert Config(str(BACKEND_DIR / "alembic.ini")).get_main_option("sqlalchemy.url") is None

    with temporary_database(monkeypatch) as database_url:
        monkeypatch.chdir(BACKEND_DIR)
        alembic_main(argv=["--raiseerr", "upgrade", "head"])
        version = asyncio.run(_fetch_alembic_version(database_url))

    head = ScriptDirectory.from_config(build_alembic_config()).get_current_head()
    assert version == head


def test_me_with_wrong_signature_returns_invalid_token(client: TestClient) -> None:
    token = jwt.encode(
        {"sub": "1", "username": "admin", "roles": ["admin"], "exp": 4102444800},
        "otra-clave-distinta-de-al-menos-32-bytes",
        algorithm="HS256",
    )
    response = client.get("/api/auth/me", headers=auth_headers(token))
    assert response.status_code == 401
    assert response.json() == {"detail": "Token de acceso no válido"}


def test_me_with_expired_token(client: TestClient) -> None:
    expired_at = datetime.now(UTC) - timedelta(minutes=1)
    token = jwt.encode(
        {
            "sub": "1",
            "username": "admin",
            "roles": ["admin"],
            "exp": int(expired_at.timestamp()),
        },
        get_settings().secret_key,
        algorithm="HS256",
    )
    response = client.get("/api/auth/me", headers=auth_headers(token))
    assert response.status_code == 401
    assert response.json() == {"detail": "El token de acceso ha caducado"}


def test_refresh_without_cookie(client: TestClient) -> None:
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
    assert response.json() == {"detail": "Falta el token de refresco"}


def test_refresh_with_unknown_token(client: TestClient) -> None:
    client.cookies.set("refresh_token", "desconocido", path="/api/auth")
    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
    assert response.json() == {"detail": "Token de refresco no válido"}


def test_refresh_with_expired_token(client: TestClient) -> None:
    login(client)
    asyncio.run(_expire_refresh_tokens(get_settings().database_url))

    response = client.post("/api/auth/refresh")
    assert response.status_code == 401
    assert response.json() == {"detail": "El token de refresco ha caducado"}


def test_revoke_unknown_session_returns_404(client: TestClient) -> None:
    tokens = login(client)
    response = client.delete(
        "/api/auth/sessions/999999",
        headers=auth_headers(tokens["access_token"]),
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Sesión no encontrada"}


def test_seed_creates_roles_with_accented_descriptions(client: TestClient) -> None:
    tokens = login(client)
    response = client.get("/api/roles", headers=auth_headers(tokens["access_token"]))
    assert response.status_code == 200
    descriptions = {role["name"]: role["description"] for role in response.json()}
    assert descriptions == {
        "admin": "Administración del sistema",
        "user": "Usuario operativo",
    }


def test_unknown_api_path_returns_spanish_not_found(client: TestClient) -> None:
    response = client.get("/api/no-existe")
    assert response.status_code == 404
    assert response.json() == {"detail": "No encontrado"}


def test_spa_without_build_returns_spanish_detail(
    client: TestClient,
    monkeypatch,
    tmp_path,
) -> None:
    # frontend/dist puede existir en local; se apunta a un directorio vacío para no depender de ello.
    monkeypatch.setattr(
        spa,
        "get_settings",
        lambda: SimpleNamespace(frontend_dist_dir=tmp_path / "dist"),
    )
    response = client.get("/")
    assert response.status_code == 404
    assert response.json() == {
        "detail": (
            "No se encuentra el build del frontend. Ejecuta `npm run build` en frontend."
        ),
    }


@pytest.mark.parametrize(
    ("initial_description", "expected_description"),
    [
        ("Administracion del sistema", "Administración del sistema"),
        ("Gestión completa de la plataforma", "Gestión completa de la plataforma"),
    ],
)
def test_migration_0003_fixes_only_seeded_admin_description(
    monkeypatch,
    initial_description: str,
    expected_description: str,
) -> None:
    with temporary_database(monkeypatch) as database_url:
        config = build_alembic_config()
        command.upgrade(config, "0002")
        asyncio.run(_insert_admin_role(database_url, initial_description))

        command.upgrade(config, "0003")
        assert asyncio.run(_fetch_admin_role_description(database_url)) == expected_description

        command.downgrade(config, "0002")
        assert asyncio.run(_fetch_admin_role_description(database_url)) == initial_description
