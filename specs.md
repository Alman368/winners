# Specs · Detección y caracterización de incendios con Sentinel-2

Reto Indra Espacio · III Malackathon 2026. Producto orientado a **análisis a posteriori**: no hay modo en tiempo real.

---

## 1. Alcance

- **Obligatorio del reto**
  - Básico: delimitar la zona afectada y su perímetro sobre una imagen original.
  - Avanzado (da acceso a la final): detectar focos activos en el momento de la toma, distinguidos de la superficie quemada sin actividad.
- **Nuestro producto**: transformar las imágenes en un **informe posterior al incendio** fácil de entender:
  - extensión,
  - evolución día a día,
  - severidad,
  - infraestructuras y valores afectados,
  - riesgos posteriores.
- **Premio Tablets**: accesibilidad y usuario en el centro.
- **Fuera de alcance**: alertas, evacuaciones en curso y cualquier dato en tiempo real.

---

## 2. Datos del reto

| Escena | True Color | SWIR | Wildfire | Tamaño | En el PDF |
|---|---|---|---|---|---|
| Niebla (Huelva) | ✅ | ✅ | ✅ | 2500×1546 | Sí |
| Madrid-Ávila | ✅ | ✅ | ❌ | 9930×6141 | Sí |
| La Mierla (Guadalajara) | ✅ | ✅ | ✅ | 2500×1546 | No (se usa como hold-out) |

Hallazgos:
- **Formato**: JPG de visualización de 8 bits, sin EXIF ni georreferencia y con artefactos de compresión.
- **SWIR** = R:B12, G:B8A, B:B4. `(G−R)/(G+R)` se comporta como el NBR. En el SWIR:
  - quemado: rojo-marrón;
  - vegetación: verde;
  - agua: negro;
  - humo: casi transparente;
  - fuego activo: naranja saturado.
- **Wildfire** (script de Pierre Markuse) = True Color con el fuego resaltado. Solo sirve para validar: falta en Madrid-Ávila y puede faltar en las imágenes ocultas.
- **Falsos positivos visibles**:
  - casco urbano de Madrid (rosado en SWIR);
  - cultivos y suelo desnudo del SE de Niebla;
  - embalses dentro de zona quemada (Ávila);
  - humo sobre la cicatriz en True Color.
- **Generalización**: la organización evaluará con imágenes desconocidas, así que no se permiten umbrales fijos ajustados a una escena.

---

## 3. Procedencia de las imágenes y Copernicus

### 3.1 Origen

- **Herramienta**: las imágenes se exportan desde el **Copernicus Browser**, colección **Sentinel-2 L2A**, con sus capas por defecto (True color, SWIR, Wildfires).
- **Nombre del archivo**: `AAAA-MM-DD-00_00_AAAA-MM-DD-23_59_Sentinel-2_L2A_<capa>.jpg`. El rango es el **intervalo de los datos elegido en el visor**, no el momento de la exportación. Con un solo día, la imagen es el mosaico de las pasadas de ese día.
- **La fecha es la de toma**. Se comprobó contra el catálogo:

  | Escena | Fecha | Pasada | Tesela |
  |---|---|---|---|
  | La Mierla | 21-07-2026 | S2C 10:56 UTC, 0,2 % nubes | T30TVL |
  | Madrid-Ávila | 26-07-2026 | S2B 10:56 + S2A 11:07 (dos pasadas) | T30TUK |
  | Niebla | 08-08-2026 | S2B 11:06 UTC, 0 % nubes | T29SPB/T29SQB |

- **La hora no está en el nombre**: se obtiene del catálogo.
- **Verificación por contenido**: el nombre se puede cambiar a mano, así que la fecha se verifica comparando la imagen con renders de ese día y de los días vecinos (DAT-1). El humo y el frente cambian de un día a otro.

### 3.2 Frecuencia de pasadas (medida en el catálogo, verano 2026)

- **Satélites operativos**: Sentinel-2A, 2B y 2C.
- **Revisita sobre la península**:
  - **cada 1-3 días** en Madrid-Ávila y La Mierla (22 pasadas en 5 semanas);
  - **cada 2-5 días** en Niebla.
  - Hay días con dos pasadas.
