

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page.jsx'
import Conteiners from '../pages/Containers/page.jsx'
import About from '../pages/About/page.jsx'
//import RutaProtegida from '../components/RutaProtegida/page.jsx'
import { MainLayout } from '../layout/MainLayout'
//import { AdminLayout } from '../layout/AdminLayout'
import { Login } from '../pages/Login/Login.jsx'
import Register from '../pages/Register/page.jsx'
//import Admin from '../pages/Admin/page.jsx'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<Conteiners />} />
                <Route path='/about' element={<About />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
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