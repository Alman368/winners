# To do — Algoritmo de detección de incendios

Tareas pendientes del algoritmo (`backend/pipeline/`), por prioridad. El detalle técnico de cada una está en `specs-algoritmo.md`.

## Hecho

- [x] Quitar `B08` de la descarga: no la usaba nada (el NBR usa `B8A`).
- [x] Descarga de Sentinel-2 L2A desde CDSE por teselas, con reintentos y caché (§4.1).
- [x] Composición previa al incendio píxel a píxel, 30 días antes de `fire_start` (§4.3).
- [x] Área quemada con dNBR: semillas, histéresis, limpieza y relleno de agujeros pequeños, con evidencia en el SWIR (dNBR2) para no tomar el velo de humo por quemado (§5.3). Dentro de EFFIS: 97.5 % (Niebla), 98.7 % (La Mierla), 98.6 % (Madrid-Ávila).
- [x] Severidad con las clases del USGS (§5.5).
- [x] Fuego activo: regla `B12 ≥ 0.5` y `B12/B8A ≥ 2.5`, agrupación a 100 m, persistencia y contexto (§6).
- [x] Vectorización, superficie y perímetro geodésicos, coordenadas en lon/lat y en píxeles de la imagen original (§7).
- [x] Salida JSON y GeoJSON (§8), con polígonos por clase de severidad y por foco.
- [x] Primera validación contra los perímetros oficiales de EFFIS en las tres escenas: 94–98 % dentro (§3.1).

## Algoritmo

0. [ ] **Regenerar los resultados guardados** (`backend/pipeline/scenes/results/`) en cuanto haya cuota de Copernicus: no incluyen todavía el suavizado del contorno (§7.3). `cd backend && uv run --env-file .env python -m pipeline niebla la_mierla madrid_avila`.

1. [x] **Perímetro inflado en escenas grandes**: cierre de 40 m y perímetro solo de los polígonos de al menos 50 ha (§7.5).
2. [x] **Humo**: máscara de humo (subida de `B04`, también sobre lo que la SCL marca como nube), quemado bajo el humo con dNBR2 > 0.10 y salida `smoke` y `under_smoke_ha` (§5.4). Pendiente: mostrar la capa de humo en el frontend.
3. [ ] **Validar el fuego activo contra NASA FIRMS.** Frente a Wildfires el recall es de 0.96–1.00, pero la precisión baja a 0.25–0.63. Decidir entre nuestra regla y `B11 + B12 > 1` (§6.1).
4. [ ] **Focos fragmentados.** Siguen saliendo 180 focos en Madrid-Ávila; revisar la distancia de agrupación (§6.2).
5. [ ] **Revisar el 3–6 % detectado fuera de EFFIS** en Niebla y Madrid-Ávila: bordes, cosechas o imprecisiones del contorno oficial (§3.1).
6. [ ] **Script de validación en el repo**: fracción dentro de EFFIS (con todos los incendios de la escena hasta la fecha de captura) y comparación de focos con Wildfires y FIRMS (§10.2).
7. [ ] **Anotación manual** de las tres escenas con la clase "dudoso" e IoU/F1 contra ella (§10.1).
8. [ ] **Generalización**: leave-one-scene-out y 2–3 escenas nuevas que no se usen para ajustar (§10.3, §10.4).
9. [ ] **Tests críticos** con las bandas guardadas como fixtures (§10.5).
10. [ ] **Mejoras a medir**, solo si mejoran las métricas en todas las escenas: RdNBR o RBR (índices relativos a la vegetación previa), umbrales adaptados al ruido de fondo de cada escena, filtro de cosechas por forma, confianza por píxel.
11. [ ] **Descarga más rápida y con menos cuota** (`pipeline/copernicus.py`), pendiente de validar contra Copernicus cuando haya cuota (la cuenta devolvió `403 ACCESS_INSUFFICIENT_PROCESSING_UNITS` el 2026-10-15):
    - Un solo token por descarga, renovado solo si Copernicus devuelve 401 (ahora se pide uno por tesela: 56 en Madrid-Ávila).
    - Respetar `Retry-After` en los 429 y reintentar antes los fallos de red (ahora espera 5, 10, 15… s).
    - Fallar al momento con un 403 de cuota en vez de reintentar 6 veces.
    - Caché por tesela: si falla una, no se vuelve a descargar todo el ráster.
    - Quitar `dataMask` de la salida: la clase 0 de la SCL ya marca "sin datos" (1 banda de 6 menos de transferencia; no ahorra PU, que se cobran por bandas leídas).
    - Medir antes de subir la concurrencia de 4: hoy ya salió algún 429.
    - Más adelante: pasada gruesa a 40 m para localizar el incendio y fina a 20 m solo alrededor (menos teselas en escenas grandes como Madrid-Ávila).

