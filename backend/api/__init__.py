from fastapi import APIRouter

from api import analysis, fires, georeferencing, scenes

api_router: APIRouter = APIRouter(prefix="/api")
api_router.include_router(analysis.router)
api_router.include_router(fires.router)
api_router.include_router(georeferencing.router)
api_router.include_router(scenes.router)
