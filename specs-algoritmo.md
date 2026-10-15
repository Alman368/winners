# Specs — Algoritmo de detección y caracterización de incendios con Sentinel-2 (Reto Indra, III Malackathon 2026)

Este documento especifica **solo el algoritmo**: desde que recibimos la escena localizada hasta que entregamos el perímetro, los focos y las estadísticas. Léelo entero antes de escribir código y cumple siempre las reglas de `AGENTS.md` (están por encima de cualquier cosa de este documento).

---

## 1. Contexto y alcance

- Enunciado: `Deteccion Incendios/Reto Malackathon _Detección incendios_Indra_2026.pdf`.
- **Básico:** delimitar la zona afectada por el incendio y estimar su perímetro.
- **Avanzado:** detectar zonas de fuego activo en el momento de la captura, diferenciadas de la superficie quemada sin actividad.
- El jurado probará con **imágenes nuevas**. Nada puede estar ajustado a una escena concreta.
- Criterios que afectan al algoritmo, por prioridad: calidad de detección del área y de los focos; baja tasa de falsos positivos y robustez; justificación técnica de cada decisión (cada umbral con su razón física o su referencia bibliográfica, en un docstring corto).

**Alcance de este spec:**
- **Entra:** descarga de datos de Copernicus para la escena, detección de área quemada, fuego activo y humo, vectorización, estadísticas y el JSON de salida.
- **No entra:** localizar la imagen de entrada (lo hace otro módulo y nos da el bbox y la fecha), API, frontend, render de la imagen y textos para el usuario.

---

## 2. Entrada

El módulo de localización nos entrega, por escena:

| Campo | Tipo | Descripción |
|---|---|---|
| `bbox` | `tuple[float, float, float, float]` | `(min_lon, min_lat, max_lon, max_lat)` en EPSG:4326, cubre exactamente la imagen original |
| `acquisition_date` | `date` | Fecha de captura `YYYY-MM-DD` (sale del nombre del archivo) |
| `image_size` | `tuple[int, int]` | `(width, height)` en px de la imagen original, para devolver también coordenadas de imagen |
| `fire_start` | `date` | Fecha de inicio del incendio `YYYY-MM-DD`. Sale de EFFIS (`fire_date`); si el incendio no está en EFFIS, del primer foco de NASA FIRMS dentro del bbox. Define la ventana de la imagen anterior (§4.3) |

Además tenemos acceso a **Copernicus Data Space Ecosystem (CDSE)** con credenciales OAuth (variables de entorno `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` en `backend/.env`), y desde ahí descargamos las bandas originales.

La rejilla de la imagen original es lineal en lon/lat (EPSG:4326), así que `lon/lat → píxel de imagen` es una interpolación lineal sobre el bbox. Comprobado en Madrid-Ávila con 316 puntos SIFT contra una referencia en EPSG:4326: con latitud lineal el error en filas es de 0.6 px de mediana y sin curvatura; con Web Mercator, 6.0 px con una curvatura en U. `main` usa ahora Web Mercator (`grid.lonlat_to_image_pixel`), pendiente de corregir junto con el módulo de georreferenciación.

### Datos de las escenas de ejemplo

| Escena | Fecha | `fire_start` (EFFIS) | bbox | m/px del JPG |
|---|---|---|---|---|
| Niebla (Huelva) | 2026-08-08 | 2026-08-07 (id 606000) | `(-6.84125, 37.39963, -6.47903, 37.57739)` | 12.8 |
| La Mierla (Guadalajara) | 2026-07-21 | 2026-07-16 (id 561620) | `(-3.42055, 40.92521, -2.69614, 41.26286)` | 24.3 |
| Madrid-Ávila | 2026-07-26 | 2026-07-22 (Navaluenga, id 562592; también Navas del Rey, id 592438, 07-23) | `(-4.93714, 40.13001, -3.48827, 40.81176)` | 12.4 |

Los bbox se obtuvieron emparejando cada JPG con la imagen de Copernicus del mismo día (SIFT + RANSAC, error mediano < 0.3 px). Sirven para desarrollar y validar mientras se integra el módulo de localización.

---

## 3. Por qué trabajamos con las bandas originales y no con los JPG

