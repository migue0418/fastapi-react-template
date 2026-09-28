from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _as_utc(value: datetime) -> datetime:
    # La BD guarda UTC naive; sin tzinfo la API saldría sin offset y el navegador la leería como hora local.
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


UtcDatetime = Annotated[datetime, AfterValidator(_as_utc)]
