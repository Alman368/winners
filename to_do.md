# To do — Algoritmo de detección de incendios

Tareas pendientes del algoritmo (`backend/pipeline/`), por prioridad. El detalle técnico de cada una está en `specs-algoritmo.md`.

## Hecho

- [x] Quitar `B08` de la descarga: no la usaba nada (el NBR usa `B8A`).
- [x] Descarga de Sentinel-2 L2A desde CDSE por teselas, con reintentos y caché (§4.1).
- [x] Composición previa al incendio píxel a píxel, 30 días antes de `fire_start` (§4.3).
- [x] Área quemada con dNBR: semillas, histéresis, limpieza y relleno de agujeros pequeños (§5.3).
- [x] Severidad con las clases del USGS (§5.5).
- [x] Fuego activo: regla `B12 ≥ 0.5` y `B12/B8A ≥ 2.5`, agrupación a 100 m, persistencia y contexto (§6).
- [x] Vectorización, superficie y perímetro geodésicos, coordenadas en lon/lat y en píxeles de la imagen original (§7).
- [x] Salida JSON y GeoJSON (§8), con polígonos por clase de severidad y por foco.
- [x] Primera validación contra los perímetros oficiales de EFFIS en las tres escenas: 94–98 % dentro (§3.1).

## Algoritmo

1. [x] **Perímetro inflado en escenas grandes**: cierre de 40 m y perímetro solo de los polígonos de al menos 50 ha (§7.5).
2. [ ] **Humo.** Máscara de humo, prueba de dNBR2 bajo el humo denso y salida `smoke_unassessed` (§5.4).
3. [ ] **Validar el fuego activo contra NASA FIRMS.** Frente a Wildfires el recall es de 0.96–1.00, pero la precisión baja a 0.25–0.63. Decidir entre nuestra regla y `B11 + B12 > 1` (§6.1).
4. [ ] **Focos fragmentados.** Siguen saliendo 180 focos en Madrid-Ávila; revisar la distancia de agrupación (§6.2).
5. [ ] **Revisar el 3–6 % detectado fuera de EFFIS** en Niebla y Madrid-Ávila: bordes, cosechas o imprecisiones del contorno oficial (§3.1).
6. [ ] **Script de validación en el repo**: fracción dentro de EFFIS (con todos los incendios de la escena hasta la fecha de captura) y comparación de focos con Wildfires y FIRMS (§10.2).
7. [ ] **Anotación manual** de las tres escenas con la clase "dudoso" e IoU/F1 contra ella (§10.1).
8. [ ] **Generalización**: leave-one-scene-out y 2–3 escenas nuevas que no se usen para ajustar (§10.3, §10.4).
9. [ ] **Tests críticos** con las bandas guardadas como fixtures (§10.5).
10. [ ] **Mejoras a medir**, solo si mejoran las métricas en todas las escenas: RdNBR o RBR (índices relativos a la vegetación previa), umbrales adaptados al ruido de fondo de cada escena, filtro de cosechas por forma, confianza por píxel.
11. [ ] **Tiempo de Madrid-Ávila** (unos 7 minutos sin caché, casi todo descarga): medir si compensa subir la concurrencia de descarga.

## Integración con el resto del equipo

- [x] **Módulo de localización:** `POST /api/analysis` (`backend/api/analysis.py`) construye el `SceneInput` con la georreferenciación de la foto y `fire_start` de EFFIS (`libs/effis.find_fire_start`, inicio más temprano en UTC de los incendios que tocan el bbox). Pendiente: FIRMS para incendios que no estén en EFFIS.
- [x] **Credenciales:** `backend/.env` con `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` (mismas variables que el resto del backend; ver `backend/.env.example`).
- [ ] **Regenerar el secret de CDSE**: se mostró en una salida de terminal durante el desarrollo.
- [x] **`backend/libs/detection.py`**: se conserva a propósito como análisis rápido sobre el JPG, sin red ni cuenta. El análisis principal es este algoritmo (ver el mapa de módulos en `specs.md` §4.1).
- [x] **Endpoint de la API**: `POST /api/analysis`, con caché del resultado completo en `backend/data/cache/analysis/`. La caché de rásteres pasa a `backend/data/cache/copernicus/`.
- [x] **Frontend conectado al algoritmo**: `GET /api/analysis/scenes/{scene_id}` analiza las escenas de `pipeline/scenes/` (caché en `backend/data/cache/analysis-scenes/`). La página de informe sustituye el área quemada, el perímetro, los focos y la severidad (con su capa en el mapa) del `report.json` de la demo por los del algoritmo (`frontend/src/lib/analysis.ts`).
- [ ] **Primera ejecución de las escenas de ejemplo**: sin caché, Madrid-Ávila tarda unos 7 minutos y el proxy de Vite corta a los 120 s. Hay que calcularlas una vez en cada entorno (por ejemplo, `curl localhost:8765/api/analysis/scenes/madrid_avila`) antes de abrir la página. Tras cambiar el algoritmo, borrar `backend/data/cache/analysis-scenes/`.
- [ ] **Datos del informe que no salen del algoritmo**: pueblos y carreteras afectados, Red Natura 2000, usos del suelo, recurrencia y validación oficial siguen viniendo del `report.json` estático y se calcularon con otro perímetro.
- [ ] **Proyección de la foto**: `grid.lonlat_to_image_pixel` y `libs/georeferencing/` suponen Web Mercator, pero las exportaciones de Copernicus Browser sin superposiciones están en EPSG:4326. Medido en Madrid-Ávila con 316 puntos: latitud lineal, error mediano 0.6 px y sin curvatura; Web Mercator, 6.0 px con curvatura en U. Hay que volver a la latitud lineal en los dos módulos.