Se exploró primero un pipeline sobre los JPG. Estos son los problemas medidos que lo descartan como base, útiles para justificarlo en la presentación:

1. **Sin reflectancias.** En el JPG SWIR (`R = B12, G = B8A, B = B4`) solo es fiable el signo del pseudo-NBR `(G − R)/(G + R)`, no su magnitud, porque depende del estirado de color. No se pueden usar umbrales publicados.
2. **El humo invierte el signo.** Medido en Madrid-Ávila: lo quemado sin humo da pNBR −0.33 y bajo humo +0.18.
3. **Saturación y compresión.** R satura a 255 en el fuego, la compresión JPEG usa submuestreo de croma 4:2:0, y al reducir la imagen se pierde ~30 % de los píxeles de fuego (Madrid).
4. **Falsos positivos de suelo desnudo, campos cosechados y ciudad** con pNBR < 0. Solo se separaban con un umbral de oscuridad frágil (110), que ya dejaba fuera más del 10 % de lo quemado en Niebla.
5. **Escala variable:** los m/px dependen del zoom de exportación.

Con las bandas originales y una imagen anterior al incendio, todo esto desaparece o tiene una solución estándar (§5).

### 3.1 Resultados del prototipo en las tres escenas

Prototipo con lo descrito en §4–§7 (composición previa de §4.3, semillas + histéresis, limpieza, regla de fuego de §6.1, persistencia, contexto a 500 m), con los focos agrupados a 20 m. Validación contra el **perímetro final oficial de EFFIS**: como un incendio solo crece, lo que detectamos fuera de él es casi seguro un falso positivo.

| Escena | Área quemada | Dentro del perímetro EFFIS | Fuera | Perímetro | Polígonos | Focos activos | Frente activo |
|---|---|---|---|---|---|---|---|
| Niebla | 5036 ha | **94.2 %** | 290 ha | 108 km | 21 | 43 | 12.2 km |
| La Mierla | 28 850 ha | **97.9 %** | 607 ha | 372 km | 66 | 96 | 13.4 km |
| Madrid-Ávila | 47 660 ha | **97.1 %** | 1363 ha | 1190 km | 195 | 230 | 34.0 km |

- **La Mierla** coincide casi exactamente con el perímetro de EFFIS. Detectamos el 85 % de su superficie final (28 230 de 33 022 ha), aunque EFFIS puede incluir crecimiento posterior a la captura.
- **Madrid-Ávila:** detecta bien la zona quemada **bajo el humo del suroeste**, que coincide con EFFIS. Los 120 puntos calientes de la ciudad de Madrid (tejados, industria) se descartan con la regla de contexto (§6.2).
- **Fuego activo frente a la composición Wildfires** (±1 px a 20 m, cerca de la cicatriz): recall 0.96 (Niebla) y 1.00 (La Mierla); precisión 0.63 y 0.25. Detectamos más píxeles calientes que Wildfires porque nuestra regla es menos estricta (`B12 ≥ 0.5` frente a `B11 + B12 > 1`). Falta decidir con FIRMS cuál de las dos acierta.
- **Tiempo:** descarga 40–95 s por escena (Niebla y La Mierla); el algoritmo, 1–52 s (Madrid, 6135×3782 px).

**Código de `backend/pipeline/`** (agrupación de focos a 100 m, área medida sobre los polígonos simplificados):

| Escena | Área quemada | Perímetro | Polígonos | Focos activos | Frente activo | Tiempo (sin caché) |
|---|---|---|---|---|---|---|
| Niebla | 5154 ha | 116 km | 14 | 31 | 12.8 km | 30 s |
| La Mierla | 29 584 ha | 383 km | 40 | 76 | 14.8 km | 82 s |
| Madrid-Ávila | 49 305 ha | 1230 km | 127 | 180 | 39.6 km | 407 s |

La severidad coincide con el prototipo. El área sale un 2–3 % mayor porque se mide sobre los polígonos simplificados y no contando píxeles.

