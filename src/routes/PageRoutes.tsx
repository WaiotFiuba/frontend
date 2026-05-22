

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page'
import Conteiners from '../pages/Containers/page'
import About from '../pages/About/page'
//import RutaProtegida from '../components/RutaProtegida/page'
import { MainLayout } from '../layout/MainLayout'
//import { AdminLayout } from '../layout/AdminLayout'
import { Login } from '../pages/Login/Login'
//import Admin from '../pages/Admin/page'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<Conteiners />} />
                <Route path='/about' element={<About />} />
                <Route path='/login' element={<Login />} />
            </Route>

            {/* <Route path='/admin' element={<AdminLayout />}>
                <Route index element={<Login />}></Route>
                <Route path='/admin' element={
                        <RutaProtegida>
                            <Admin />
                        </RutaProtegida>
                }>
                </Route>
            </Route> */}



        </Routes>
    )
}