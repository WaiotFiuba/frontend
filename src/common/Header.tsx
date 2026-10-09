import { useNavigate } from 'react-router-dom'
import { Button } from "@/common/ui/button"
import { useAuthContext } from '../context/AuthContext'

export default function Header({ className }: { className?: string }) {
    const navigate = useNavigate()
    const { accessToken, logout, user } = useAuthContext()

    return (
        <header className={`bg-white shadow-md border-b border-slate-200 sticky top-0 z-50 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} title="Ir al inicio">
                        <img
                            src="/images/WAIOT FIUBA.png"
                            alt="Waiot Logo"
                            className="h-10 w-auto"
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Waiot FIUBA</h1>
                            <p className="text-xs text-slate-500">Digital Twin Solutions</p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => navigate('/map')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            Map
                        </button>
                        <button onClick={() => navigate('/optimization')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            Optimization
                        </button>
                        <button onClick={() => navigate('/forecast-evaluation')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            Forecasts
                        </button>
                        <button onClick={() => navigate('/management')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            Management
                        </button>
                        <button onClick={() => navigate('/configurations')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            Configurations
                        </button>
                        <button onClick={() => navigate('/about')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer">
                            About
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="text-sm text-slate-700 mr-2">Hola, {user.name}</div>
                        )}
                        {accessToken ? (
                            <Button variant="outline" onClick={() => logout()} className="cursor-pointer">
                                Log Out
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate('/login')} className="cursor-pointer">
                                Sign In
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}