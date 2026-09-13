import { Outlet } from "react-router-dom"
import Header from "../common/Header"
import Footer from "../common/Footer"

export const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header className="relative z-[1001]" />
            <main className="flex-grow ">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}