## Integración con el resto del equipo

- [ ] **Tests de georreferenciación que fallan fuera del equipo que los grabó**: `ReplayTransport` busca cada respuesta grabada por la URL exacta, y la URL de las teselas de EOX lleva coordenadas que salen del emparejamiento de imágenes. En otra máquina (comprobado en un Mac Intel) salen con mínimas diferencias, la URL cambia y no encuentra la grabación. Fallan 5 tests (`tests/georeferencing/test_api.py`, `test_locate_scenes.py` y 3 de `test_analysis_api.py`).

- [x] **Módulo de localización:** `POST /api/analysis` (`backend/api/analysis.py`) construye el `SceneInput` con la georreferenciación de la foto y `fire_start` de EFFIS (`libs/effis.find_fire_start`, inicio más temprano en UTC de los incendios que tocan el bbox). Pendiente: FIRMS para incendios que no estén en EFFIS.
- [x] **Credenciales:** `backend/.env` con `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` (mismas variables que el resto del backend; ver `backend/.env.example`).
- [ ] **Regenerar el secret de CDSE**: se mostró en una salida de terminal durante el desarrollo.
- [x] **`backend/libs/detection.py`**: se conserva a propósito como análisis rápido sobre el JPG, sin red ni cuenta. El análisis principal es este algoritmo (ver el mapa de módulos en `specs.md` §4.1).
- [x] **Endpoint de la API**: `POST /api/analysis`, con caché del resultado completo en `backend/data/cache/analysis/`. La caché de rásteres pasa a `backend/data/cache/copernicus/`.
- [x] **Frontend conectado al algoritmo**: `GET /api/analysis/scenes/{scene_id}` analiza las escenas de `pipeline/scenes/` (caché en `backend/data/cache/analysis-scenes/`). La página de informe sustituye el área quemada, el perímetro, los focos y la severidad (con su capa en el mapa) del `report.json` de la demo por los del algoritmo (`frontend/src/lib/analysis.ts`).
- [x] **Escenas de ejemplo al instante**: ejecutar el algoritmo desde cero tarda 2 min (Niebla), 3 min (La Mierla) y 11 min (Madrid-Ávila), casi todo descargando de Copernicus. Los resultados de las tres escenas están calculados y guardados en `backend/pipeline/scenes/results/` y `GET /api/analysis/scenes/{scene_id}` los sirve directamente. **Al cambiar el algoritmo hay que regenerarlos**: `cd backend && uv run --env-file .env python -m pipeline niebla la_mierla madrid_avila` (segundos si las bandas ya están en la caché; si no, los minutos de arriba).
- [x] **Selector de fechas eliminado del frontend**: pedía a Copernicus una imagen por cada pasada del satélite (y la comparación entre fechas), llegaba a saturar la cuenta (`429 Too Many Requests`). El mapa muestra solo la imagen del día del incendio (los JPG de la demo).
- [ ] **Endpoints que ya no usa nadie**: `GET /api/scenes/passes` y `GET /api/scenes/image` (`backend/api/scenes.py`) y `backend/libs/copernicus/render.py` con su test solo servían al selector de fechas. Decidir con quien los hizo si se eliminan.
- [ ] **Datos del informe que no salen del algoritmo**: pueblos y carreteras afectados, Red Natura 2000, usos del suelo, recurrencia y validación oficial siguen viniendo del `report.json` estático y se calcularon con otro perímetro.
- [ ] **Proyección de la foto**: `grid.lonlat_to_image_pixel` y `libs/georeferencing/` suponen Web Mercator, pero las exportaciones de Copernicus Browser sin superposiciones están en EPSG:4326. Medido en Madrid-Ávila con 316 puntos: latitud lineal, error mediano 0.6 px y sin curvatura; Web Mercator, 6.0 px con curvatura en U. Hay que volver a la latitud lineal en los dos módulos.
