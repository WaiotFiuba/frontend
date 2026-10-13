import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/utils/ui/button'
import {
  ArrowRight,
  Building2,
  GraduationCap,
  MapPin,
} from 'lucide-react'

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/30 to-slate-50 border-b border-slate-200/80 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 flex flex-col items-center">

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold tracking-wide shadow-xs">
            <GraduationCap className="h-4 w-4 text-sky-700" />
            <span>Proyecto WAIOT â€¢ FIUBA</span>
          </div>

          <div className="flex justify-center pb-2">
            <img
              src="/images/WAIOT FIUBA.png"
              alt="Logo Waiot FIUBA"
              className="w-full max-w-md sm:max-w-lg md:max-w-xl h-auto object-contain drop-shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            GestiÃ³n Inteligente de Residuos Urbanos con{' '}
            <span className="text-sky-600 bg-clip-text">Gemelos Digitales</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Una plataforma orientada a la optimizaciÃ³n, equilibrio de carga y reubicaciÃ³n dinÃ¡mica de contenedores urbanos,
            articulada con estÃ¡ndares tÃ©cnicos de ingenierÃ­a, seguridad vial y eficiencia logÃ­stica aplicables a cualquier ciudad.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/optimization')}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer transition-all"
            >
              <span>Ver Motor de OptimizaciÃ³n</span>
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
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">QuiÃ©nes Somos</h2>
              <p className="text-xs sm:text-sm text-slate-500">Origen acadÃ©mico, ingenierÃ­a aplicada e impacto urbano</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed w-full">
            <p>
              Somos un equipo interdisciplinario de investigaciÃ³n y desarrollo de la{' '}
              <strong className="text-slate-900 font-semibold">Facultad de IngenierÃ­a de la Universidad de Buenos Aires (FIUBA)</strong>,
              apasionados por transformar los servicios pÃºblicos urbanos mediante el uso de{' '}
              <span className="text-sky-700 font-medium">Modelos de SimulaciÃ³n (Digital Twins)</span>.
            </p>
            <p>
              <strong>WAIOT FIUBA</strong> naciÃ³ como respuesta a un problema cotidiano y crÃ­tico de las grandes ciudades:
              la asimetrÃ­a de llenado entre contenedores, los desbordes en vÃ­a pÃºblica y la falta de informaciÃ³n
              en tiempo real para dimensionar y ubicar eficientemente la infraestructura de higiene urbana.
            </p>
            <p>
              DiseÃ±amos herramientas tecnolÃ³gicas que asisten a tomadores de decisiÃ³n, planificadores del gobierno y
              operadores de higiene urbana para gestionar recursos pÃºblicos con criterios cientÃ­ficos y basados en datos reales.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}