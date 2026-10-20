import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DocSection } from './types'
import { getDocumentationRegistry, getDocumentationForRoute } from './content'

interface DocumentationContextType {
  isOpen: boolean
  activeSectionId: string
  activeSection: DocSection
  availableSections: { id: string; title: string }[]
  openDocumentation: (sectionId?: string) => void
  closeDocumentation: () => void
  toggleDocumentation: () => void
  setActiveSectionId: (id: string) => void
}

const DocumentationContext = createContext<DocumentationContextType | null>(null)

export const DocumentationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang = i18n.language || 'es'

  // Inferir la sección por defecto de la ruta
  const defaultSectionId = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/forecast-evaluation')) return 'forecast'
    if (path.startsWith('/optimization')) return 'optimization'
    if (path.startsWith('/configurations')) return 'configurations'
    return 'map'
  }, [location.pathname])

  const [activeSectionId, setActiveSectionId] = useState<string>(defaultSectionId)

  // Al cambiar de ruta, si el drawer está cerrado o se navega, sincronizar la sección
  useEffect(() => {
    setActiveSectionId(defaultSectionId)
  }, [defaultSectionId])

  const registry = useMemo(() => getDocumentationRegistry(lang), [lang])

  const activeSection = useMemo(() => {
    return registry[activeSectionId] ?? getDocumentationForRoute(location.pathname, lang)
  }, [registry, activeSectionId, location.pathname, lang])

  const availableSections = useMemo(() => {
    return [
      { id: 'map', title: registry.map.title },
      { id: 'forecast', title: registry.forecast.title },
      { id: 'optimization', title: registry.optimization.title },
    ]
  }, [registry])

  const openDocumentation = (sectionId?: string) => {
    if (sectionId && registry[sectionId]) {
      setActiveSectionId(sectionId)
    } else {
      setActiveSectionId(defaultSectionId)
    }
    setIsOpen(true)
  }

  const closeDocumentation = () => {
    setIsOpen(false)
  }

  const toggleDocumentation = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <DocumentationContext.Provider
      value={{
        isOpen,
        activeSectionId,
        activeSection,
        availableSections,
        openDocumentation,
        closeDocumentation,
        toggleDocumentation,
        setActiveSectionId,
      }}
    >
      {children}
    </DocumentationContext.Provider>
  )
}

export const useDocumentation = (): DocumentationContextType => {
  const context = useContext(DocumentationContext)
  if (!context) {
    return {
      isOpen: false,
      activeSectionId: 'map',
      activeSection: {
        id: 'map',
        title: 'Ayuda',
        description: '',
        blocks: [],
      },
      availableSections: [],
      openDocumentation: () => {},
      closeDocumentation: () => {},
      toggleDocumentation: () => {},
      setActiveSectionId: () => {},
    }
  }
  return context
}
