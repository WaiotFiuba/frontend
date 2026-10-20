import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { Button } from "@/utils/ui/button"
import { useAuthContext } from '../context/AuthContext'

export default function Header({ className }: { className?: string }) {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { accessToken, logout, user } = useAuthContext()

    return (
        <header className={`bg-white shadow-md border-b border-slate-200 sticky top-0 z-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4">

                    <div
                        className="flex items-center justify-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/')}
                        title={t('header.home_tooltip')}
                    >
                        <img
                            src="/images/WAIOT FIUBA.png"
                            alt="Waiot Logo"
                            className="h-9 sm:h-10 w-auto"
                        />
                        <div className="text-center xl:text-left">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{t('header.title')}</h1>
                            <p className="text-xs text-slate-500">{t('header.subtitle')}</p>
                        </div>
                    </div>

                    <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 xl:gap-8">
                        <button onClick={() => navigate('/map')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer text-sm sm:text-base">
                            {t('nav.map')}
                        </button>
                        <button onClick={() => navigate('/optimization')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer text-sm sm:text-base">
                            {t('nav.optimization')}
                        </button>
                        <button onClick={() => navigate('/forecast-evaluation')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer text-sm sm:text-base">
                            {t('nav.predictions')}
                        </button>
                        <button onClick={() => navigate('/management')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer text-sm sm:text-base">
                            {t('nav.management')}
                        </button>
                        <button onClick={() => navigate('/configurations')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer text-sm sm:text-base">
                            {t('nav.configurations')}
                        </button>
                    </nav>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {user && (
                            <div className="text-sm text-slate-700">{t('header.greeting', { name: user.name })}</div>
                        )}

                        {accessToken && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/profile')}
                                className="h-8 w-8 p-0 rounded-full border border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"
                                title={t('header.profile_tooltip')}
                                aria-label={t('header.profile_tooltip')}
                            >
                                <User className="h-4 w-4" />
                            </Button>
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