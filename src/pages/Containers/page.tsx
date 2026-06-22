import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/components/InteractiveMap'
import { useState } from 'react'
import SimulationControl from '@/components/SimulationControl'
import { BackendContainer } from '@/pages/Management/components/types'

interface MapProps {
    containers: BackendContainer[]
    loading: boolean
    error: string | null
    loadContainers: () => Promise<void>
}

export default function Map({ error }: MapProps) {
    const navigate = useNavigate()
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                            Interactive Map
                        </h1>
                        <p className="text-slate-600 mt-1">Monitoring of containers and geographic telemetry.</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
                    >
                        Back to Home
                    </Button>
                </div>

                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-lg shadow-sm text-xs">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg h-[70vh] w-full overflow-hidden flex items-center justify-center relative">
                    <InteractiveMap refreshTrigger={refreshTrigger} />
                </div>

                <SimulationControl onSimulationStateChange={async () => {
                    setRefreshTrigger(prev => prev + 1)
                }} />
            </div>
        </div>
    )
}
