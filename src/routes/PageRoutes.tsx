

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page.jsx'
import Map from '../pages/Map/page.jsx'
import About from '../pages/About/page.jsx'
import RutaProtegida from '../components/RutaProtegida/page.jsx'
import { MainLayout } from '../layout/MainLayout'
import { AdminLayout } from '../layout/AdminLayout'
import { Login } from '../pages/Login/Login.jsx'
import Admin from '../pages/Admin/page.jsx'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<Map />} />
                <Route path='/about' element={<About />} />
            </Route>

            <Route path='/admin' element={<AdminLayout />}>
                <Route index element={<Login />}></Route>
                <Route path='alta-productos' element={
                        <RutaProtegida>
                            <Admin />
                        </RutaProtegida>
                }>
                </Route>
            </Route>



        </Routes>
    )
}