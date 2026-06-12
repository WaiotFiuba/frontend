import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/components/InteractiveMap/page'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Play, Pause, Square, Clock, Database, AlertCircle } from 'lucide-react'

interface SimulationRead {
    id: number
    status: 'pending' | 'running' | 'paused' | 'stopping' | 'completed' | 'failed'
    scenario: Record<string, any>
    speedup: number
    global_demand_current: number
    global_demand_target: number
    transition_minutes: number
    simulated_time: string | null
    current_period: number
    total_periods: number
    measurements_sent: number
    collections_generated: number
    alarms_generated: number
    error_message: string | null
}

export default function Map() {
    const navigate = useNavigate()
    const [activeSim, setActiveSim] = useState<SimulationRead | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
    const [simulationInterval, setSimulationInterval] = useState<number>(5000)

    useEffect(() => {
        if (activeSim) {
            const saved = localStorage.getItem(`elapsed_sim_${activeSim.id}`)
            setElapsedSeconds(saved ? parseInt(saved) || 0 : 0)
        } else {
            setElapsedSeconds(0)
        }
    }, [activeSim?.id])

    useEffect(() => {
        if (activeSim?.id) {
            localStorage.setItem(`elapsed_sim_${activeSim.id}`, String(elapsedSeconds))
        }
    }, [elapsedSeconds, activeSim?.id])

    useEffect(() => {
        if (!activeSim || activeSim.status !== 'running') return

        const intervalId = setInterval(() => {
            setElapsedSeconds(prev => prev + 1)
        }, 1000)

        return () => clearInterval(intervalId)
    }, [activeSim?.status])

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600)
        const mins = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        return [
            hrs > 0 ? String(hrs).padStart(2, '0') : null,
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].filter(Boolean).join(':')
    }

    const fetchActiveSimulation = async () => {
        try {
            const data = await api.get<SimulationRead>(`/digital-twin/simulations/active?t=${Date.now()}`)
            setActiveSim(data)
        } catch (err: any) {
            setActiveSim(null)
        }
    }

    useEffect(() => {
        fetchActiveSimulation()
    }, [])

    useEffect(() => {
        let intervalTime = 5000
        if (activeSim) {
            const frequencyMinutes = activeSim.scenario?.frequency_minutes ?? 60
            const calculatedInterval = ((frequencyMinutes * 60) / activeSim.speedup) * 1000
            intervalTime = Math.max(2000, Math.min(calculatedInterval, 8000))
        }
        setSimulationInterval(intervalTime)

        const intervalId = setInterval(() => {
            fetchActiveSimulation()
        }, intervalTime)

        return () => clearInterval(intervalId)
    }, [activeSim?.status, activeSim?.speedup, activeSim?.scenario?.frequency_minutes])

    const handlePlayResume = async () => {
        if (!activeSim) return
        setActionLoading(true)
        setError(null)
        try {
            await api.post<SimulationRead>('/digital-twin/simulations/active/resume')
            await fetchActiveSimulation()
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error resuming the simulation')
        } finally {
            setActionLoading(false)
        }
    }

    const handlePause = async () => {
        if (!activeSim) return
        setActionLoading(true)
        setError(null)
        try {
            await api.post<SimulationRead>('/digital-twin/simulations/active/pause')
            await fetchActiveSimulation()
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error pausing the simulation')
        } finally {
            setActionLoading(false)
        }
    }

    const handleStop = async () => {
        if (!activeSim) return
        setActionLoading(true)
        setError(null)
        try {
            await api.post<SimulationRead>('/digital-twin/simulations/active/stop')
            await fetchActiveSimulation()
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error stopping the simulation')
        } finally {
            setActionLoading(false)
        }
    }

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

                {/* Simulation Control Toolbar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {activeSim ? (
                        <>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        {activeSim.status === 'running' && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        )}
                                        <span className={`relative inline-flex rounded-full h-3 w-3 ${activeSim.status === 'running'
                                            ? 'bg-emerald-500'
                                            : activeSim.status === 'paused'
                                                ? 'bg-amber-500'
                                                : 'bg-slate-400'
                                            }`}></span>
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Simulation #{activeSim.id} ({activeSim.status})
                                    </span>
                                </div>

                                <div className="h-4 w-px bg-slate-200 hidden md:block" />

                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span>Simulated clock: </span>
                                    <strong className="text-indigo-600">
                                        {activeSim.simulated_time
                                            ? new Date(activeSim.simulated_time).toLocaleDateString() + ' ' + new Date(activeSim.simulated_time).toLocaleTimeString()
                                            : 'Not started'}
                                    </strong>
                                </div>

                                <div className="h-4 w-px bg-slate-200 hidden md:block" />

                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                    <Clock className={`h-4 w-4 ${activeSim.status === 'running' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                                    <span>Elapsed time: </span>
                                    <strong className="text-slate-800">{formatTime(elapsedSeconds)}</strong>
                                </div>

                                <div className="h-4 w-px bg-slate-200 hidden md:block" />

                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                    <Database className="h-4 w-4 text-slate-400" />
                                    <span>Measurements: </span>
                                    <strong className="text-slate-800">{activeSim.measurements_sent}</strong>
                                </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {activeSim.status === 'running' ? (
                                    <Button
                                        onClick={handlePause}
                                        disabled={actionLoading}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 text-xs gap-1.5 rounded-lg shadow-sm"
                                    >
                                        <Pause className="h-3.5 w-3.5 fill-current" />
                                        Pause
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handlePlayResume}
                                        disabled={actionLoading || activeSim.status !== 'paused'}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 text-xs gap-1.5 rounded-lg shadow-sm"
                                    >
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                        Play
                                    </Button>
                                )}
                                <Button
                                    onClick={handleStop}
                                    disabled={actionLoading || activeSim.status === 'pending'}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-4 text-xs gap-1.5 rounded-lg shadow-sm"
                                >
                                    <Square className="h-3.5 w-3.5 fill-current" />
                                    Stop
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                                <span>Digital Twin inactive. Start a simulation from the Management section.</span>
                            </div>
                            <Button
                                onClick={() => navigate('/management')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-3.5 text-xs rounded-lg shadow-sm"
                            >
                                Go to Management
                            </Button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-3 rounded-lg shadow-sm text-xs">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg h-[70vh] w-full overflow-hidden flex items-center justify-center relative">
                    <InteractiveMap
                        isSimulationActive={activeSim?.status === 'running'}
                        simulationInterval={simulationInterval}
                    />
                </div>
            </div>
        </div>
    )
}
