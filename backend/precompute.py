import asyncio

from dotenv import load_dotenv

load_dotenv()

from api.analysis import DEMO_SCENES_DIR, demo_scene_context, find_fire_days, fire_days_key
from libs import cache
from models import FireDays
from pipeline.models import SceneInput


async def precompute_scene(scene_id: str) -> None:
    scene = SceneInput.model_validate_json((DEMO_SCENES_DIR / f"{scene_id}.json").read_text())
    fire_days = await cache.cached(
        cache.CACHE_DIR / "fire-days", fire_days_key(scene), FireDays, lambda: find_fire_days(scene)
    )
    print(f"{scene_id}: fire from {fire_days.first} to {fire_days.last}")
    context = await demo_scene_context(scene_id)
    print(f"{scene_id}: {len(context.roads)} roads cut")


async def main() -> None:
    """Finds the first and last days of every example scene's fire and its roads cut and weather, so the report page
    never waits for Copernicus, Overpass or Open-Meteo.

    Everything goes to `data/cache/`: run it once before a demo, after `uv run python -m pipeline <scene_id>`.
    """
    for scene_file in sorted(DEMO_SCENES_DIR.glob("*.json")):
        await precompute_scene(scene_file.stem)


asyncio.run(main())