**Problemas que quedan:**
1. **Focos todavía fragmentados:** agrupar a 100 m baja de 230 a 180 focos en Madrid, pero siguen saliendo muchos focos pequeños (§6.2).
2. **Perímetro inflado en escenas grandes:** 1190 km en Madrid por 195 polígonos con bordes muy irregulares. Resuelto en §7.5.
3. **3–6 % fuera de EFFIS** en Niebla y Madrid: falta revisar si son bordes, cosechas o errores de EFFIS.

### 3.2 Primeras medidas en Niebla con fechas sueltas

Prueba con la rejilla de §4.1 (1600×986 px a 20 m) e imágenes anteriores del 08-05, 07-24 y 06-29:

| Medida | Resultado |
|---|---|
| dNBR fuera del incendio (percentil 95) | 0.13 con la imagen del 08-05, 0.15 con la del 07-24, 0.21 con la del 06-29 |
| NBR antes del incendio dentro de la cicatriz | 0.20 (08-05), 0.19 (07-24): el 08-05 todavía no había ardido (EFFIS da inicio el 08-07) |
| Área con semillas `dNBR > 0.27` | 2739 ha |
| Área con semillas + histéresis `dNBR > 0.1` + limpieza (≥ 5 ha) | 5079 ha (una componente de 5023 ha y 5 pequeñas) |
| Perímetro exterior | 118 km sin simplificar, 108 km con Douglas-Peucker a 20 m |
| Agujeros | 709, casi todos diminutos |
| Severidad (ha) | baja 2346, moderada-baja 2105, moderada-alta 484, alta 144 |
| SCL | 94 % vegetación, 1.2 % nube media; **el humo casi no sale como nube** |

Conclusiones:
- El mapa de dNBR delimita la cicatriz con mucha nitidez y es casi 0 fuera. El frente activo queda dentro de la máscara sin pasos extra (§5.3, paso 4).
- **Cuanto más antigua es la imagen anterior, más ruido** (la vegetación se seca en verano y sube el dNBR fuera del incendio). Hay que usar la más reciente que sea válida (§4.3).
- La histéresis **crece hacia la zona con humo del norte y el noreste** en forma de dedos finos. Puede ser quemado real bajo el humo o no; hay que comprobarlo contra la anotación manual (§5.4).
- Los fuegos activos, en §6.1.

**Lecciones de esa exploración que siguen valiendo:**
- **Otsu global sobre un índice de quemado no sirve:** el histograma es unimodal porque lo quemado es una fracción pequeña de la escena. Marcaba el 56–70 % de la imagen.
- **Un cierre morfológico global grande rellena bahías de vegetación sana** e infla el área. Los cierres deben ser pequeños o locales.
- **Los focos activos necesitan contexto espacial:** en Madrid solo el 24 % de los píxeles "calientes" estaban cerca de la cicatriz; el resto eran la ciudad.
- **Entre la cicatriz y el frente puede haber terreno quemado bajo humo:** cualquier restricción por distancia debe ser generosa (varios cientos de metros).
- **Los umbrales se validan en todas las escenas**, nunca mirando una sola.

---

## 4. Datos que descargamos de CDSE

### 4.1 Colección, bandas y rejilla

- Colección: **Sentinel-2 L2A** (reflectancia de superficie, corregida atmosféricamente).
- API: **Process API** de Sentinel Hub en CDSE (`https://sh.dataspace.copernicus.eu/api/v1/process`), salida GeoTIFF `UINT16`. No hace falta el catálogo: la composición previa (§4.3) elige las fechas dentro del evalscript.
- Bandas: `B8A` (NIR estrecho 20 m) y `B12` (SWIR 2.2 µm) para el NBR y el fuego activo; `B04` (rojo) y `B11` (SWIR 1.6 µm) para el humo (§5.4); `SCL` (clasificación de escena) y `dataMask`. No se descarga `B08` (NIR 10 m): el NBR usa `B8A`, de la misma resolución que `B12`.
- **Rejilla de trabajo:** el mismo bbox en EPSG:4326, con `width`/`height` calculados para **20 m/px** (resolución nativa de B8A, B11 y B12). Así la rejilla es la misma para todas las fechas y se convierte linealmente a píxeles de la imagen original. `upsampling` y `downsampling: NEAREST` para no mezclar la SCL.
- **Descarga robusta** (con teselas grandes y `FLOAT32` el servidor devolvía errores 502 y respuestas cortadas):
  - Teselas de **1000×1000 px como máximo**, 4 en paralelo.
  - Salida **`UINT16`** con la reflectancia × 10 000 (la mitad de datos que `FLOAT32`), y se divide al leer.
  - Reintentos con espera creciente por tesela; si una tesela falla tras los reintentos, error claro.
  - Caché en disco por escena, fechas y resolución, para no descargar dos veces.

