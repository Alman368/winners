# To do — Algoritmo de detección de incendios

Tareas pendientes del algoritmo (`backend/pipeline/`), por prioridad. El detalle técnico de cada una está en `specs.md`.

## Hecho

- [x] Descarga de Sentinel-2 L2A desde CDSE por teselas, con reintentos y caché (§4.1).
- [x] Composición previa al incendio píxel a píxel, 30 días antes de `fire_start` (§4.3).
- [x] Área quemada con dNBR: semillas, histéresis, limpieza y relleno de agujeros pequeños (§5.3).
- [x] Severidad con las clases del USGS (§5.5).
- [x] Fuego activo: regla `B12 ≥ 0.5` y `B12/B8A ≥ 2.5`, agrupación a 100 m, persistencia y contexto (§6).
- [x] Vectorización, superficie y perímetro geodésicos, coordenadas en lon/lat y en píxeles de la imagen original (§7).
- [x] Salida JSON y GeoJSON (§8).
- [x] Primera validación contra los perímetros oficiales de EFFIS en las tres escenas: 94–98 % dentro (§3.1).

## Algoritmo

1. [ ] **Perímetro inflado en escenas grandes** (1230 km en Madrid-Ávila). Probar a unir polígonos separados menos de 40 m y a reportar el perímetro solo de los polígonos grandes; quedarse con la opción que dé un perímetro comparable al de EFFIS (§7.5).
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

- [ ] **Módulo de localización:** tiene que entregar `SceneInput` (`bbox`, `acquisition_date`, `fire_start`, `image_size`; ver §2). `fire_start` sale de EFFIS o, si el incendio no está en EFFIS, del primer foco de FIRMS en el bbox.
- [ ] **Credenciales:** crear `backend/.env` con `CDSE_CLIENT_ID` y `CDSE_CLIENT_SECRET` en formato `CLAVE=valor` (ver `backend/.env.example`).
- [ ] **Regenerar el secret de CDSE**: se mostró en una salida de terminal durante el desarrollo.
- [ ] **Decidir qué hacer con `backend/libs/detection.py`**: detecta sobre el JPG con el enfoque descartado en §3 y duplica este algoritmo.
- [ ] **Endpoint de la API** que llame a `pipeline.pipeline.analyze` (fuera del alcance de este spec).
