import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/ui/button'

export default function Home() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-slate-900 tracking-tight">
                        ¡Bienvenido a Waiot FIUBA!
                    </h1>
                    <p className="text-xl text-slate-600 leading-relaxed">
                        Primeros pasos en soluciones de gemelos digitales.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                        onClick={() => navigate('/map')}
                        size="lg"
                        className="px-8 py-6 text-base font-semibold"
                    >
                        Explorar Mapa
                    </Button>
                </div>
            </div>
        </div>
    )
}