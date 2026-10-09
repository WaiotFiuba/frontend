import 'leaflet/dist/leaflet.css'
import { Button } from '@/common/ui/button'
import { Card, CardContent } from '@/common/ui/card'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import MapLegend from '@/common/MapLegend'
import { useState } from 'react'
import SimulationControl from '@/common/SimulationControl'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useCityConfig } from '@/context/CityConfigContext'

export default function Map() {
    const navigate = useNavigate()
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const { cityName } = useCityConfig()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <MapPin className="w-8 h-8 text-sky-600 shrink-0" />
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900">
                                    Mapa Interactivo
                                </h1>
                                <p className="text-slate-600 text-sm mt-0.5">
                                    Monitoreo geográfico de sitios, niveles de llenado y telemetría de contenedores{cityName ? ` en ${cityName}` : ''}.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold gap-2 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al inicio
                    </Button>
                </div>

                {/* Contenedor principal con Diccionario a la izquierda y Mapa a la derecha */}
                <div className="flex flex-col lg:flex-row gap-5 items-stretch">
                    {/* Panel lateral izquierdo: Diccionario de iconos */}
                    <div className="w-full lg:w-80 xl:w-80 shrink-0">
                        <MapLegend className="h-[75vh]" />
                    </div>

                    {/* Panel derecho: Mapa interactivo */}
                    <Card className="flex-1 rounded-2xl border-slate-200 shadow-lg h-[75vh] w-full overflow-hidden p-0 gap-0">
                        <CardContent className="h-full w-full p-0 overflow-hidden relative">
                            <InteractiveMap refreshTrigger={refreshTrigger} />
                        </CardContent>
                    </Card>
                </div>

                <SimulationControl onSimulationStateChange={async () => {
                    setRefreshTrigger(prev => prev + 1)
                }} />
            </div>
        </div>
    )
}
