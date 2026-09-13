import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/common/ui/card'
import { Button } from '@/common/ui/button'
import { RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

interface AddContainerFormProps {
  containerTypes: Array<{ id: number; name: string }>
  onContainerCreated: () => void
  onError: (msg: string | null) => void
  onSuccess: (msg: string | null) => void
}

export default function AddContainerForm({ containerTypes, onContainerCreated, onError, onSuccess }: AddContainerFormProps) {

  const [newSiteId, setNewSiteId] = useState('')
  const [newSiteName, setNewSiteName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [newTypeId, setNewTypeId] = useState('')
  const [creatingContainer, setCreatingContainer] = useState(false)

  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTypeId) return

    setCreatingContainer(false)
    onError(null)
    onSuccess(null)
    setCreatingContainer(true)

    try {
      await api.post('/map/containers/', {
        site_id: newSiteId,
        site_name: newSiteName,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLng),
        container_type_id: parseInt(newTypeId),
        address: newAddress || null,
        description: `Contenedor creado manualmente`,
      })

      onSuccess(`Container '${newSiteId}' registered successfully in the database.`)

      setNewSiteId('')
      setNewSiteName('')
      setNewAddress('')
      setNewLat('')
      setNewLng('')
      setNewTypeId('')

      onContainerCreated()
    } catch (err: unknown) {
      console.error(err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      onError('Error creating container: ' + errorMsg)
    } finally {
      setCreatingContainer(false)
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
        <CardTitle className="text-xl font-bold text-slate-950">Add New Container</CardTitle>
        <CardDescription className="text-slate-500 mt-1">
          Register a localized individual unit in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleCreateContainer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Site ID *</label>
              <input type="text" required placeholder="Ex: SITE-0520" value={newSiteId} onChange={(e) => setNewSiteId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Site Name *</label>
              <input type="text" required placeholder="Ex: Corner Callao & Corrientes" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Address (Optional)</label>
            <input type="text" placeholder="Ex: Av. Callao 400" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Latitude (CABA) *</label>
              <input type="number" step="any" required placeholder="Ex: -34.6037" value={newLat} onChange={(e) => setNewLat(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Longitude (CABA) *</label>
              <input type="number" step="any" required placeholder="Ex: -58.3816" value={newLng} onChange={(e) => setNewLng(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Container Type *</label>
            <select required value={newTypeId} onChange={(e) => setNewTypeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold">
              <option value="">Select a type...</option>
              {containerTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={creatingContainer || containerTypes.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 py-2.5 rounded-lg transition-all">
              {creatingContainer ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />
                  Adding...
                </>
              ) : (
                'Register Container'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
