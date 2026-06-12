

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page'
import Conteiners from '../pages/Containers/page'
import About from '../pages/About/page'
import Management from '../pages/Management/page'
import RutaProtegida from '../components/RutaProtegida/page'
import { MainLayout } from '../layout/MainLayout'
import { Login } from '../pages/Login/Login'
import Register from '../pages/Register/page'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route
                    path='/map'
                    element={
                        <Conteiners />
                    }
                />
                <Route path='/about' element={<About />} />
                <Route
                    path='/management'
                    element={
                        <RutaProtegida>
                            <Management />
                        </RutaProtegida>
                    }
                />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
            </Route>



        </Routes>
    )
}