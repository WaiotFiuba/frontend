import type { DocSection } from '../types'

export const getForecastDoc = (lang: string): DocSection => {
  const isEn = lang.startsWith('en')

  if (isEn) {
    return {
      id: 'forecast',
      title: 'Forecaster Evaluation Guide',
      description: 'Analytical suite for testing the reliability and precision of container fill forecasting models (Baseline vs. Chronos-2).',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Forecaster Evaluation tool performs rigorous backtesting across multiple time-cutoffs on historical readings to measure how accurately each predictive model forecasts when sites will reach critical thresholds.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: '1. Select the Model to Benchmark',
              body: 'Choose between the "Baseline Operativo" and "Chronos-2 Small".',
            },
            {
              title: '2. Configure Cutoffs and Sample Size',
              body: 'Define the prediction horizon (e.g., 24 hours), the critical threshold (default 80%), and the number of sample sites to evaluate.',
            },
            {
              title: '3. Run Evaluation and Monitor Progress',
              body: 'Click "Run Evaluation". A progress indicator will display the percentage and count of sites processed in real time.',
            },
            {
              title: '4. Interpret Event-Based Metrics',
              body: 'Examine Event F1 Score, Precision, and Recall. These metrics determine whether the model accurately issues early warnings before sites overflow without triggering false alarms.',
            },
            {
              title: '5. Analyze Error Metrics and Download Report',
              body: 'Inspect MAE (Mean Absolute Error in points) and RMSE. Click "Download Report" to export a clean, printable PDF report with comprehensive per-site metrics.',
            },
          ],
        },
        {
          type: 'accordion',
          items: [
            {
              title: 'What does Event F1 Score mean?',
              body: 'It balances Precision (not raising false alarms when no overflow will happen) and Recall (never missing an actual critical overflow). A higher F1 means collection trucks are dispatched right when needed.',
            },
            {
              title: 'Why are there two models and how do they differ?',
              body: 'The platform provides two models suited for different operational needs:\n• Baseline Operativo: A simple, fast model that projects fill levels assuming containers keep filling at their recent pace. Best for routine day-to-day tracking when trash generation is steady.\n• Chronos-2: An advanced AI model that detects subtle patterns (such as weekend spikes or peak activity hours). Rather than a single estimate, it calculates probability ranges to warn you of potential overflow risks with higher confidence.\nThe evaluation tool lets you benchmark both on your actual city data to see which provides more reliable warnings for your routes.',
            },
            {
              title: 'What are early and late warning tolerances?',
              body: 'If a site reaches the threshold at 14:00, a prediction estimating it between 12:00 and 16:00 is considered on time according to the configured tolerance window (default ±2 hours).',
            },
            {
              title: 'Why are already-critical sites excluded from event metrics?',
              body: 'Because operators already know they are full at the cutoff time; the evaluation specifically benchmarks the model’s capability to anticipate future saturation events.',
            },
            {
              title: 'What is included in the downloadable PDF report?',
              body: 'It summarizes cutoff parameters, overall metrics (F1, Precision, Recall, MAE, RMSE), and provides a comprehensive breakdown for every evaluated site in the sample.',
            },
          ],
        },
      ],
    }
  }

  return {
    id: 'forecast',
    title: 'Guía de Evaluación del Forecaster',
    description: 'Suite analítica para medir cuantitativamente la confiabilidad y precisión de los modelos predictivos de llenado (Baseline vs. Chronos-2).',
    blocks: [
      {
        type: 'paragraph',
        text: 'La herramienta de Evaluación del Forecaster realiza backtesting sobre cortes temporales del histórico para verificar qué tan bien predice cada modelo el momento en que los sitios alcanzarán umbrales críticos.',
      },
      {
        type: 'steps',
        steps: [
          {
            title: '1. Seleccionar el Modelo a Evaluar',
            body: 'Elige entre el "Baseline Operativo" y "Chronos-2 Small".',
          },
          {
            title: '2. Configurar Cortes y Tamaño de Muestra',
            body: 'Establece el horizonte de proyección (ej. 24 hs), el umbral crítico a predecir (ej. 80%) y la cantidad de sitios de la muestra a evaluar.',
          },
          {
            title: '3. Ejecutar y Seguir el Progreso',
            body: 'Haz clic en "Ejecutar Evaluación". Una barra informativa mostrará en tiempo real la cantidad y porcentaje de sitios procesados por el backend.',
          },
          {
            title: '4. Interpretar Métricas por Evento',
            body: 'Analiza el F1 Score por evento, la Precisión y el Recall. Estas métricas evalúan si el modelo avisa a tiempo antes de que un sitio se desborde sin generar falsas alarmas.',
          },
          {
            title: '5. Analizar Errores y Descargar Informe',
            body: 'Revisa el error continuo MAE y RMSE. Presiona "Descargar Informe" para generar un reporte imprimible en PDF con el desglose individual por sitio.',
          },
        ],
      },
      {
        type: 'accordion',
        items: [
          {
            title: '¿Qué representa el F1 Score por evento?',
            body: 'Combina la Precisión (no dar falsas alarmas cuando el sitio no se va a llenar) con el Recall (no omitir ningún desborde real). Un F1 alto garantiza que los camiones se despachen con certeza.',
          },
          {
            title: '¿Por qué hay dos modelos y en qué se diferencian?',
            body: 'El sistema incluye dos modelos para distintas necesidades de operación:\n• Baseline Operativo: Es un modelo rápido y directo que calcula la proyección asumiendo que los contenedores se llenarán al mismo ritmo que vienen teniendo en las últimas horas. Es ideal para chequeos rápidos del día a día cuando la rutina de recolección es normal y estable.\n• Chronos-2: Es un modelo predictivo avanzado con Inteligencia Artificial que detecta patrones más complejos (como variaciones de fines de semana o franjas horarias comerciales). Además de estimar el nivel, calcula probabilidades de riesgo para avisar con anticipación cuándo un sitio puede desbordar.\nLa herramienta de evaluación te permite poner a prueba ambos modelos con datos reales de tu ciudad para saber cuál acierta mejor antes de tomar decisiones en la calle.',
          },
          {
            title: '¿Qué son las tolerancias de aviso temprano o tardío?',
            body: 'Si un sitio desborda a las 14:00, una predicción que avise entre las 12:00 y las 16:00 se considera un acierto temporal dentro de la ventana de tolerancia de ±2 horas.',
          },
          {
            title: '¿Por qué se excluyen de la métrica los sitios ya críticos al corte?',
            body: 'Porque su estado de saturación ya es conocido por la operación; la evaluación evalúa estrictamente la capacidad de anticipar desbordes futuros.',
          },
          {
            title: '¿Qué información contiene el informe descargable en PDF?',
            body: 'Resume los parámetros de corte seleccionados, las métricas globales (F1, Precisión, Recall, MAE, RMSE) y una tabla detallada con el comportamiento de cada sitio analizado.',
          },
        ],
      },
    ],
  }
}
