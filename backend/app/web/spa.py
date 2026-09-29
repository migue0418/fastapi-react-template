from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.settings import get_settings

router = APIRouter(include_in_schema=False)


@router.get("/{full_path:path}")
async def serve_spa(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="No encontrado")

    settings = get_settings()
    dist_dir = settings.frontend_dist_dir
    index_path = dist_dir / "index.html"

    if not dist_dir.exists() or not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No se encuentra el build del frontend. Ejecuta `npm run build` en frontend.",
        )

    requested_path = (dist_dir / full_path).resolve()
    try:
        requested_path.relative_to(dist_dir.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="No encontrado") from exc

    if full_path and requested_path.is_file():
        return FileResponse(requested_path)

    return FileResponse(index_path)
