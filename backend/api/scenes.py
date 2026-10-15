from fastapi import APIRouter, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from libs.detection import analyze_swir
from models import SceneAnalysis

router: APIRouter = APIRouter(prefix="/scenes", tags=["scenes"])


@router.post("/analyze")
async def analyze_scene(swir: UploadFile) -> SceneAnalysis:
    image = Image.open(swir.file)
    return await run_in_threadpool(analyze_swir, image)
