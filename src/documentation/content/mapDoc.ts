import type { DocSection } from '../types'

export const getMapDoc = (lang: string): DocSection => {
  const isEn = lang.startsWith('en')

  if (isEn) {
    return {
      id: 'map',
      title: 'Interactive Map Guide',
      description: 'Visual monitoring center for collection sites, container telemetry, fill levels, and urban zone profiles.',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Interactive Map provides a real-time geographic overview of all urban waste containers in the city. You can inspect container fill levels, project future trends, filter by waste type, and explore demographic zone characteristics.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: '1. Navigation and Zoom Grouping',
              body: 'Use zoom and pan to explore the city. Distant containers are grouped together to improve visualization; zoom in closer to inspect individual collection sites with their status pins.',
            },
            {
              title: '2. Pin Status Colors and Thresholds',
              body: 'Pins indicate fill levels: Green for normal levels (<40%), Amber for high levels (40%-79%), and Red for critical levels (≥80%).',
            },
            {
              title: '3. Filter by Waste and Zone Profiles',
              body: 'Use the top toolbar to filter by waste type (All, Organic / Wet, or Recyclables). You can also activate the "Zone Profiles" layer to display census radius classifications (Residential, Commercial, Industrial, Mixed).',
            },
            {
              title: '4. Current vs. 24-Hour Projected Mode',
              body: 'Switch between "Current" level telemetry and "Projected" level mode to see which sites are forecasted to reach critical saturation within the next 24 hours.',
            },
            {
              title: '5. Detailed Site Inspection',
              body: 'Click any map pin to open its summary popup with container levels, and click "View site details" to navigate directly to its full telemetry and historical projection graph.',
            },
          ],
        },
        {
          type: 'accordion',
          items: [
            {
              title: 'How do I load a preset map configuration?',
              body: 'In the "Configurations" section, you can create and store comprehensive operational scenarios (collection days, pickup hours, neighborhood demand multipliers, and speed). Then, in the map simulation panel, click "Load Configuration" (folder icon) to immediately select and apply any saved preset or restore the system defaults.',
            },
            {
              title: 'What do the pin colors represent?',
              body: 'Pins indicate container fill levels: Green for normal levels (<40%), Amber for high levels (40%–79%), and Red for critical saturation (≥80%) requiring prompt attention.',
            },
            {
              title: 'How does the 24-hour predictive projection work on the map?',
              body: 'Switching to "Projected" mode updates pin colors and percentages to reflect estimated fill levels 24 hours into the future, helping prevent overflows before they occur.',
            },
            {
              title: 'How often does telemetry update on the map?',
              body: 'When a digital twin simulation is active, new readings are queried automatically every few seconds. In static mode, the last recorded reading is displayed.',
            },
            {
              title: 'What is the purpose of the Zone Profiles layer?',
              body: 'Zone profiles divide the urban grid according to census land use (Commercial, Residential, Office, Industrial). This context helps explain why demand surges at different times of day across neighborhoods.',
            },
            {
              title: 'How do I view the details of a specific site?',
              body: 'Click any pin on the map to open its summary popup, then click "View site details" to navigate to its continuous telemetry graphs and predictive curves.',
            },
          ],
        },
      ],
    }
  }

  return {
    id: 'map',
    title: 'Guía del Mapa Interactivo',
    description: 'Centro de monitoreo visual de sitios de recolección, telemetría de contenedores, niveles de llenado y perfiles urbanos.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El Mapa Interactivo permite visualizar en tiempo real la infraestructura de higiene urbana de la ciudad. Permite monitorear el llenado de contenedores, evaluar proyecciones futuras, filtrar por tipo de residuo y analizar el impacto de perfiles censales.',
      },
      {
        type: 'steps',
        steps: [
          {
            title: '1. Navegación y Agrupamiento por Zoom',
            body: 'Desplázate y haz zoom sobre la ciudad. Los contenedores lejanos se agrupan para mejorar su visualización; para más detalle debe acercarse a ellos para desplegar los sitios individuales con sus pines de estado.',
          },
          {
            title: '2. Interpretación de Colores y Umbrales',
            body: 'Los pines reflejan el nivel de llenado: Verde para nivel normal (<40%), Amarillo para nivel alto (40%–79%) y Rojo para nivel crítico (≥80%).',
          },
          {
            title: '3. Filtros de Residuos y Capa de Zonas',
            body: 'Utiliza la barra superior para filtrar por tipo de residuo (Todos, Húmedos u Orgánicos, o Reciclables). También puedes activar la capa "Perfiles de zona" para ver la clasificación del suelo por radio censal.',
          },
          {
            title: '4. Nivel Actual vs. Modo Proyectado a 24 hs',
            body: 'Alterna entre la telemetría actual y el modo de proyección predictiva a 24 horas para anticipar qué sitios alcanzarán niveles críticos antes de que ocurran desbordes.',
          },
          {
            title: '5. Inspección Detallada del Sitio',
            body: 'Haz clic en cualquier pin para abrir su tarjeta resumen, y pulsa "Ver detalle del sitio" para acceder a la ficha técnica con su histórico continuo y curvas predictivas.',
          },
        ],
      },
      {
        type: 'accordion',
        items: [
          {
            title: '¿Cómo cargar una configuración de mapa predeterminada?',
            body: 'En la sección "Configuraciones" puedes diseñar y guardar perfiles operativos completos (horarios y días de recolección, multiplicadores de demanda por barrio y velocidad). Luego, en el panel de control de simulación del Mapa, haz clic en "Cargar Configuración" (icono de carpeta) para seleccionar y aplicar de inmediato cualquiera de tus perfiles o la configuración predeterminada del sistema.',
          },
          {
            title: '¿Qué representa el color de los pines?',
            body: 'Los pines reflejan el nivel de llenado del sitio: Verde para nivel normal (<40%), Amarillo para nivel alto (40%–79%) y Rojo para nivel crítico (≥80%) que requiere atención prioritaria.',
          },
          {
            title: '¿Cómo funciona la proyección predictiva a 24 horas en el mapa?',
            body: 'Al alternar al modo "Proyectado", los pines actualizan sus colores y porcentajes estimando el nivel que tendrán los contenedores en las próximas 24 horas, permitiendo anticipar saturaciones antes de que ocurran desbordes.',
          },
          {
            title: '¿Con qué frecuencia se actualiza la información del mapa?',
            body: 'Durante una simulación activa del gemelo digital, las lecturas se actualizan automáticamente en intervalos de pocos segundos. En modo estático se visualiza la última lectura registrada.',
          },
          {
            title: '¿Para qué sirve la capa de Perfiles de Zona?',
            body: 'Clasifica los radios censales de la ciudad según su uso de suelo predominante (Residencial, Comercial, Oficinas, Industrial, Mixto), permitiendo correlacionar la demanda de residuos con las actividades urbanas.',
          },
          {
            title: '¿Cómo se consulta el detalle de un sitio específico?',
            body: 'Haz clic en cualquier pin para abrir su tarjeta resumen, y pulsa "Ver detalle del sitio" para acceder a la ficha técnica con su histórico continuo y curvas predictivas.',
          },
        ],
      },
    ],
  }
}
