# Winners

Informe de incendios forestales a partir de imágenes Sentinel-2 para el reto de Indra Espacio del III Malackathon 2026.

## Qué hace

Localiza las imágenes exportadas del Copernicus Browser, delimita la zona quemada y los focos activos, calcula la severidad del incendio y cruza el perímetro con núcleos de población, carreteras, embalses, vegetación y el perímetro oficial de EFFIS.

## Por qué es útil

Convierte imágenes de satélite sin coordenadas en un informe con cifras reales: hectáreas quemadas, severidad, valores afectados y fiabilidad del dato, todo en un mapa interactivo con su fuente y fecha.

## Cómo usarlo

Para desarrollo local:

```bash
cp backend/.env.example backend/.env
docker compose -f docker-compose.dev.yml up --build
```

El frontend queda en `http://localhost:5173` y el backend en `http://localhost:8765`.
`backend/.env` solo contiene secretos: las credenciales de Copernicus Data Space (`COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`) y la clave de NASA FIRMS. El resto de la configuración está en los `docker-compose`. Para arrancar el backend sin Docker, añade también `ENV` y `CORS_ORIGINS`.

## Caché

`POST /api/analysis` tarda minutos la primera vez con una foto: localizarla, consultar EFFIS y descargar las bandas de Copernicus, que además gasta cuota. Por eso los resultados se guardan en `backend/data/cache/`, ignorada por git y montada como volumen `backend_cache` en producción:

| Carpeta | Qué guarda |
|---|---|
| `georeference/` | La localización de cada foto (por contenido de la imagen, nombre del archivo y lugar) |
| `copernicus/` | Las bandas de Sentinel-2 descargadas por el algoritmo |
| `analysis/` | El análisis completo de cada foto: una foto ya analizada se responde al instante |

Para comprobar que todo funciona desde cero, borra la carpeta entera, o solo `analysis/` para recalcular con las bandas ya descargadas:

```bash
rm -rf backend/data/cache
```

En producción, la caché está en el volumen de Docker: `docker volume rm` con el volumen `backend_cache` (con el contenedor parado).

Las dependencias de Python se declaran en `backend/pyproject.toml` y sus versiones exactas en `backend/uv.lock`.
Desde `backend/`, utiliza `uv add` y `uv remove` para gestionarlas y guarda ambos archivos en Git.
La versión de Python está definida en `backend/.python-version`.

Antes de subir cambios:

```bash
cd frontend && npm run lint && npm run build
cd ../backend
uv sync --locked
uv run --locked python -m compileall -q -x '(^|/)\.venv/' .
uv run --locked pytest
```
