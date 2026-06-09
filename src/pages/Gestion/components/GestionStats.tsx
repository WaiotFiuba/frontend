import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Database, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'
import { BackendContainer } from './types'

interface GestionStatsProps {
  containers: BackendContainer[]
  showOnlyAlerts: boolean
  onToggleAlerts: (show: boolean) => void
}

export default function GestionStats({ containers, showOnlyAlerts, onToggleAlerts, }: GestionStatsProps) {
  const stats = useMemo(() => {
    const total = containers.length
    const available = containers.filter((c) => c.available).length
    const alertLevel = containers.filter((c) => c.current_level >= 80).length
    const avgFill =
      total > 0
        ? Math.round(containers.reduce((acc, c) => acc + c.current_level, 0) / total)
        : 0

    return { total, available, alertLevel, avgFill }
  }, [containers])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

      <Card onClick={() => onToggleAlerts(false)} className={`border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white cursor-pointer hover:border-blue-400 active:scale-[0.98] ${!showOnlyAlerts ? 'ring-2 ring-blue-500/10 border-blue-400' : ''}`}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Contenedores Totales
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">{stats.total}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>


      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Disponibles / Activos
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{stats.available}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>


      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Llenado Promedio
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">{stats.avgFill}%</h3>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card onClick={() => onToggleAlerts(!showOnlyAlerts)} className={`border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white cursor-pointer hover:border-amber-400 active:scale-[0.98] ${showOnlyAlerts ? 'ring-2 ring-amber-500/10 border-amber-400 bg-amber-50/10' : ''}`}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Alertas de Reboce
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600">{stats.alertLevel}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
