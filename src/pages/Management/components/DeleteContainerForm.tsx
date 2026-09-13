import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { api } from '@/lib/api'
import { BackendContainer } from './types'

interface DeleteContainerFormProps {
  container: BackendContainer
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteContainerForm({ container, onClose, onConfirm }: DeleteContainerFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirmDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.delete(`/map/containers/${container.id}`)
      onConfirm()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError('Error deleting container: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2 w-full">
            <h3 className="text-lg font-bold text-slate-900">Delete Container</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete container <span className="font-mono font-bold text-slate-800">{container.site_id}</span> ({container.site_name || 'No Name'})?
            </p>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 font-medium">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={loading} className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md flex items-center gap-2">
            {loading ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Container'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
