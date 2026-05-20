import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"

export default function Header() {
    const navigate = useNavigate()

    return (
        <header className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
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

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <button 
                            onClick={() => navigate('/')}
                            className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                        >
                            Home
                        </button>
                        <button 
                            onClick={() => navigate('/map')}
                            className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                        >
                            Map
                        </button>
                        <button 
                            onClick={() => navigate('/about')}
                            className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                        >
                            About
                        </button>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline"
                            onClick={() => navigate('/admin')}
                        >
                            Sign In
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}