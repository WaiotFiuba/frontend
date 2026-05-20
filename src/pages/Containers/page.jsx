import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/components/InteractiveMap/page'

export default function Map() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">Map</h1>
                        <p className="text-slate-600 mt-2">Interactive map interface coming soon</p>
                    </div>
                    <Button 
                        variant="outline"
                        onClick={() => navigate('/')}
                    >
                        Back to Home
                    </Button>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-lg h-[70vh] w-full flex items-center justify-center">
                    {/* <div className="text-center space-y-4">
                        <div className="text-6xl">🗺️</div>
                        <p className="text-slate-600 text-lg">Map interface under development</p>
                    </div> */}
                    <InteractiveMap />
                </div>
            </div>
        </div>
    )
}
