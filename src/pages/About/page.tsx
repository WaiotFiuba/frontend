import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/utils/ui/button'
import {
  ArrowRight,
  Building2,
  GraduationCap,
  MapPin,
} from 'lucide-react'

export default function About() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-20">
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/30 to-slate-50 border-b border-slate-200/80 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 flex flex-col items-center">

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold tracking-wide shadow-xs">
            <GraduationCap className="h-4 w-4 text-sky-700" />
            <span>{t('about.badge')}</span>
          </div>

          <div className="flex justify-center pb-2">
            <img
              src="/images/WAIOT FIUBA.png"
              alt="Logo Waiot FIUBA"
              className="w-full max-w-md sm:max-w-lg md:max-w-xl h-auto object-contain drop-shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {t('about.title_part1')}{' '}
            <span className="text-sky-600 bg-clip-text">{t('about.title_part2')}</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            {t('about.subtitle')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/optimization')}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer transition-all"
            >
              <span>{t('about.btn_optimization')}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-slate-300 hover:bg-slate-100 font-semibold px-6 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <MapPin className="h-4 w-4 mr-1.5 text-slate-600" />
              <span>{t('about.btn_map')}</span>
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
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('about.who_we_are_title')}</h2>
              <p className="text-xs sm:text-sm text-slate-500">{t('about.who_we_are_subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed w-full">
            <p>
              {t('about.paragraph1')}
            </p>
            <p>
              {t('about.paragraph2')}
            </p>
            <p>
              {t('about.paragraph3')}
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}