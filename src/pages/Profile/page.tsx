import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../../context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/utils/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/utils/ui/select'
import { User as UserIcon, Mail, Languages, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function Profile() {
  const { user } = useAuthContext()
  const { t, i18n } = useTranslation()

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es'

  const handleLanguageChange = (val: string) => {
    i18n.changeLanguage(val)
    localStorage.setItem('i18nextLng', val)
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('profile.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('profile.subtitle')}
          </p>
        </div>

        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-sky-100 border-2 border-sky-200 flex items-center justify-center text-sky-700 shadow-xs">
                <UserIcon className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {user?.name || '—'}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {user?.email || '—'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                  {t('profile.name')}
                </span>
                <span className="text-sm font-semibold text-slate-800 break-words">
                  {user?.name || '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                  {t('profile.email')}
                </span>
                <span className="text-sm font-semibold text-slate-800 break-words">
                  {user?.email || '—'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <label htmlFor="language-select" className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-sky-600" />
                    {t('profile.language')}
                  </label>
                  <p className="text-xs text-slate-500">
                    {t('profile.language_description')}
                  </p>
                </div>

                <div className="w-full sm:w-48">
                  <Select value={currentLang} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language-select" className="w-full bg-white border-slate-200 shadow-xs">
                      <SelectValue placeholder={t('profile.language')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">
                        <span className="flex items-center gap-2">
                          <span>{t('profile.spanish')}</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="en">
                        <span className="flex items-center gap-2">
                          <span>{t('profile.english')}</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {currentLang === 'es' ? 'Preferencias guardadas automáticamente' : 'Preferences saved automatically'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
