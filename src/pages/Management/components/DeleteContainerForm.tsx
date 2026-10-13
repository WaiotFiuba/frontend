import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/utils/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/utils/ui/dialog'
import { api } from '@/lib/api'
import { BackendContainer } from './types'

interface DeleteContainerFormProps {
  container: BackendContainer
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteContainerForm({ container, onClose, onConfirm }: DeleteContainerFormProps) {
  const { t } = useTranslation()
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
      setError('Error al eliminar el contenedor: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2 w-full">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg font-bold text-slate-900">{t('management.delete_title')}</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 leading-relaxed mt-1">
                {t('management.delete_confirm')}{' '}
                <span className="font-mono font-bold text-slate-800">{container.site_id}</span>{' '}
                ({container.site_name || 'Sin Nombre'})?
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 font-medium">
                {error}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('common.delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

