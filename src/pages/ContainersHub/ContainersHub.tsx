import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { BackendContainer } from '../Management/components/types'
import Map from '../Containers/page'
import Management from '../Management/page'
import RutaProtegida from '../../components/RutaProtegida'

export default function ContainersHub() {
    const location = useLocation()
    const [containers, setContainers] = useState<BackendContainer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadContainers = async () => {
        setLoading(true)
        setError(null)
        try {
            // Se usa el endpoint de bbox con coordenadas globales a zoom 18 para obtener los puntos individuales para administración
            const data = await api.get<BackendContainer[]>(
                `/map/containers/bbox?lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&zoom=18&limit=1000&t=${Date.now()}`
            )
            setContainers(data)
        } catch (err: any) {
            console.error(err)
            setError(
                'Error connecting to the containers database. Please make sure the backend and database are running.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (location.pathname === '/management') {
            loadContainers()
        }
    }, [location.pathname])

    if (location.pathname === '/management') {
        return (
            <RutaProtegida>
                <Management
                    containers={containers}
                    loading={loading}
                    error={error}
                    loadContainers={loadContainers}
                    setContainers={setContainers}
                />
            </RutaProtegida>
        )
    }

    return (
        <Map
            containers={containers}
            loading={loading}
            error={error}
            loadContainers={loadContainers}
        />
    )
}