- **Nubes**: en verano la mayoría de pasadas tiene <5 %, pero hay días del 30-93 %. El humo no cuenta como nube en el catálogo.
- **Latencia de publicación**: 3-11 h habitualmente, con picos de ~39 h. Como el análisis es a posteriori, no condiciona el diseño.

### 3.3 Georreferenciación automática

Las imágenes llegan sin coordenadas y con el zoom que elija la organización. Se localizan comparándolas con un mosaico Sentinel-2 de referencia:

1. **Zona candidata**: se geocodifica el nombre del lugar (Nominatim) y se busca en un radio de 120 km.
2. **Pasada gruesa**: mosaico de referencia en EPSG:3857 a 4000 px de ancho; puntos SIFT, ratio test y transformación de similitud con RANSAC.
3. **Pasada fina**: se vuelve a pedir la referencia sobre el bbox encontrado (+10 % de margen) y se repite el emparejamiento.
4. **Rechazo**: con menos de 12 inliers o una rotación >1° se devuelve "no georreferenciable". Nunca se inventa un bbox.

Información que se obtiene:
- **Proyección**: las exportaciones del Copernicus Browser son **Web Mercator (EPSG:3857)**. La proporción ancho/alto en Mercator del bbox encontrado coincide exactamente con la de la imagen (1,617) en las tres escenas.
- **bbox en lat/lon**, **centro** y **m/px reales**. Con ellos se calculan hectáreas reales y se cruza con cualquier capa SIG.

| Escena | NO (lat, lon) | SE (lat, lon) | Extensión | m/px |
|---|---|---|---|---|
| Niebla | 37.5774, −6.8413 | 37.3996, −6.4791 | 31,9 × 19,7 km | 12,8 |
| La Mierla | 41.2626, −3.4202 | 40.9251, −2.6960 | 60,6 × 37,5 km | 24,2 |
| Madrid-Ávila | 40.8117, −4.9370 | 40.1301, −3.4882 | 122,8 × 75,9 km | 12,4 |

**Referencias de mosaico:**
- **EOX s2cloudless 2025** (WMS público, sin cuenta).
  - Licencia no comercial: vale para el hackathon.
  - Es un mosaico anual, no de la fecha exacta.
- **Process API de Copernicus** (con cuenta).
  - Render de la fecha exacta con el mismo script de la capa, lo que mejora el emparejamiento.
  - Permite verificar la fecha (DAT-1).

### 3.4 APIs de Copernicus Data Space y qué aportan

| API | Uso | Cuenta |
|---|---|---|
| Catálogo OData / STAC | Pasadas por fecha y zona, % de nubes, satélite, tesela, hora | No |
| Sentinel Hub **Process API** | Cualquier bbox, fecha, resolución y script. PNG/JPG o **GeoTIFF con reflectancia** | Sí |
| Sentinel Hub **Statistical API** | Estadísticas por polígono y fecha sin descargar imágenes (p. ej. NBR medio por pasada) | Sí |
| Descarga OData/S3 | Producto SAFE completo (~1 GB) | Sí (no hace falta) |

Una vez georreferenciada la imagen, se puede pedir:
1. **El mismo mosaico del día** a la resolución deseada, para validar el bbox.
2. **Bandas en reflectancia real** (B2, B3, B4, B8, B8A, B11, B12) en GeoTIFF: NBR, NBR2 y NDVI reales.
3. **Banda SCL** (clasificación de escena L2A): nubes, sombras, agua, nieve, vegetación y suelo desnudo. Elimina falsos positivos.
4. **Imagen anterior al incendio**: **dNBR**, la severidad estándar (EMS, BAER).
5. **Todas las pasadas entre el inicio y la extinción**: evolución diaria del incendio.
6. **Hectáreas reales y coordenadas de cada píxel**: cruce con carreteras, edificios, Natura 2000, etc.

