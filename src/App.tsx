
import { BrowserRouter } from 'react-router-dom'
import PageRoutes from './routes/PageRoutes'
import { AuthProvider } from './context/AuthContext'
import { CityConfigProvider } from './context/CityConfigContext'

export default function App() {

  return (
    <AuthProvider>
      <CityConfigProvider>
        <BrowserRouter>

          <div className='main'>
            <PageRoutes />
          </div>

        </BrowserRouter>
      </CityConfigProvider>
    </AuthProvider>
  )
}