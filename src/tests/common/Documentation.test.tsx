import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DocumentationProvider, HelpDrawer, HelpButton } from '@/documentation'

const TestApp = ({ initialPath = '/map' }: { initialPath?: string }) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <DocumentationProvider>
      <div data-testid="app-container">
        <header>
          <HelpButton />
        </header>
        <Routes>
          <Route path="/map" element={<div>Página de Mapa</div>} />
          <Route path="/forecast-evaluation" element={<div>Página de Forecaster</div>} />
          <Route path="/optimization" element={<div>Página de Optimización</div>} />
          <Route path="/configurations" element={<div>Página de Configuraciones</div>} />
        </Routes>
        <HelpDrawer />
      </div>
    </DocumentationProvider>
  </MemoryRouter>
)

describe('Contextual Interactive Documentation System', () => {
  beforeEach(async () => {
    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        lng: 'es',
        fallbackLng: 'es',
        resources: {
          es: { translation: {} },
          en: { translation: {} },
        },
      })
    } else {
      await i18n.changeLanguage('es')
    }
  })

  it('renders Help button and opens drawer for /map by default', () => {
    render(<TestApp initialPath="/map" />)

    const helpBtn = screen.getByRole('button', { name: /ayuda/i })
    expect(helpBtn).toBeInTheDocument()

    // Drawer is closed initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Click help button to open drawer
    fireEvent.click(helpBtn)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/Guía del Mapa Interactivo/i)).toBeInTheDocument()
    expect(screen.getByText(/Navegación y Agrupamiento por Zoom/i)).toBeInTheDocument()
    expect(screen.getByText(/Preguntas Frecuentes \(FAQ\)/i)).toBeInTheDocument()
  })

  it('opens drawer with Forecast guide when on /forecast-evaluation', () => {
    render(<TestApp initialPath="/forecast-evaluation" />)

    fireEvent.click(screen.getByRole('button', { name: /ayuda/i }))

    expect(screen.getByText(/Guía de Evaluación del Forecaster/i)).toBeInTheDocument()
    expect(screen.getByText(/Seleccionar el Modelo a Evaluar/i)).toBeInTheDocument()
    expect(screen.getByText(/¿Qué representa el F1 Score por evento\?/i)).toBeInTheDocument()
  })

  it('opens drawer with Optimization guide when on /optimization', () => {
    render(<TestApp initialPath="/optimization" />)

    fireEvent.click(screen.getByRole('button', { name: /ayuda/i }))

    expect(screen.getByText(/Guía de Optimización y Redistribución/i)).toBeInTheDocument()
    expect(screen.getByText(/Ajustar Parámetros de Control/i)).toBeInTheDocument()
    expect(screen.getByText(/Simular Escenario What-If/i)).toBeInTheDocument()
  })

  it('opens drawer with Configurations guide when on /configurations', () => {
    render(<TestApp initialPath="/configurations" />)

    fireEvent.click(screen.getByRole('button', { name: /ayuda/i }))

    expect(screen.getByText(/Guía de Configuraciones/i)).toBeInTheDocument()
    expect(screen.getByText(/Nombrar y Describir el Escenario/i)).toBeInTheDocument()
    expect(screen.getByText(/¿Cómo aplico una configuración guardada en el Mapa\?/i)).toBeInTheDocument()
  })

  it('allows expanding FAQ accordion items', () => {
    render(<TestApp initialPath="/map" />)

    fireEvent.click(screen.getByRole('button', { name: /ayuda/i }))

    const faqQuestion = screen.getByText(/¿Con qué frecuencia se actualiza la información del mapa\?/i)
    expect(faqQuestion).toBeInTheDocument()

    // Answer is not shown yet
    expect(screen.queryByText(/Durante una simulación activa del gemelo digital/i)).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(faqQuestion)
    expect(screen.getByText(/Durante una simulación activa del gemelo digital/i)).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(faqQuestion)
    expect(screen.queryByText(/Durante una simulación activa del gemelo digital/i)).not.toBeInTheDocument()
  })

  it('displays strictly page-specific documentation without cross-section tabs', () => {
    render(<TestApp initialPath="/map" />)

    fireEvent.click(screen.getByRole('button', { name: /ayuda/i }))
    expect(screen.getByText(/Guía del Mapa Interactivo/i)).toBeInTheDocument()

    // No cross-section tabs should exist inside the drawer
    expect(screen.queryByRole('button', { name: /forecaster/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /optimización/i })).not.toBeInTheDocument()
  })

  it('renders in English when language is en', async () => {
    await i18n.changeLanguage('en')
    render(<TestApp initialPath="/map" />)

    const helpBtn = screen.getByRole('button', { name: /help/i })
    expect(helpBtn).toBeInTheDocument()

    fireEvent.click(helpBtn)

    expect(screen.getByText(/Interactive Map Guide/i)).toBeInTheDocument()
    expect(screen.getByText(/Navigation and Zoom Grouping/i)).toBeInTheDocument()
    expect(screen.getByText(/Frequently Asked Questions \(FAQ\)/i)).toBeInTheDocument()
  })
})