### 4.2 Imagen posterior (la de la escena)

La adquisición de `acquisition_date` sobre el bbox. Es la misma captura que el JPG de entrada.

### 4.3 Imagen anterior al incendio

Necesaria para el dNBR (§5.1). **Composición píxel a píxel:** para cada píxel, la observación **más reciente sin nubes** en los **30 días anteriores a `fire_start`**. Se hace en una sola petición con un evalscript multitemporal (`mosaicking: "ORBIT"`, escenas ordenadas de más reciente a más antigua; se devuelve la primera muestra con `dataMask = 1` y SCL fuera de las clases 0, 1, 3, 8, 9, 10). El evalscript devuelve además una banda con la **antigüedad en días** de la observación usada.

**Por qué así:**
- **Termina antes del incendio** (`fire_start − 1`), así que la imagen no puede mostrar el incendio. Una imagen de mitad del incendio solo mostraría lo quemado entre las dos fechas.
- **Lo más reciente posible:** con imágenes más antiguas aumenta el ruido estacional (§3.2).
- **Escenas grandes y nubes:** una sola pasada del satélite no cubre toda la escena de Madrid (falta el 37 %), y una fecha con nubes parciales no se descarta entera.
- **Descartado:** elegir una fecha entera comprobando si "ya estaba quemado" con el NBR de la imagen posterior. El NBR < 0 de verano incluye suelo seco y campos de toda la escena, y rechazaba todas las fechas.

Resultado en las tres escenas: cobertura del 100 %, antigüedad mediana de 1–3 días y percentil 90 de 2–6 días.

Si algún píxel no tiene observación válida en la ventana, se excluye como "no evaluable" (§5.2). Registrar en la salida la ventana usada y la cobertura.

---

## 5. Área quemada (reto básico)

### 5.1 Índices

- `NBR = (B8A − B12) / (B8A + B12)`: el índice estándar de área quemada. La vegetación sana refleja mucho en el NIR y poco en el SWIR; al quemarse cae el NIR y sube el SWIR.
- `dNBR = NBR_pre − NBR_post`: cambio entre antes y después. Lo que no ha cambiado (suelo desnudo, ciudades, cultivos ya secos) queda cerca de 0, y eso elimina los falsos positivos principales del enfoque con JPG.
- `NBR2 = (B11 − B12) / (B11 + B12)` y `dNBR2`: usan solo bandas SWIR, que atraviesan el humo mucho mejor que el NIR. Candidato para la zona bajo humo (§5.4).

### 5.2 Máscaras de exclusión (SCL)

Se excluyen, en la imagen anterior **o** en la posterior: sin datos (0), saturado/defectuoso (1), sombra de nube (3), agua (6), nubes de probabilidad media y alta (8, 9) y cirros (10). La sombra topográfica (2) no se excluye, pero hay que vigilarla en la validación. Los píxeles excluidos no cuentan como quemados ni como no quemados; se suman a la zona "no evaluable" de la salida.

Ojo: la SCL puede clasificar el humo denso como nube. Se trata en §5.4.

### 5.3 Detección

