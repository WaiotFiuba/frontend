

import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/page'
import About from '../pages/About/page'
import ContainersHub from '../pages/ContainersHub/ContainersHub'
import { MainLayout } from '../layout/MainLayout'
import { Login } from '../pages/Login/Login'
import Register from '../pages/Register/page'

export default function PageRoutes() {

    return (
        <Routes>

            <Route element={<MainLayout />}>
                <Route path='/' element={<Home />} />
                <Route path='/map' element={<ContainersHub />} />
                <Route path='/about' element={<About />} />
                <Route path='/management' element={<ContainersHub />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
            </Route>



        </Routes>
    )
}