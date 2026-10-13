import 'leaflet/dist/leaflet.css'
import { Button } from '@/common/utils/ui/button'
import { Card, CardContent } from '@/common/utils/ui/card'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import MapLegend from './components/MapLegend'
import { useState } from 'react'
import SimulationControl from './components/SimulationControl'
import { ArrowLeft, MapPin } from 'lucide-react'
import { NetworkKpiPanel } from '@/common/KpiPanel'
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
                                    Monitoreo geogrÃ¡fico de sitios, niveles de llenado y telemetrÃ­a de contenedores{cityName ? ` en ${cityName}` : ''}.
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

                {/* Panel de MÃ©tricas Operativas de la Red */}
                <NetworkKpiPanel refreshTrigger={refreshTrigger} />

                {/* Hero Map Full-Width con Leyenda Flotante Superpuesta */}
                <Card className="rounded-2xl border-slate-200 shadow-xl h-[78vh] min-h-[600px] w-full overflow-hidden p-0 relative">
                    <CardContent className="h-full w-full p-0 overflow-hidden relative">
                        <InteractiveMap refreshTrigger={refreshTrigger} />
                        <MapLegend />
                    </CardContent>
                </Card>

                <SimulationControl onSimulationStateChange={async () => {
                    setRefreshTrigger(prev => prev + 1)
                }} />
            </div>
        </div>
    )
}