1. **Semillas:** `dNBR > 0.27` (umbral de severidad moderada-baja de Key & Benson, 2006; ver §5.5). Son píxeles quemados con alta seguridad.
2. **Crecimiento por histéresis:** añadir los píxeles conectados a una semilla con `dNBR > 0.1` (límite inferior de "quemado, severidad baja" de la misma tabla). Esto recoge los bordes del incendio sin aceptar píxeles débiles aislados. En la exploración con JPG la histéresis crecía hacia vegetación sana, pero allí el índice estaba sesgado por el humo y el estirado; con dNBR sobre reflectancias hay que volver a medirla.
3. **Limpieza:** apertura de radio 1 px (20 m), **cierre de 40 m** (une manchas separadas por 1–2 px; añade un 3–4 % de área) y descarte de componentes de menos de una **superficie mínima en hectáreas** (`config.py`, valor inicial 5 ha, a ajustar con la validación). Sin cierres más grandes: rellenan bahías de vegetación sana (§3). Rellenar los **agujeros de menos de una superficie mínima** (`config.py`, valor inicial 1 ha): en Niebla salen 709 agujeros, casi todos de unos pocos píxeles, que no son islas reales.
4. **Frente activo:** los píxeles de fuego activo tienen B12 muy alto, así que su NBR es muy negativo y su dNBR alto. Ya quedan dentro de la máscara sin ningún paso extra. Comprobarlo en la validación.
5. **Cambios que no son incendio:** una cosecha o un desbroce entre las dos fechas también sube el dNBR. Se controla con el tamaño mínimo y con la forma (las parcelas son rectangulares y aisladas). Si aparecen en la validación, medir un filtro de forma, pero no añadirlo antes.

### 5.4 Humo

Implementado en `pipeline/smoke.py`.

1. **Detección del humo:** píxeles no quemados cuya reflectancia en el rojo (`B04`) sube más de **0.05** respecto a la composición previa. El humo dispersa mucho la luz visible y es casi transparente a 2.2 µm. Lejos del incendio, `B04` sube 0.002–0.015 de mediana. Se limpia con apertura y cierre de 40 m y se quedan solo las manchas que llegan a **menos de 1 km** de la zona quemada (la bruma o las cosechas del resto de la escena no son humo).
2. **El humo denso sale como nube en la SCL:** en el humo se evalúan también los píxeles que la SCL del día del incendio marca como nube (clases 8, 9, 10), siempre que la composición previa esté despejada. Sin esto, en Madrid-Ávila solo se recuperaban 596 ha bajo humo en vez de 3099.
3. **Quemado bajo el humo con dNBR2:** `dNBR2 = NBR2_pre − NBR2_post`, con `NBR2 = (B11 − B12) / (B11 + B12)`, usa solo bandas SWIR, que atraviesan el humo. Contra los perímetros de EFFIS, bajo el humo separa quemado de no quemado mucho mejor que el dNBR:

   | Escena | AUC dNBR | AUC dNBR2 |
   |---|---|---|
   | La Mierla | 0.77 | **0.93** |
   | Madrid-Ávila | 0.80 | **0.93** |

   (Niebla no sirve para esta prueba: el perímetro final de EFFIS incluye lo que ardió días después bajo el humo.) Se añaden a la zona quemada los píxeles de humo con **dNBR2 > 0.10** conectados a la zona quemada visible:

   | Escena | Añadido bajo humo | Dentro de EFFIS |
   |---|---|---|
   | Niebla | 77 ha | 99 % |
   | La Mierla | 603 ha | 92 % |
   | Madrid-Ávila | 3099 ha | 97 % |

4. **Salida:** `burned_area.under_smoke_ha` (parte del área encontrada bajo humo) y `smoke` (superficie y polígonos de los penachos). Los píxeles de humo ya no cuentan como "no evaluables".
5. **Limitación:** la severidad se sigue calculando con dNBR, que el humo sesga a la baja; lo quemado bajo humo tiende a salir como severidad baja.

Con el humo, el área total dentro de los perímetros de EFFIS es del 93.2 % (Niebla), 97.1 % (La Mierla) y 96.4 % (Madrid-Ávila).

### 5.5 Severidad

Clases de dNBR de Key & Benson (2006), estándar del USGS, calculadas sobre la máscara final:

| dNBR | Clase |
|---|---|
| 0.10 – 0.27 | Baja |
| 0.27 – 0.44 | Moderada-baja |
| 0.44 – 0.66 | Moderada-alta |
| > 0.66 | Alta |

Se reporta la superficie (ha) de cada clase y su geometría para el mapa (§8). La tabla original se definió con Landsat; documentar que se aplica a Sentinel-2 con B8A/B12, que es lo habitual en la bibliografía.

---

