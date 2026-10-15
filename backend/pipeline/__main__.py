import asyncio
import sys
from pathlib import Path

from pipeline.models import SceneInput
from pipeline.pipeline import analyze


def main() -> None:
    """Runs the analysis for a scene JSON file (see `scenes/`) and prints the result as JSON."""
    scene = SceneInput.model_validate_json(Path(sys.argv[1]).read_text())
    result = asyncio.run(analyze(scene))
    print(result.model_dump_json(indent=2))


main()
