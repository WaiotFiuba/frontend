import type { DocSection } from '../types'

export const getOptimizationDoc = (lang: string): DocSection => {
  const isEn = lang.startsWith('en')

  if (isEn) {
    return {
      id: 'optimization',
      title: 'Redistribution & Optimization Guide',
      description: 'What-If simulation engine for balancing container utilization and mitigating street overflows through optimal relocations.',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Optimization Playground allows municipal planners to simulate dynamic container reassignments between nearby collection sites, eliminating asymmetric container filling and preventing overflows before moving physical equipment on the street.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: '1. Adjust Control Parameters',
              body: 'Open the floating panel on the map to define operational constraints: maximum transfer distance (km), move cost penalty, and saturation score thresholds.',
            },
            {
              title: '2. Select the Optimization Algorithm',
              body: 'Choose between "Load Balancing" (optimizes for uniform container usage using cost-penalty balancing) or "Overflow Mitigation MIP" (Mixed Integer Linear Programming prioritizing the elimination of critical overflow events).',
            },
            {
              title: '3. Simulate a What-If Scenario',
              body: 'Click "Simulate New Redistribution". The engine solves the optimization problem and displays proposed moves directly on the map with directional blue arrows.',
            },
            {
              title: '4. Analyze the Impact Panel and Network KPIs',
              body: 'Review the KPI impact cards: reduction in critical sites, shift in average fill percentage, total containers relocated, and total distance required.',
            },
            {
              title: '5. Activate or Deactivate the Plan',
              body: 'When satisfied with the plan results, click "Activate Plan" to apply the virtual container reallocations across the digital twin. You can deactivate it at any time by clicking "Deactivate Plan".',
            },
          ],
        },
        {
          type: 'accordion',
          items: [
            {
              title: 'What is the difference between a simulation and an active plan?',
              body: 'A simulation is an in-memory draft showing candidate moves. Once you "Activate Plan", the reallocated containers are tracked as virtual levels, modifying operational metrics and map badges across the entire platform.',
            },
            {
              title: 'What do the + and − badges on some sites mean?',
              body: 'These badges appear when an optimization plan is active: Blue (−) shows containers to be moved out of an underutilized or saturated site, and Purple (+) shows containers entering the site to reinforce capacity.',
            },
            {
              title: 'How do I inspect an individual relocation move?',
              body: 'Click any blue arrow or line on the interactive map. An impact card will pop up showing the source site, target site, move distance, and container type.',
            },
            {
              title: 'Why are some sites excluded from receiving containers?',
              body: 'Sites that have reached their maximum legal capacity based on sidewalk and street geometry restrictions cannot receive extra containers.',
            },
          ],
        },
      ],
    }
  }

  return {
    id: 'optimization',
    title: 'Guía de Optimización y Redistribución',
    description: 'Motor de simulación What-If para balancear la utilización de contenedores y mitigar desbordes mediante reubicaciones óptimas.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo de Optimización permite simular reasignaciones dinámicas de contenedores entre sitios cercanos para eliminar asimetrías de llenado y reducir desbordes en vía pública antes de comprometer recursos en la calle.',
      },
      {
        type: 'steps',
        steps: [
          {
            title: '1. Ajustar Parámetros de Control',
            body: 'Despliega el panel de control flotante en el mapa para configurar las restricciones: radio máximo de traslado (km), costo por movimiento y umbrales de saturación.',
          },
          {
            title: '2. Seleccionar el Algoritmo de Optimización',
            body: 'Elige entre "Equilibrio de Carga" (balanceo uniforme por penalizaciones de dispersión) o "Mitigación de Desbordes MIP" (Programación Lineal Entera Mixta orientada a prevenir desbordes críticos).',
          },
          {
            title: '3. Simular Escenario What-If',
            body: 'Haz clic en "Simular Nueva Redistribución". El motor calculará los movimientos óptimos y los dibujará en el mapa con flechas y líneas direccionales azules.',
          },
          {
            title: '4. Analizar el Panel de Impacto y KPIs',
            body: 'Revisa las métricas proyectadas: reducción de sitios críticos, variación del llenado promedio, contenedores a mover y distancia total estimada del operativo.',
          },
          {
            title: '5. Activar o Desactivar el Plan',
            body: 'Si el resultado es conveniente, pulsa "Activar Plan" para aplicar virtualmente las reubicaciones en la red. Puedes volver al estado base en cualquier momento con "Desactivar Plan".',
          },
        ],
      },
      {
        type: 'accordion',
        items: [
          {
            title: '¿Qué diferencia hay entre una simulación What-If y un plan activo?',
            body: 'La simulación es un borrador en memoria para evaluar impacto. Al "Activar Plan", los contenedores se consideran virtualmente reubicados y sus efectos se reflejan en todos los KPIs y pines de la plataforma.',
          },
          {
            title: '¿Qué significan las insignias numéricas (+ y −) en los sitios?',
            body: 'Indican movimientos de un plan de redistribución activo: azul (−) para contenedores que salen del sitio y violeta (+) para contenedores que ingresan a reforzar la capacidad.',
          },
          {
            title: '¿Cómo inspeccionar un movimiento específico?',
            body: 'Haz clic sobre cualquiera de las flechas azules en el mapa para abrir la tarjeta de impacto con el sitio origen, sitio destino y la distancia exacta del traslado.',
          },
          {
            title: '¿Por qué algunos sitios no pueden recibir más contenedores?',
            body: 'Porque han alcanzado la capacidad física máxima permitida por normativa municipal y ancho de vereda/calzada.',
          },
        ],
      },
    ],
  }
}