**Cuota**:
- Se renueva el día 1 de cada mes y no se acumula. La cifra de unos 10.000 PU/mes para Sentinel Hub se debe comprobar en el dashboard.
- 1 imagen de 2500×1546 con 3 bandas cuesta unos 15 PU.
- Al superar la cuota, la API responde 403.

### 3.5 Qué devuelve Copernicus

**JPG del Copernicus Browser** (lo que nos da la organización):
- Contiene solo los píxeles y la fecha en el nombre.
- Coordenadas, centro y m/px hay que **calcularlos** con la georreferenciación (3.3).

**Process API** (con nuestra cuenta). Pedimos un bbox, una fecha y un script, y elegimos el formato:

| Formato | Contenido | Uso |
|---|---|---|
| **GeoTIFF** (`image/tiff`) | Píxeles + **georreferencia incrustada**: CRS, origen y tamaño de píxel. Admite varias bandas y valores UINT8/UINT16/FLOAT32 | Análisis: cada píxel tiene coordenadas exactas |
| PNG / JPEG | Solo píxeles; el bbox es el que pedimos | Visualización, referencia para emparejar |
| JSON (`userdata`) | Metadatos que devuelve el script: **fecha y hora de cada pasada usada**, teselas | Saber de qué pasada sale cada píxel |
| TAR (varias salidas a la vez) | GeoTIFF + PNG + JSON en una sola petición | Una petición y una sola vez de cuota por escena |

Información que obtenemos de un GeoTIFF y de los metadatos:
- **Coordenadas de cada píxel**: origen + tamaño de píxel en el CRS pedido. Además, el **bbox**, el **centro** y las **esquinas**.
- **m/px exactos**: los elegimos nosotros con `resx`/`resy`.
  - Pidiendo en **UTM (EPSG:32629/32630/32631)** los m/px son metros reales sobre el terreno, y las **hectáreas se calculan sin corrección**.
  - En Web Mercator hay que multiplicar por cos(lat), como hacemos ahora.
- **Bandas L2A en reflectancia**:
  - B01–B12 y B8A;
  - **SCL** (clases de escena: nube, sombra, agua, vegetación, suelo, nieve);
  - **CLM/CLP** (máscara y probabilidad de nube);
  - **dataMask** (dónde no hay dato);
  - AOT y WVP (aerosoles y vapor de agua);
  - ángulos del sol y de visión.
- **Fecha y hora exactas de la toma**: en los metadatos `userdata`. Con dos pasadas el mismo día, sabemos cuál se usó.

**Catálogo (STAC/OData, sin cuenta)**, por cada pasada:
- fecha y hora;
- satélite (2A/2B/2C);
- tesela y órbita;
- **% de nubes**;
- huella geométrica (qué zona cubre).

**Statistical API**: JSON con estadísticas por polígono e intervalo (media, desviación, percentiles, histograma), sin descargar imágenes. Sirve para la serie temporal del NBR medio de la zona quemada.

**Límites de la Process API**:
- Máximo **2500 × 2500 px por petición**: las zonas grandes se piden por teselas.
- **Coste en PU**: proporcional a los píxeles × bandas / 3, y ×2 si los valores son FLOAT32.

### 3.6 Credenciales

Cliente OAuth de Copernicus Data Space (client credentials), leído del `.env` de la raíz (ignorado por git):

```
COPERNICUS_CLIENT_ID=...
COPERNICUS_CLIENT_SECRET=...
```

Los tests nunca llaman a servicios reales: reproducen respuestas grabadas (`RECORD_HTTP=1` para regrabarlas).

---

## 4. Arquitectura

- **Backend**: Python con tipos y FastAPI (sin `jsonify`).
  - El pipeline de detección y georreferenciación es una librería pura (`numpy`, `opencv`).
  - La API solo lo envuelve.
- **Frontend**: React + TS.
  - Componentes que solo reciben props; la lógica va en hooks.
  - Llamadas a la API por `client.ts`.
  - i18n solo en español.
  - Skeletons mientras carga y modales que se cierran con Escape.
- **Mapa**: MapLibre GL JS.