## 6. Fuego activo (reto avanzado)

### 6.1 Detección por píxel

Sobre la imagen posterior en reflectancia, a 20 m:

- **Física:** el fuego emite mucho en el SWIR (sobre todo a 2.2 µm, B12) y casi nada en el NIR (B8A), así que el cociente `B12/B8A` es muy alto.
- **Regla:** `B12 ≥ 0.5` y `B12/B8A ≥ 2.5` (valores iniciales en `config.py`). Medido en Niebla:

  | Tipo de píxel | B12 (mediana) | B12/B8A (p10 – p90) |
  |---|---|---|
  | Frente activo | 1.40 | 4.6 – 9.1 |
  | Interior de la cicatriz (ceniza) | 0.24 | 1.5 – 1.8 |
  | Suelo desnudo claro en cultivos | 0.50 | 1.0 – 1.3 |

  El umbral de 2.5 está en el hueco entre la ceniza (≤ 1.8) y el frente (≥ 4.6). Con `B12 ≥ 0.5` y los cocientes, ningún píxel caliente aparece también en la imagen anterior.
- **Reglas descartadas:**
  - Adaptación directa de Murphy et al. (2016) (`B12/B8A ≥ 1.4`, `B11/B8A ≥ 1.4`, `B12 ≥ 0.15`): marca 20 555 px, casi todos ceniza del interior de la cicatriz.
  - `B11 + B12 > 1.0` (composición Wildfires de Pierre Markuse): marca suelo desnudo claro en cultivos lejos del incendio; 4411 de esos píxeles ya estaban "calientes" en la imagen anterior.
- Validar los umbrales en las otras escenas antes de darlos por buenos (§10).

### 6.2 De píxeles a focos

1. **Agrupación:** unir los píxeles calientes a menos de una **distancia de agrupación** (`config.py`, valor inicial 100 m) en un mismo foco, para decidir por foco y no por píxel. Con una dilatación de solo 1 px (20 m) salían 230 focos en Madrid, muchos de 1–2 px (§3.1).
2. **Persistencia (descarta fuentes de calor fijas):** si el mismo foco también aparece caliente en la imagen anterior, es una fuente permanente (industria, antorchas de gas, suelo o tejados muy reflectantes) y se descarta. Un incendio no está en el mismo sitio días antes. En Niebla, esta prueba elimina los falsos positivos de los cultivos con la regla `B11 + B12 > 1.0` (§6.1).
3. **Contexto:** un foco es válido si está dentro de la máscara quemada o a menos de una **distancia máxima** de ella (`config.py`, en metros; generosa, del orden de 500 m, por el humo entre la cicatriz y el frente). Los focos que no cumplen se descartan y no aparecen en la salida. Limitación conocida: un incendio que acaba de empezar y todavía no tiene cicatriz se descartaría.
4. **Descripción de cada foco:** centroide, número de píxeles, superficie, bounding box y longitud aproximada de frente (eje mayor de la componente).
5. **Longitud total del frente activo:** suma de las longitudes de los focos válidos.

---

## 7. Vectorización y medidas

1. **Polígonos:** `rasterio.features.shapes` (conectividad 8) sobre la máscara final, que conserva los agujeros (islas no quemadas). Pasar a lon/lat con la transformación de la rejilla (§4.1) y construir un `shapely` `MultiPolygon`.
2. **Simplificación:** Douglas-Peucker con tolerancia de **20 m** (un píxel), aplicada en coordenadas de píxel antes de pasar a lon/lat (los píxeles de la rejilla son cuadrados en metros). Sin simplificar, el contorno de un ráster infla el perímetro hasta ~×1.27 por el efecto escalera.
3. **Superficie y perímetro:** cálculo geodésico con `pyproj.Geod` sobre los polígonos simplificados. Superficie en hectáreas y perímetro en km.
4. **Superficie efectiva:** el área del polígono **sin** los agujeros. El perímetro es el del contorno exterior.
5. **Perímetro en escenas grandes:** sin más, en Madrid salían 1144 km de perímetro, porque los bordes irregulares y las manchas pequeñas suman mucho. Solución: el cierre de 40 m de §5.3 y **contar en el perímetro solo los polígonos de al menos 50 ha** (`config.py`); los pequeños siguen contando en el área. Medido frente al perímetro de EFFIS (que se dibuja a menor resolución y sale más suave):

   | Opción | La Mierla | Madrid-Ávila |
   |---|---|---|
   | EFFIS | 223 km | 558 km |
   | Sin cambios | 357 km | 1144 km |
   | Cierre de 40 m | 262 km | 733 km |
   | Solo polígonos ≥ 50 ha | 313 km | 993 km |
   | **Cierre de 40 m + polígonos ≥ 50 ha** | **242 km** | **661 km** |
