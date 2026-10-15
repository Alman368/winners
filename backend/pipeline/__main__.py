import asyncio
import sys
from pathlib import Path

from pipeline.models import SceneInput
from pipeline.pipeline import analyze

SCENES_DIR: Path = Path(__file__).resolve().parent / "scenes"


async def precompute(scene_ids: list[str]) -> None:
    """Analyses example scenes and stores each result in `scenes/results/`, where the API serves it from."""
    for scene_id in scene_ids:
        scene = SceneInput.model_validate_json((SCENES_DIR / f"{scene_id}.json").read_text())
        result = await analyze(scene)
        (SCENES_DIR / "results" / f"{scene_id}.json").write_text(result.model_dump_json())
        print(f"{scene_id}: {result.burned_area.area_ha} ha, {len(result.active_fires)} active fires")


asyncio.run(precompute(sys.argv[1:]))