---

## 5. Specs obligatorias del reto

| ID | Spec | Criterio de aceptación |
|---|---|---|
| OB-1 | Entrada: True Color + SWIR obligatorios, del mismo tamaño; Wildfire no se exige | Tamaños distintos → 422; acepta 60 MP |
| OB-2 | Máscara de zona afectada: pseudo-NBR (o NBR real si hay bandas) + oscuridad en TC, umbral adaptativo por escena, limpieza morfológica, exclusión de agua/urbano/suelo/nubes | IoU ≥ 0,80 en Niebla y Ávila; ≥ 0,70 en La Mierla; 0 px en el casco de Madrid y en embalses |
| OB-3 | Perímetro vectorial (polígonos con agujeros, multipolígono), simplificado | Rasterizado ≈ máscara (IoU ≥ 0,98); polígonos válidos |
| OB-4 | Focos activos: B12 casi saturado, R ≫ G, brillo alto; agrupados en focos con centroide, bbox y área | Recall ≥ 0,80 y precisión ≥ 0,70 por foco frente al Wildfire; 0 focos en urbano o suelo claro |
| OB-5 | Overlay sobre la imagen original: perímetro, relleno, focos, leyenda; exportable a PNG | Distinguible sin depender del color |
| OB-6 | Automatización de principio a fin sin cambiar parámetros entre escenas | Determinista; las 3 escenas con el mismo pipeline |
| OB-7 | Justificación técnica visible: umbrales calculados por escena y método | Incluida en la respuesta del análisis |

Las métricas son objetivos iniciales: se fijan tras la primera medición base y no se bajan después.

---

## 6. Georreferenciación y Copernicus

| ID | Spec | Test (outcome) | Estado |
|---|---|---|---|
| GEO-1 | Conversión lon/lat ↔ EPSG:3857 | Valores de referencia conocidos | ✅ |
| GEO-2 | Emparejar una imagen con una referencia y devolver su bbox | Un recorte con zoom de una textura sintética devuelve su bbox con error < 2 px | ✅ |
| GEO-3 | Rechazo si no es fiable | Imagen de otra zona → `GeoreferenceError` | ✅ |
| GEO-4 | Mosaico de referencia por teselas WMS | Teselas cosidas sin saltos, también en los bordes irregulares | ✅ |
| GEO-5 | Localizar una escena desde el nombre del lugar (gruesa + fina) | Niebla, La Mierla y Madrid-Ávila: centro a < 500 m y m/px ±3 % | ✅ |
| GEO-6 | Endpoint `POST /georeference` (imagen + lugar) → `date`, `bbox` (oeste, sur, este, norte), `image_size` (ancho, alto), centro, m/px, inliers | Contrato de la API; archivo no imagen → 422 `invalid_image`; lugar no encontrado → 422 `place_not_found`; no localizable → 422 `georeference_failed` | ✅ |
| GEO-7 | Robustez a recorte y zoom | Recortes del 30-100 % y escalas de 0,5-2× recuperan el bbox | Pendiente |
| CDS-1 | OAuth client credentials desde `.env` | Las credenciales se canjean por un `access_token` | ✅ |
| CDS-2 | Render Process API: bbox + fecha + script (TC, SWIR, Wildfires) | Respuesta grabada → imagen del tamaño pedido | Pendiente |
| CDS-3 | Bandas en reflectancia + SCL + dataMask en GeoTIFF UTM | Reflectancia en [0,1], SCL, máscara y transform UTM leídos del GeoTIFF | ✅ |
| CDS-4 | Pasadas disponibles por bbox y rango de fechas (catálogo) | En orden cronológico, con satélite, tesela, % de nubes y EPSG | ✅ |
| DAT-1 | Fecha leída del nombre (✅; exportaciones de varios días → 422 `multi_day_export`) y verificada por contenido (pendiente) | La fecha correcta encaja mejor que la del día anterior y la del siguiente | Parcial |
| CLS-1 | Máscara SCL aplicada a la detección | Píxeles de agua o nube en SCL nunca son quemado ni foco | Pendiente |
| SEV-1 | Severidad dNBR con clases USGS y ha por clase | Par sintético antes/después → clases esperadas | Pendiente |
| SEV-2 | Elección automática de la imagen anterior al incendio | La más reciente con pocas nubes sobre el bbox | Pendiente |

