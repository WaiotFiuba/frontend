import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/common/ui/card'
import { Database } from 'lucide-react'
import { BackendContainer } from './types'

interface ContainerTypesCardProps {
  containers: BackendContainer[]
}

export default function ContainerTypesCard({ containers }: ContainerTypesCardProps) {
  const typeCounts = useMemo(() => {
    const counts: Record<
      string,
      { count: number; height_cm: number | null; volume_m3: number | null }
    > = {}
    containers.forEach((c) => {
      const typeName = c.container_type?.name || 'Otro'
      if (!counts[typeName]) {
        counts[typeName] = {
          count: 0,
          height_cm: c.container_type?.height_cm || null,
          volume_m3: c.container_type?.volume_m3 || null,
        }
      }
      counts[typeName].count++
    })
    return Object.entries(counts).map(([name, data]) => ({
      name,
      count: data.count,
      height_cm: data.height_cm,
      volume_m3: data.volume_m3,
    }))
  }, [containers])

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl flex flex-col">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
        <CardTitle className="text-xl font-bold text-slate-950">Tipos de Contenedores</CardTitle>
        <CardDescription className="text-slate-500 mt-1">
          Tipos registrados en el sistema y cantidad de unidades activas de cada uno.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        {typeCounts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
            <Database className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No hay tipos registrados</p>
            <p className="text-xs text-slate-400">
              Genere contenedores primero para inicializar los tipos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {typeCounts.map((type) => (
              <div
                key={type.name}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{type.name}</p>
                  <p className="text-xs text-slate-500">
                    {type.volume_m3 ? `${type.volume_m3} m³` : 'Sin volumen'} •{' '}
                    {type.height_cm ? `${type.height_cm} cm` : 'Sin altura'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-md">
                    Cant.
                  </span>
                  <span className="text-lg font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 min-w-10 text-center">
                    {type.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
