

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page'
import About from '../pages/About/page'
import Map from '../pages/Map/page'
import Management from '../pages/Management/page'
import RutaProtegida from '../common/RutaProtegida'
import { MainLayout } from '../layout/MainLayout'
import { Login } from '../pages/Login/Login'
import Register from '../pages/Register/page'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<Map />} />
                <Route path='/about' element={<About />} />
                <Route path='/management' element={<RutaProtegida><Management /></RutaProtegida>} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
            </Route>



        </Routes>
    )
}