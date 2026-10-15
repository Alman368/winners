import os

from fastapi import FastAPI

from api import api_router

IS_PRODUCTION: bool = os.environ["ENV"] == "production"

app: FastAPI = FastAPI(
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None,
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
