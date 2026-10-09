import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/ui/button'
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  Building2,
  Truck,
  Recycle,
  GraduationCap,
  MapPin,
} from 'lucide-react'

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/30 to-slate-50 border-b border-slate-200/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold tracking-wide shadow-xs">
            <GraduationCap className="h-4 w-4 text-sky-700" />
            <span>Proyecto WAIOT • FIUBA</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Gestión Inteligente de Residuos Urbanos con{' '}
            <span className="text-sky-600 bg-clip-text">Gemelos Digitales e IoT</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Una plataforma orientada a la optimización, equilibrio de carga y reubicación dinámica de contenedores en la
            Ciudad Autónoma de Buenos Aires, articulada con los criterios técnicos y normativos de la{' '}
            <span className="font-semibold text-slate-800">Resolución Conjunta SSHU / MAYEPGC / MDUYTGC N° 1/19</span>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/optimization')}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer transition-all"
            >
              <span>Ver Motor de Optimización</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-slate-300 hover:bg-slate-100 font-semibold px-6 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <MapPin className="h-4 w-4 mr-1.5 text-slate-600" />
              <span>Explorar Mapa Interactivo</span>
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-16">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Quiénes Somos</h2>
              <p className="text-xs sm:text-sm text-slate-500">Origen académico, ingeniería aplicada e impacto urbano</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed w-full">
            <p>
              Somos un equipo interdisciplinario de investigación y desarrollo de la{' '}
              <strong className="text-slate-900 font-semibold">Facultad de Ingeniería de la Universidad de Buenos Aires (FIUBA)</strong>,
              apasionados por transformar los servicios públicos urbanos mediante la convergencia de{' '}
              <span className="text-sky-700 font-medium">Internet de las Cosas (IoT)</span>,{' '}
              <span className="text-sky-700 font-medium">Modelos de Simulación (Digital Twins)</span> e{' '}
              <span className="text-sky-700 font-medium">Investigación Operativa</span>.
            </p>
            <p>
              <strong>WAIOT</strong> nació como respuesta a un problema cotidiano y crítico de las grandes metrópolis:
              la asimetría de llenado entre contenedores, los desbordes en vía pública y la falta de información
              en tiempo real para dimensionar y ubicar eficientemente la infraestructura de higiene urbana.
            </p>
            <p>
              Diseñamos herramientas tecnológicas que asisten a tomadores de decisión, planificadores del gobierno y
              operadores de higiene urbana para gestionar recursos públicos con criterios científicos y basados en datos reales.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Normativa: Resolución N° 1/19
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Criterios de ubicación de contenedores de RSU (fracción seca y húmeda) en CABA
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm sm:text-base text-slate-600">
            <p>
              La norma formaliza que la instalación y reubicación de contenedores no responde al arbitrio, sino a una rigurosa
              evaluación técnica de dos componentes fundamentales:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Truck className="h-4 w-4 text-sky-600" />
                <span>Fracción Húmeda (RSU Domiciliarios)</span>
              </div>
              <ul className="text-xs sm:text-sm text-slate-600 space-y-2">
                <li>• <strong>Carga lateral:</strong> Color negro, capacidad máxima de <strong>3.200 L</strong>.</li>
                <li>• <strong>Carga bilateral:</strong> Color gris, capacidad máxima de <strong>3.750 L</strong>.</li>
                <li>• <strong>Semi soterrados:</strong> Color gris, capacidad máxima de <strong>3.750 L</strong>.</li>
              </ul>
              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200/60">
                <strong>Requisito operativo:</strong> Mínimo 7 metros de altura libres sin cables ni copas de árboles para izaje y vaciado.
              </div>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <Recycle className="h-4 w-4 text-emerald-700" />
                <span>Fracción Seca (Materiales Reciclables)</span>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 space-y-2">
                <li>• <strong>Carga vertical (Campana):</strong> Color verde, capacidad máxima de <strong>2.750 L</strong>.</li>
                <li>• <strong>Carga lateral:</strong> Color verde, capacidad máxima de <strong>3.200 L</strong>.</li>
                <li>• <strong>Criterio de red:</strong> Prioridad en zonas residenciales con distanciamiento sugerido de <strong>300 metros</strong> entre puntos.</li>
              </ul>
              <div className="text-[11px] text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-200/60">
                <strong>Requisito operativo:</strong> Mínimo 6 metros de altura libres para izaje de descarga.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Impedimentos Absolutos de Instalación
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                El Anexo prohíbe tajantemente ubicar contenedores donde se superpongan con:
              </p>
              <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 text-xs text-slate-700 space-y-1.5">
                <p>• Paradas de colectivos / cajones amarillos y pasos a nivel ferroviarios.</p>
                <p>• Polígono de seguridad de ochavas y sendas peatonales.</p>
                <p>• Ciclovías, bicisendas y estaciones Ecobici (STPB).</p>
              </div>
            </div>


          </div>
        </section>
      </div>
    </div>
  )
}