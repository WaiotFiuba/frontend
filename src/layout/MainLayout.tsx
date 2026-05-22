import { Outlet } from "react-router-dom"
import Header from "../components/Header/page"
import Footer from "../components/Footer/page"

export const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}