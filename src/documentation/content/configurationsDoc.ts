import type { DocSection } from '../types'

export const getConfigurationsDoc = (lang: string): DocSection => {
  const isEn = lang.startsWith('en')

  if (isEn) {
    return {
      id: 'configurations',
      title: 'Configurations Guide',
      description: 'Create, customize, and manage operational simulation scenarios for collection schedules and demand profiles.',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Configurations module lets you define custom operational profiles (collection windows, simulation speed, and neighborhood demand multipliers) to simulate realistic municipal scenarios.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: '1. Name and Describe Scenario',
              body: 'Enter a clear name and optional description for the configuration to easily identify it later.',
            },
            {
              title: '2. Set Simulation Timeframe and Speed',
              body: 'Define the start date/time, an optional end date (or keep it continuous), and set the simulation speedup factor.',
            },
            {
              title: '3. Select Collection Days and Hours',
              body: 'Choose the days and hours when collection trucks circulate, or apply quick presets like Night Service or 24 Hours.',
            },
            {
              title: '4. Adjust Urban Demand',
              body: 'Set a global demand multiplier or customize specific multipliers for individual neighborhoods.',
            },
            {
              title: '5. Save and Use in Map',
              body: 'Save your configuration. You can then load it directly into the Interactive Map simulation with one click.',
            },
          ],
        },
        {
          type: 'accordion',
          items: [
            {
              title: 'How do I apply a saved configuration to the Map?',
              body: 'In your "My Saved Configurations" list on the right, click "Use in Map" on any card. This will take you directly to the simulation with all your parameters applied.',
            },
          ],
        },
      ],
    }
  }

  return {
    id: 'configurations',
    title: 'Guía de Configuraciones',
    description: 'Crea, personaliza y administra escenarios de simulación para horarios de recolección y perfiles de demanda urbana.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo de Configuraciones permite definir perfiles operativos completos (horarios de recolección, velocidad de simulación y demanda por barrio) para simular diferentes escenarios en la ciudad.',
      },
      {
        type: 'steps',
        steps: [
          {
            title: '1. Nombrar y Describir el Escenario',
            body: 'Ingresa un nombre claro y una descripción opcional para identificar fácilmente este perfil de simulación.',
          },
          {
            title: '2. Definir Fechas y Velocidad',
            body: 'Establece la fecha de inicio, la fecha de fin (o déjala indefinida para simulación continua) y la velocidad de simulación.',
          },
          {
            title: '3. Configurar Días y Horarios de Camiones',
            body: 'Selecciona los días y las franjas horarias en las que circulan los camiones recolectores, o usa accesos rápidos como Solo Noche o 24 Horas.',
          },
          {
            title: '4. Ajustar Demanda de Residuos',
            body: 'Define el multiplicador de demanda global o agrega multiplicadores específicos para barrios con mayor o menor generación.',
          },
          {
            title: '5. Guardar y Aplicar en el Mapa',
            body: 'Presiona "Guardar Configuración". Una vez guardada, puedes cargarla directamente en el Mapa interactivo con un solo clic.',
          },
        ],
      },
      {
        type: 'accordion',
        items: [
          {
            title: '¿Cómo aplico una configuración guardada en el Mapa?',
            body: 'En la lista de "Mis Configuraciones", haz clic en el botón "Cargar en Mapa" de la configuración que desees. Esto te redirigirá a la simulación con todos los parámetros precargados.',
          },
        ],
      },
    ],
  }
}
