import 'leaflet/dist/leaflet.css'
import { Card, CardContent } from '@/utils/ui/card'
import InteractiveMap from '@/common/InteractiveMap'
import MapLegend from './components/MapLegend'
import { useState } from 'react'
import SimulationControl from './components/SimulationControl'
import { MapPin } from 'lucide-react'
import { NetworkKpiPanel } from '@/common/KpiPanel'
import { useCityConfig } from '@/context/CityConfigContext'
import { useTranslation } from 'react-i18next'
import { HelpButton } from '@/documentation'

export default function Map() {
    const { t } = useTranslation()
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
                        <HelpButton sectionId="map" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold gap-2 shadow-sm" />
                    </div>
                </div>

                {/* Panel de Métricas Operativas de la Red */}
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
