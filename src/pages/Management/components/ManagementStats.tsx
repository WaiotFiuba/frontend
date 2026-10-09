import { Card, CardContent } from '@/common/ui/card'
import { Database, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'
import { ContainerStats } from './types'

interface ManagementStatsProps {
  stats: ContainerStats | null
  showOnlyAlerts: boolean
  onToggleAlerts: (show: boolean) => void
}

export default function ManagementStats({ stats, showOnlyAlerts, onToggleAlerts, }: ManagementStatsProps) {
  const statsValues = stats || { total: 0, available: 0, avg_fill: 0, alert_level: 0 }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

      <Card onClick={() => onToggleAlerts(false)} className={`border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white cursor-pointer hover:border-sky-400 active:scale-[0.98] ${!showOnlyAlerts ? 'ring-2 ring-sky-500/10 border-sky-400' : ''}`}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Containers
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">{statsValues.total}</h3>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>


      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Available / Active
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{statsValues.available}</h3>
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
              Average Fill Level
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">{statsValues.avg_fill}%</h3>
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
              Overflow Alerts
            </p>
            <h3 className="text-3xl font-extrabold text-amber-600">{statsValues.alert_level}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
