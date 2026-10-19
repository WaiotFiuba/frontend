import 'leaflet/dist/leaflet.css'
import { Button } from '@/utils/ui/button'
import { Card, CardContent } from '@/utils/ui/card'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import MapLegend from './components/MapLegend'
import { useState } from 'react'
import SimulationControl from '@/simulation/SimulationControl'
import { SIMULATOR_ENABLED } from '@/simulation/config'
import { useSimulationMapExtras } from '@/simulation/useSimulationMapExtras'
import { ArrowLeft, MapPin } from 'lucide-react'
import { NetworkKpiPanel } from '@/common/KpiPanel'
import { useCityConfig } from '@/context/CityConfigContext'
import { useTranslation } from 'react-i18next'

export default function Map() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    // Los KPIs se vuelven a pedir cuando el mapa avisa que llegaron lecturas nuevas.
    const [kpiRefresh, setKpiRefresh] = useState(0)
    const { cityName } = useCityConfig()
    const mapExtras = useSimulationMapExtras()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <MapPin className="w-8 h-8 text-sky-600 shrink-0" />
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900">
                                    {t('map.title')}
                                </h1>
                                <p className="text-slate-600 text-sm mt-0.5">
                                    {t('map.subtitle')}
                                    {cityName ? t('map.in_city', { city: cityName }) : ''}.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold gap-2 shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('common.back_to_home')}
                        </Button>
                    </div>
                </div>

                {/* Panel de Métricas Operativas de la Red */}
                <NetworkKpiPanel refreshTrigger={kpiRefresh} />

                {/* Hero Map Full-Width con Leyenda Flotante Superpuesta */}
                <Card className="rounded-2xl border-slate-200 shadow-xl h-[78vh] min-h-[600px] w-full overflow-hidden p-0 relative">
                    <CardContent className="h-full w-full p-0 overflow-hidden relative">
                        <InteractiveMap onDataChange={() => setKpiRefresh((n) => n + 1)} extras={mapExtras} />
                        <MapLegend />
                    </CardContent>
                </Card>

                {SIMULATOR_ENABLED && <SimulationControl />}
            </div>
        </div>
    )
}
