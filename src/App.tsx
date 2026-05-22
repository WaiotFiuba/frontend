
import { BrowserRouter } from 'react-router-dom'
import PageRoutes from './routes/PageRoutes'
import { AuthProvider } from './context/AuthContext'

export default function App() {

  return (
    <AuthProvider>
      <BrowserRouter>

          <div className='main'>
            <PageRoutes />
          </div>

      </BrowserRouter>
    </AuthProvider>
  )
}