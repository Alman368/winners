export const es = {
  app: {
    logo: 'Logo de Compás',
    panel: 'Panel del incendio',
    fireSelector: 'Incendio',
    import: 'Importar',
    loadError: 'No se ha podido cargar el informe del incendio.',
    contextRunning: 'Cruzando el incendio con las carreteras y el tiempo. La primera vez puede tardar un minuto.',
    contextError: 'No se han podido calcular las carreteras cortadas ni el tiempo. Recarga la página más tarde.',
  },
  accessibility: {
    open: 'Ajustes de accesibilidad',
    title: 'Accesibilidad',
    textSize: 'Tamaño del texto',
    textSizes: { normal: 'Normal', large: 'Grande', extraLarge: 'Muy grande' },
    colorblind: 'Modo daltónico',
  },
  tour: {
    start: 'Cómo funciona',
    next: 'Siguiente',
    back: 'Anterior',
    finish: 'Terminar',
    close: 'Cerrar la guía',
    progress: (step: number, total: number) => `${step} de ${total}`,
    steps: {
      legend: {
        title: 'El incendio, medido',
        description:
          'Sobre la imagen del satélite Sentinel-2 dibujamos el perímetro quemado, la severidad del daño y el fuego activo en el momento de la toma. La leyenda dice cuántas hectáreas hay de cada clase.',
      },
      composites: {
        title: 'Dos formas de ver la imagen',
        description:
          'Color real, como la verías desde un avión, e infrarrojo, que atraviesa el humo y separa lo quemado de la vegetación sana.',
      },
      curtain: {
        title: 'Antes y después',
        description:
          'Abre la cortina y deslízala para comparar el primer día del incendio con la imagen analizada y ver cuánto avanzó el fuego.',
      },
      layers: {
        title: 'Qué hay alrededor',
        description:
          'Elige qué se dibuja: carreteras cortadas, núcleos de población, embalses o el perímetro oficial de EFFIS para contrastar nuestro resultado. Pasa por encima de una carretera cortada para ver su punto kilométrico.',
      },
      weather: {
        title: 'El tiempo durante el incendio',
        description:
          'Viento, rachas, temperatura, humedad y lluvia de esos días. La flecha indica hacia dónde empujaba el viento al fuego.',
      },
      kpis: {
        title: 'Las cifras clave',
        description:
          'Superficie quemada, severidad alta, frente activo y carreteras cortadas: lo esencial del incendio de un vistazo.',
      },
      fireZones: {
        title: 'Dónde había fuego',
        description: 'Las zonas con más frente activo en la toma, de mayor a menor. Pulsa una para centrar el mapa en ella.',
      },
      import: {
        title: 'Analiza tu propio incendio',
        description:
          'Sube una imagen exportada del Copernicus Browser y di dónde fue. La situamos en el mapa aunque no tenga coordenadas y generamos el informe en unos minutos.',
      },
    },
  },
  importFire: {
    title: 'Importar imagen',
    chooseImage: 'Elegir imagen',
    placePlaceholder: 'Lugar, p. ej. Niebla (Huelva)',
    submit: 'Analizar',
    running: 'Analizando… puede tardar unos minutos',
    quotaError: 'La cuenta de Copernicus ha agotado su cuota. Hay que renovar la cuota o configurar unas credenciales con saldo.',
    effisError: 'EFFIS no está respondiendo y no hemos podido consultar el inicio del incendio. Vuelve a intentarlo en unos minutos.',
    contextError: 'La imagen ya está analizada, pero la consulta de carreteras o del tiempo ha fallado. Vuelve a intentarlo.',
    error:
      'No se ha podido analizar. Usa una exportación de un solo día de Copernicus Browser, sin renombrar, y revisa el lugar.',
  },
  scenes: {
    curtain: 'Comparar con el inicio',
    before: (date: string) => `Inicio · ${date}`,
    after: (date: string) => `Original · ${date}`,
    handle: 'Mover la cortina entre el inicio del incendio y la imagen original',
    fireDaysLoading: 'Buscando el inicio del incendio',
    fireDaysError: 'No se ha podido calcular el inicio del incendio.',
    imageLoading: 'Cargando imagen',
    imageError: 'No se ha podido cargar la imagen.',
  },
  kpis: {
    title: 'Cifras principales',
    burned: 'Superficie quemada',
    burnedDescription: (km: string) => `Perímetro de ${km} km`,
    severe: 'Severidad alta',
    severeDescription: (pct: string) => `${pct} % del área (clases moderada-alta y alta)`,
    fire: 'Frente activo',
    fireDescription: 'Suma de los frentes con fuego en la imagen',
    roads: 'Carreteras cortadas',
    roadsNone: 'Ninguna carretera cruza la zona quemada',
    roadsMore: (names: string, count: number) => `${names} y ${count} más`,
    unnamedRoad: 'Vía sin nombre',
    ha: 'ha',
    km: 'km',
  },
  map: {
    baseImage: 'Imagen',
    layers: 'Capas',
    layersDescription: 'Elige qué se dibuja sobre la imagen',
    composites: {
      true_color: 'Color real',
      swir: 'Infrarrojo',
    },
    roadKilometre: (km: string) => `km ${km}`,
    layerNames: {
      severity: 'Severidad',
      burned: 'Perímetro quemado',
      fire: 'Fuego activo',
      roads: 'Carreteras cortadas',
      townsInside: 'Núcleos dentro del incendio',
      townsNearby: 'Núcleos cerca del incendio',
      reservoirs: 'Embalses',
      official: 'Perímetro final oficial (EFFIS)',
    },
  },
  severity: {
    classes: {
      sin_quemar: 'Sin quemar',
      baja: 'Baja',
      moderada_baja: 'Moderada-baja',
      moderada_alta: 'Moderada-alta',
      alta: 'Alta',
    },
  },
  fireZones: {
    title: 'Dónde había fuego activo',
    description: 'Zonas agrupadas con al menos 500 m de frente. Pulsa para verlas en el mapa.',
    empty: 'No hay zonas con al menos 500 m de frente activo en esta imagen.',
    length: (km: string) => `${km} km de frente`,
    detail: (ha: string) => `${ha} ha con fuego detectado`,
    showMore: (count: number) => `Ver ${count} zonas más`,
    showLess: 'Ver menos',
    focus: (rank: number) => `Centrar el mapa en la zona ${rank}`,
  },
  legend: {
    title: 'Leyenda',
    severityTitle: 'Severidad',
    severityDescription: 'Daño estimado en la vegetación al comparar imágenes anteriores y posteriores al incendio.',
    hectares: (value: string) => `${value} ha`,
    front: (value: string) => `${value} km de frente`,
    kilometres: (value: string) => `${value} km`,
    towns: (count: number) => (count === 1 ? '1 núcleo' : `${count} núcleos`),
  },
  weather: {
    title: 'Tiempo durante el incendio',
    windArrow: 'Hacia dónde empujaba el viento',
    expand: 'Mostrar el tiempo',
    collapse: 'Ocultar el tiempo',
    windFrom: (from: string) => `Viento del ${from}`,
    gusts: 'Rachas',
    maxTemperature: 'Temp. máxima',
    minHumidity: 'Humedad mínima',
    rain: 'Lluvia',
    speed: (kmh: string) => `${kmh} km/h`,
    temperature: (celsius: string) => `${celsius} °C`,
    humidity: (pct: string) => `${pct} %`,
    rainAmount: (mm: string) => `${mm} mm`,
    noRain: 'Sin lluvia',
    directions: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'],
  },
}
