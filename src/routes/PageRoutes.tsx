

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page'
import Map from '../pages/Map/page'
import SiteDetail from '../pages/SiteDetail/page'
import Management from '../pages/Management/page'
import Configurations from '../pages/Configurations/page'
import Optimization from '../pages/Optimization/page'
import ForecastEvaluation from '../pages/ForecastEvaluation/page'
import RutaProtegida from '../common/RutaProtegida'
import { MainLayout } from '../layout/MainLayout'
import { Login } from '../pages/Login/Login'
import Register from '../pages/Register/page'
import Profile from '../pages/Profile/page'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<RutaProtegida><Map /></RutaProtegida>} />
                <Route path='/map/sites/:siteId' element={<RutaProtegida><SiteDetail /></RutaProtegida>} />
                <Route path='/optimization' element={<RutaProtegida><Optimization /></RutaProtegida>} />
                <Route path='/forecast-evaluation' element={<RutaProtegida><ForecastEvaluation /></RutaProtegida>} />
                <Route path='/management' element={<RutaProtegida><Management /></RutaProtegida>} />
                <Route path='/configurations' element={<RutaProtegida><Configurations /></RutaProtegida>} />
                <Route path='/profile' element={<RutaProtegida><Profile /></RutaProtegida>} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
            </Route>

        </Routes>
    )
}