### ⚠️ Aviso para quien consume `POST /georeference` (área, hectáreas, perímetro)

Respuesta (ejemplo Niebla):

```json
{
  "date": "2026-08-08",
  "bbox": [-6.84116, 37.39951, -6.47896, 37.57728],
  "image_size": [2500, 1546],
  "centre_lon": -6.66006,
  "centre_lat": 37.48845,
  "metres_per_px": 12.8,
  "inliers": 231
}
```

- **`bbox`**:
  - Orden `(oeste, sur, este, norte)` = `(min_lon, min_lat, max_lon, max_lat)`, en grados EPSG:4326.
  - Cubre la imagen **de borde a borde**: es la transformación de las esquinas (0,0) y (ancho, alto).
- **La imagen está en Web Mercator (EPSG:3857), no en lon/lat.**
  - Las columnas son lineales en longitud.
  - Las filas **no** son lineales en latitud.
  - Para pasar de píxel a coordenadas:
    1. Convertir el bbox a EPSG:3857.
    2. Interpolar linealmente en metros Mercator.
    3. Volver a lon/lat.
  - Si se interpola la latitud linealmente:

    | Escena | Error máximo |
    |---|---|
    | Niebla | 0,5 px |
    | Madrid-Ávila | **7,8 px** |

- **`metres_per_px` es el valor en el centro de la imagen.**
  - En Mercator el tamaño real del píxel cambia con la latitud: un 0,24 % de norte a sur en Niebla y un **1 %** en Madrid-Ávila.
  - Multiplicar píxeles por `metres_per_px²` da un error de ese orden en las hectáreas.
- **Para hectáreas exactas, usar el GeoTIFF de Copernicus en UTM** (`app/copernicus/process.py`, `fetch_bands` con el `bbox` de la respuesta):
  - cada píxel mide exactamente `resolution_m × resolution_m` (a 20 m, **0,04 ha por píxel**);
  - el `transform` da las coordenadas UTM de cada píxel.
- **`date`**: fecha de toma (`YYYY-MM-DD`) leída del nombre del archivo. Una exportación de varios días se rechaza con 422 `multi_day_export`.
- **`image_size`**: `(ancho, alto)` de la imagen original. Sirve para dibujar el perímetro en píxeles encima de la foto.
- **El incendio puede salirse del bbox de la foto.** En Niebla, el 13-08 ya excedía el encuadre del 08-08. Para la evolución diaria hay que analizar una zona mayor que la foto.

---

## 7. Incendio y evolución diaria

Cada incendio tiene **una pestaña** con todo su historial.

**Modelo de datos:**
- **Incendio**: nombre, bbox, municipios, fecha de inicio, fecha de extinción y fuente oficial.
- **Observaciones (N)**: fecha y hora, satélite, tesela, % de nubes sobre el bbox, capas y si se usa o se descarta (con el motivo).
- **Análisis diario**: perímetro, zona quemada, focos, severidad, afecciones y calidad del dato.
- **Cambios entre días**: ha nuevas, sectores de avance, focos nuevos o apagados, nuevas afecciones.
- **Informe final**: consolidado con dNBR, daños y riesgos posteriores.

**Calidad del dato por día:**
- **Imagen de alta resolución**: día con pasada útil de Sentinel-2.
- **Estimación**: día sin pasada útil. Hereda el perímetro anterior y añade los focos térmicos históricos (archivo de NASA FIRMS, VIIRS 375 m) para reconstruir el avance.
- **Descartada**: nubes o humo sobre el bbox. Se indica el motivo; nunca se inventa el dato.

