import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { Button } from "@/utils/ui/button"
import { useAuthContext } from '../context/AuthContext'

export default function Header({ className }: { className?: string }) {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { accessToken, logout, user } = useAuthContext()

    const toggleLanguage = () => {
        const nextLang = i18n.language.startsWith('es') ? 'en' : 'es'
        i18n.changeLanguage(nextLang)
        localStorage.setItem('i18nextLng', nextLang)
    }

    const currentLang = i18n.language.startsWith('es') ? 'es' : 'en'

    return (
        <header className={`bg-white shadow-md border-b border-slate-200 sticky top-0 z-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} title={t('header.home_tooltip')}>
                        <img
                            src="/images/WAIOT FIUBA.png"
                            alt="Waiot Logo"
                            className="h-10 w-auto"
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{t('header.title')}</h1>
                            <p className="text-xs text-slate-500">{t('header.subtitle')}</p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => navigate('/map')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.map')}
                        </button>
                        <button onClick={() => navigate('/optimization')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.optimization')}
                        </button>
                        <button onClick={() => navigate('/forecast-evaluation')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.predictions')}
                        </button>
                        <button onClick={() => navigate('/management')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.management')}
                        </button>
                        <button onClick={() => navigate('/configurations')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.configurations')}
                        </button>
                        <button onClick={() => navigate('/about')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            {t('nav.about')}
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleLanguage}
                            className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer border-slate-200"
                            title={t('header.switch_lang')}
                        >
                            <Languages className="h-3.5 w-3.5 text-sky-600" />
                            <span>{currentLang === 'es' ? 'EN' : 'ES'}</span>
                        </Button>

                        {user && (
                            <div className="text-sm text-slate-700 mr-2">{t('header.greeting', { name: user.name })}</div>
                        )}
                        {accessToken ? (
                            <Button variant="outline" onClick={() => logout()} className="cursor-pointer">
                                {t('auth.logout')}
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate('/login')} className="cursor-pointer">
                                {t('auth.login_button')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}