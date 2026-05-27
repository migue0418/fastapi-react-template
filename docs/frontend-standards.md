# Estándares de frontend

React 19 + TypeScript + Vite + React Router 7, arquitectura por slices. Imita los patrones reales del
template (p. ej. los slices `auth`, `users`).

## Stack

- React 19, TypeScript (estricto), Vite, React Router 7.
- Tests: **Vitest + Testing Library** (`*.test.tsx`), setup en `frontend/src/shared/testing/setup.ts`.
- Lint: ESLint (`npm run lint`). Build: `npm run build` (`tsc -b && vite build`).
- UI propia del proyecto en `frontend/src/shared/ui/` — **no** hay librería de componentes externa.

## Estructura

```
frontend/src/
├── app/            # bootstrap, router, providers, estilos
├── features/<f>/   # slices de UI (auth, users, home, app-shell...)
└── shared/         # api/http.ts, ui/, hooks/, testing/
```

## Capa HTTP — obligatorio pasar por el cliente compartido

Todo acceso al backend pasa por `frontend/src/shared/api/http.ts`, que expone `api.get/post/put/delete`,
**prefija `/api`** y gestiona el refresh de token en respuestas 401. **Nunca uses `fetch` directo en componentes.**

Cada feature define un `api.ts` que envuelve `api.*` y exporta funciones tipadas:

```ts
import { api } from "@/shared/api/http";
import type { UserDetail, UserListItem } from "@/features/users/types";

export function listUsersRequest(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>("/users");
}

export function createUserRequest(payload: CreateUserRequest): Promise<UserDetail> {
  return api.post<UserDetail, CreateUserRequest>("/users", payload);
}
```

(Observa que las URLs NO incluyen `/api`: lo añade el cliente.)

## Componentes y estado

- Componentes funcionales con hooks (`useState`, `useEffect`). Maneja loading y error explícitamente.
- **Estado local** por defecto; no introduzcas estado global nuevo sin necesidad clara.
- Tipa props, estado y respuestas de API con TypeScript. Reutiliza `types.ts` de la feature.
- Componentes genéricos/reutilizables → muévelos a `frontend/src/shared/ui/` (ModalDialog,
  ConfirmDialog, Pagination, etc.).

## Rutas

- Se definen en `frontend/src/app/router.tsx`.
- Rutas protegidas con `ProtectedRoute` / `RoleRoute` del slice `auth`.

## Convenciones

- Imports con alias **`@`** desde `frontend/src` (p. ej. `@/shared/api/http`, `@/features/users/types`).
- Mensajes de usuario en español.
- Tests: render + interacción + estados de carga/error (ver `LoginPage.test.tsx` como referencia).
