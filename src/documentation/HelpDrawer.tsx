import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/utils/ui/button'
import { useDocumentation } from './DocumentationContext'
import { DocBlocks } from './DocBlocks'

export const HelpDrawer: React.FC = () => {
  const {
    isOpen,
    closeDocumentation,
    activeSection,
    setActiveSectionId,
  } = useDocumentation()
  const { i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDocumentation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeDocumentation])

  if (!isOpen) return null

  return (
    <div className="relative z-[1100]">
      {/* Backdrop */}
      <div
        onClick={closeDocumentation}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={activeSection.title}
        className="fixed inset-y-0 right-0 m-2 w-[calc(100%-1rem)] max-w-md sm:max-w-lg h-[calc(100vh-1rem)] bg-white rounded-md border border-slate-200 shadow-md flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 ease-out z-[1101]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {activeSection.title}
              </h3>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeDocumentation}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
              title="Cerrar ayuda"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {activeSection.description}
          </p>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <DocBlocks section={activeSection} onSelectSection={setActiveSectionId} />
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/90 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>{isEn ? 'Waiot FIUBA • Contextual Help' : 'Waiot FIUBA • Ayuda Contextual'}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={closeDocumentation}
            className="text-xs font-semibold cursor-pointer"
          >
            {isEn ? 'Got it' : 'Entendido'}
          </Button>
        </div>
      </div>
    </div>
  )
}