| ID | Spec | Test (outcome) |
|---|---|---|
| INC-1 | Crear un incendio con bbox y fecha de inicio (a mano o desde una imagen georreferenciada) | Incendio sin observaciones |
| INC-2 | Poblar las observaciones desde el catálogo entre el inicio y la extinción | Respuesta grabada → observaciones esperadas |
| INC-3 | Descartar por nubes o humo sobre el bbox, no sobre la tesela | Bbox cubierto al 70 % → descartada con el motivo |
| INC-4 | Análisis diario con su etiqueta de calidad | Día sin pasada → "estimación" que hereda el último perímetro |
| INC-5 | Cambios entre días | Dos perímetros sintéticos → ha nuevas exactas y sector correcto |
| INC-6 | Focos FIRMS históricos asignados al día correcto | Respuesta grabada; UTC frente a hora local |
| INC-7 | Informe final consolidado | dNBR entre la imagen anterior y la última |

---

## 8. Impacto y valores afectados

Las referencias son Copernicus EMS (delimitación y grading), EFFIS (cruce con CORINE y Natura 2000) y BAER (valores en riesgo, severidad y erosión).

| Bloque | Contenido | Fuente |
|---|---|---|
| Ficha | Fechas, municipios, superficie, perímetro | Análisis + IGN (límites) |
| Severidad | Clases dNBR y ha por clase | Copernicus |
| Usos del suelo | ha de arbolado, matorral, agrícola, urbano | CORINE, SIOSE, Mapa Forestal |
| Espacios protegidos | ha en Natura 2000 y ENP | MITECO, EEA |
| Carreteras | km afectados por tipo; tramos dentro o en el borde del perímetro | IGN (BTN, CartoCiudad), OSM |
| Cortes de carreteras | Estado: **afectada** (calculado) / **corte confirmado** (DGT) | DGT NAP DATEX II v3.6 (sin Cataluña, País Vasco ni diputaciones: "sin dato de corte") |
| Edificios | Recuento dentro y en la franja del perímetro | Catastro INSPIRE, OSM |
| Población | Habitantes dentro y cerca del perímetro | INE (rejilla), GHSL |
| Infraestructura crítica | Líneas eléctricas, ferrocarril, captaciones, depuradoras, hospitales, colegios | OSM, REE |
| Riesgos posteriores | Erosión (severidad × pendiente), ceniza hacia embalses y cauces aguas abajo | IGN MDT, hidrografía IGN/Confederaciones |
| Contexto | Viento y temperatura durante el incendio | AEMET OpenData, ERA5 |
| Validación | Perímetro oficial | EFFIS, Copernicus EMS |

| ID | Spec | Test (outcome) |
|---|---|---|
| INF-1 | Carreteras afectadas: km por tipo y estado | Perímetro y red sintéticos → km exactos |
| INF-2 | Edificios y población dentro y en la franja | Geometrías sintéticas → recuentos exactos |
| INF-3 | Infraestructura crítica afectada | Elementos sintéticos dentro y fuera → solo los de dentro |
| AMB-1 | ha por uso del suelo y en Natura 2000 | Polígonos sintéticos → ha exactas |
| RIE-1 | Riesgo de erosión y avisos aguas abajo | Severidad alta + pendiente alta + embalse aguas abajo → aviso |
| VAR-1 | Valores afectados por categoría y prioridad (vidas, vulnerables, vías, infraestructura, economía, medio ambiente, patrimonio) | Agregados por municipio coherentes con INF/AMB |

Las fuentes externas se testean con respuestas grabadas, y los cruces geométricos con geometrías sintéticas de resultado exacto.

---

## 9. Presentación de la información

**Usuarios:**
- **Ciudadano**: ¿afectó a mi municipio o a mis carreteras?
- **Ayuntamiento y Protección Civil**: daños, vías e infraestructuras.
- **Técnico forestal**: severidad, erosión y restauración.
- **Periodista**: cifras fiables y fechadas.
- **Administración y aseguradoras**: daños por municipio.

**Tres niveles de detalle:**
1. **Resumen** (se entiende en 10 segundos):
   - superficie,
   - municipios,
   - días de duración,
   - valores afectados en una frase,
   - buscador "¿Me afectó?" por dirección o municipio.
