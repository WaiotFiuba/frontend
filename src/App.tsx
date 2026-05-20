
import { BrowserRouter } from 'react-router-dom'
import PageRoutes from './routes/PageRoutes'

export default function App() {

  return (
    <BrowserRouter>

        <div className='main'>
          <PageRoutes />
        </div>

    </BrowserRouter>
  )
}