6. **Coordenadas de imagen:** cada vértice también en píxeles de la imagen original, por interpolación lineal con `bbox` e `image_size`.

---

## 8. Salida

Un único resultado tipado (modelo pydantic `FireAnalysis` en `models.py`) que se serializa a este JSON:

```json
{
  "scene": {
    "acquisition_date": "2026-08-08",
    "pre_fire_window": ["2026-07-08", "2026-08-06"],
    "pre_fire_coverage": 1.0,
    "pre_fire_median_age_days": 2.0,
    "bbox": [-6.84125, 37.39963, -6.47903, 37.57739],
    "image_size": [2500, 1546]
  },
  "burned_area": {
    "polygons": [
      {
        "exterior": { "lonlat": [[lon, lat], "..."], "pixel": [[x, y], "..."] },
        "holes": [ { "lonlat": [[lon, lat], "..."], "pixel": [[x, y], "..."] } ]
      }
    ],
    "area_ha": 1240.5,
    "perimeter_km": 18.6,
    "under_smoke_ha": 76.6,
    "severity": [
      { "name": "low", "area_ha": 250.1, "geometry": { "type": "MultiPolygon", "coordinates": [] } },
      { "name": "moderate_low", "area_ha": 420.3, "geometry": { "type": "MultiPolygon", "coordinates": [] } },
      { "name": "moderate_high", "area_ha": 380.0, "geometry": { "type": "MultiPolygon", "coordinates": [] } },
      { "name": "high", "area_ha": 190.1, "geometry": { "type": "MultiPolygon", "coordinates": [] } }
    ]
  },
  "smoke": {
    "area_ha": 3881.0,
    "geometry": { "type": "MultiPolygon", "coordinates": [] }
  },
  "not_assessable_ha": 12.4,
  "active_fires": [
    {
      "id": 1,
      "centroid": { "lonlat": [lon, lat], "pixel": [x, y] },
      "bbox_pixel": [x0, y0, x1, y1],
      "pixels": 32,
      "area_ha": 1.3,
      "front_length_km": 1.2,
      "geometry": { "type": "MultiPolygon", "coordinates": [] }
    }
  ],
  "active_front_km": 4.8,
  "geojson": { "type": "FeatureCollection", "features": [] }
}
```

- `pixel` está en coordenadas de la **imagen original** (la que recibe el usuario), `lonlat` en EPSG:4326.
- `geojson` contiene el área quemada (MultiPolygon con agujeros, con `area_ha`, `perimeter_km`, `under_smoke_ha` y `severity_ha`), el humo (`kind: "smoke"`) y los focos como puntos con sus propiedades.
- `not_assessable_ha`: superficie excluida por nubes, sombras o falta de datos (§5.2), sin contar el humo, que se evalúa con dNBR2 (§5.4).
- `severity[].geometry`: polígonos de cada clase en lon/lat para pintar el mapa de severidad. Se dibujan sobre el dNBR suavizado con una mediana de 100 m y sin las piezas de menos de 1 ha: sin suavizar, las clases cambian de un píxel a otro y salen miles de motas (La Mierla: 19 600 piezas, unos 8 MB). `area_ha` se mide píxel a píxel, sin suavizar.
- `active_fires[].geometry`: polígono de los píxeles de cada foco, en lon/lat.

---

## 9. Estructura del código

Implementado en `backend/pipeline/` (rama `algorithm`, sobre el backend de `feature/backend-fire-data`):