2. **Mapa interactivo**:
   - capas activables (focos, perímetro, severidad, carreteras, edificios, usos del suelo, protegidos);
   - línea de tiempo por día con su calidad de dato;
   - comparador del día N con el N−1;
   - reproducción de la evolución;
   - vista en tabla equivalente.
3. **Detalle técnico e informe**: método, confianza, cifras exactas; exportación a PDF y GeoJSON por municipio.

**Reglas de comunicación:**
- Frases antes que métricas, cifras redondeadas en el resumen y exactas en el detalle.
- Cada dato lleva su **fecha y fuente**.
- La incertidumbre se explica.
- **Accesibilidad**:
  - el nivel se transmite con texto + icono + patrón + color, nunca solo con color;
  - contraste AA y navegación completa por teclado;
  - resumen textual para lector de pantalla;
  - textos en i18n (español).

| ID | Spec | Test (outcome) |
|---|---|---|
| MAP-1 | Mapa con capas, línea de tiempo y comparador | Al elegir un día se sincronizan el mapa y el informe, también con teclado |
| MAP-2 | Vista tabla equivalente al mapa | Mismos elementos; axe sin violaciones |
| REP-1 | Informe PDF/GeoJSON por día y final | GeoJSON válido; cifras iguales a las del análisis |
| UX-1 | Buscador "¿Me afectó?" | Dirección dentro del perímetro → respuesta con la fecha y la fuente |

---

## 10. Mejoras

**Zona afectada**
- Fusión de señales en un score continuo en lugar de una sola regla.
- Superpíxeles (SLIC) para reducir el ruido JPG.
- Random Forest / LightGBM con validación *leave-one-scene-out*.
- Niveles de severidad.

**Fuego activo**
- Detección contextual (estilo MODIS/VIIRS): el píxel destaca frente a su vecindario, no frente a un umbral global.
- Prior espacial: los focos aparecen en el borde de la zona quemada.
- Frente activo como polilínea.

**Georreferenciación**
- Referencia de la fecha exacta con la Process API.
- Zonas candidatas sin nombre del lugar (archivo FIRMS de esa fecha o barrido de la península).
- Puntos de control manuales como respaldo explícito.

**Común**
- Harness de evaluación (IoU, precisión, recall por escena y matriz de falsos positivos por tipo).
- Análisis de sensibilidad de los parámetros.
- Procesado en pirámide para las escenas de 60 MP.

**Más datos**
- Más incendios de 2026 desde el Copernicus Browser o la Process API: antes, durante y después; también escenas sin fuego como negativos.
- Ground truth desde EFFIS y EMS.
- Datasets públicos (CaBuAr, Sen2Fire, S2-WCD) renderizados con los mismos scripts.

---

## 11. Estrategia TDD

- **Ciclo**: test rojo → código mínimo → verde → refactor. Se testean resultados, no implementación, y solo el comportamiento crítico o complejo.
- **Niveles**:
  - **Sintéticos (ms)**: texturas y geometrías generadas con resultado conocido.
  - **Escenas reales (`-m scenes`)**: regresión contra ground truth y valores verificados.
  - **Hold-out**: La Mierla y las escenas nuevas reservadas nunca se usan para ajustar.
  - **Contrato de API**: con `TestClient` y respuestas grabadas.
  - **Frontend**: hooks y axe.
- **Ground truth**:
  - máscaras anotadas a mano o rasterizadas desde EFFIS/EMS;
  - focos sacados de la capa Wildfire y revisados a mano;
  - polígonos negativos (urbano, embalses, cultivos, humo).
- **Servicios externos**: nunca se llaman en los tests; se reproducen respuestas grabadas.

---

## 12. Decisiones pendientes

1. Catastro + OSM o solo OSM para edificios.
2. Fuente del viento: AEMET OpenData (requiere clave) o ERA5.
3. Bandas de distancia para la franja de afección: fijas o configurables.
4. Qué ve el ciudadano: resumen + "¿Me afectó?" o también el mapa completo.
