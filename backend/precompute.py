import asyncio
from datetime import date, timedelta

import httpx
from dotenv import load_dotenv

load_dotenv()

from api.analysis import DEMO_SCENES_DIR, demo_scene_key
from api.scenes import cached_render, is_settled
from libs import cache
from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import search_acquisitions
from libs.copernicus.render import COMPOSITE_BANDS, Composite
from libs.http_client import TIMEOUT_S
from pipeline.models import FireAnalysis, SceneInput
from pipeline.pipeline import analyze

PASS_WINDOW_DAYS: int = 30
"""Same window of passes the report page offers (`PASS_WINDOW_DAYS` in `frontend/src/lib/scenes.ts`)."""
CONCURRENT_RENDERS: int = 2


async def precompute_scene(client: httpx.Client, scene_id: str, renders: asyncio.Semaphore) -> None:
    scene_file = DEMO_SCENES_DIR / f"{scene_id}.json"
    scene = SceneInput.model_validate_json(scene_file.read_text())
    analysis = await cache.cached(
        cache.CACHE_DIR / "analysis-scenes", demo_scene_key(scene_file), FireAnalysis, lambda: analyze(scene)
    )
    print(f"{scene_id}: analysis ready")

    start = analysis.scene.pre_fire_window[1] - timedelta(days=PASS_WINDOW_DAYS)
    end = analysis.scene.acquisition_date + timedelta(days=PASS_WINDOW_DAYS)
    passes = await asyncio.to_thread(search_acquisitions, client, copernicus_token(client), scene.bbox, start, end)
    days = sorted({item.acquired_at.date() for item in passes} - {scene.acquisition_date})

    async def render(day: date, composite: Composite) -> None:
        async with renders:
            await cached_render(client, scene.bbox, day, composite)
        print(f"{scene_id}: {day} {composite}")

    await asyncio.gather(*(render(day, composite) for day in days if is_settled(day) for composite in COMPOSITE_BANDS))
    print(f"{scene_id}: {len(days)} days rendered")


async def main() -> None:
    """Analyses every example scene and renders all its passes, so the report page never waits for Copernicus.

    Everything goes to `data/cache/`: run it once before a demo, and again after changing the pipeline.
    """
    renders = asyncio.Semaphore(CONCURRENT_RENDERS)
    with httpx.Client(timeout=TIMEOUT_S) as client:
        for scene_file in sorted(DEMO_SCENES_DIR.glob("*.json")):
            await precompute_scene(client, scene_file.stem, renders)


asyncio.run(main())