```
backend/pipeline/
  config.py         Parámetros en un dataclass, en unidades físicas, cada uno con su justificación o referencia
  grid.py           Rejilla de trabajo a 20 m sobre el bbox y conversión a píxeles de la imagen original
  bands.py          Bandas en reflectancia (posterior y composición previa)
  copernicus.py     OAuth, Process API por teselas con reintentos y caché, evalscripts (§4)
  indices.py        NBR, dNBR, píxeles evaluables (SCL), firma de fuego activo
  burned_area.py    Semillas, histéresis, limpieza, relleno de agujeros, severidad (§5)
  active_fire.py    Agrupación, persistencia y contexto de focos (§6)
  vectorize.py      Máscara → polígonos simplificados, superficie y perímetro geodésicos (§7)
  models.py         Entrada (SceneInput) y salida (FireAnalysis) en pydantic (§2, §8)
  smoke.py          Humo y quemado bajo el humo con dNBR2 (§5.4)
  pipeline.py       Orquestación: entrada → resultado
  __main__.py       `uv run python -m pipeline pipeline/scenes/niebla.json`
  scenes/           Entradas de las tres escenas de ejemplo
```

- Python 3.13 (el del backend) con tipos (built-ins: `list[int]`, `dict[str, float]`…).
- Dependencias, las del backend más `pyproj`: `numpy`, `scipy`, `rasterio`, `shapely`, `httpx`, `pydantic`.
- Credenciales en variables de entorno `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` (`backend/.env`, ver `.env.example`).
- **Pipeline puro**: las funciones de detección reciben arrays y devuelven arrays/resultados tipados. Solo `copernicus.py` habla con la red.
- Orden de ejecución: descarga posterior y composición previa (en paralelo) → píxeles evaluables → dNBR → área quemada → fuego activo → vectorización → estadísticas.
- **Pendiente de implementar:** tests (§10.5).

---

## 10. Validación

1. **Referencias:**
   - **Anotación manual** del área quemada de las tres escenas (máscaras en `backend/tests/fixtures/`), con tres clases: quemado, no quemado y **dudoso** (sobre todo bajo humo). Lo dudoso se excluye de las métricas.
   - **Perímetros oficiales** de EFFIS o Copernicus EMS para esas fechas, si existen.
   - **Fuego activo:** la composición Wildfires de Niebla y La Mierla (usar solo sus píxeles cerca del incendio, porque la extracción por color tiene ruido) y los focos térmicos de NASA FIRMS (VIIRS, 375 m, a otra hora: solo como referencia de ubicación).
2. **Métricas:**
   - **Fracción de nuestra área dentro del perímetro final de EFFIS** (aproxima la precisión: el incendio solo crece). Valores actuales: 94–98 % (§3.1). Hay que comparar con **todos** los incendios de EFFIS que tocan la escena hasta la fecha de captura, no solo con el principal: en Madrid-Ávila, incluir El Barraco y otros pequeños sube el valor del 94.2 % al 97.1 %.
   - Fracción del área de EFFIS que detectamos (aproxima el recall; puede quedarse corta si EFFIS incluye crecimiento posterior a la captura).
   - IoU y F1 contra la anotación manual.
   - Precisión y recall de los focos con tolerancia de ±2 px contra Wildfires y FIRMS.
3. **Generalización:** ningún parámetro se ajusta mirando una sola escena. Leave-one-scene-out: ajustar con dos y medir en la tercera.
4. **Escenas nuevas:** 2–3 incendios adicionales (fecha y bbox) que no se usen para ajustar. Es lo más parecido a lo que hará el jurado.
5. **Tests automatizados** (regla 27, solo lo crítico): por escena, con las bandas guardadas como fixtures, IoU contra la anotación por encima de un mínimo y recall de focos por encima de un mínimo.

---

## 11. Roadmap

Las tareas pendientes, por prioridad, están en `to_do.md`.

---

## 12. Fuera de alcance

- Localizar la imagen de entrada (bbox y fecha): otro módulo.
- API, frontend, render de la imagen, textos y resumen para el usuario.
- Entrenar redes neuronales: no hay etiquetas y no compensa en 48 h.
- Seguimiento de la evolución del incendio a lo largo de varias fechas (solo usamos la imagen anterior como referencia).
