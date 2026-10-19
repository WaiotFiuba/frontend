import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  Info,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  BookOpen,
} from 'lucide-react'
import type { DocSection } from './types'

export const DocBlocks: React.FC<{
  section: DocSection
  onSelectSection?: (sectionId: string) => void
}> = ({ section, onSelectSection }) => {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')

  return (
    <div className="space-y-6">
      {section.blocks.map((block, idx) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={idx} className="text-sm leading-relaxed text-slate-600">
                {block.text}
              </p>
            )

          case 'steps':
            return (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <BookOpen className="h-4 w-4 text-sky-600" />
                  <span>{isEn ? 'Step-by-step guide' : 'Guía paso a paso'}</span>
                </div>
                <div className="space-y-3">
                  {block.steps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                      {step.tip && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-800 border border-sky-100">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-sky-600 mt-0.5" />
                          <span>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )

          case 'note': {
            const isWarning = block.variant === 'warning'
            const isTip = block.variant === 'tip'
            const bgClass = isWarning
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : isTip
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-sky-50 border-sky-200 text-sky-800'
            const Icon = isWarning ? AlertTriangle : isTip ? Lightbulb : Info

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${bgClass}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{block.text}</span>
              </div>
            )
          }

          case 'accordion':
            return (
              <div key={idx} className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <HelpCircle className="h-4 w-4 text-sky-600" />
                  <span>{isEn ? 'Frequently Asked Questions (FAQ)' : 'Preguntas Frecuentes (FAQ)'}</span>
                </div>
                <div className="space-y-2">
                  {block.items.map((item, aIdx) => (
                    <AccordionItem key={aIdx} title={item.title} body={item.body} />
                  ))}
                </div>
              </div>
            )

          default:
            return null
        }
      })}

      {section.suggestedQuestions && section.suggestedQuestions.length > 0 && (
        <div className="pt-4 border-t border-slate-200/80 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isEn ? 'Suggested topics' : 'Temas sugeridos'}
          </p>
          <div className="space-y-1.5">
            {section.suggestedQuestions.map((q, qIdx) => (
              <button
                key={qIdx}
                type="button"
                onClick={() => {
                  if (q.targetRoute) {
                    navigate(q.targetRoute)
                  }
                  if (onSelectSection) {
                    onSelectSection(q.targetSectionId)
                  }
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-sky-700 bg-sky-50/70 hover:bg-sky-100 hover:text-sky-900 rounded-lg border border-sky-100 transition-colors cursor-pointer group"
              >
                <span>{q.label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sky-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const AccordionItem: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left text-xs font-bold text-slate-800 hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-600' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1 text-xs leading-relaxed text-slate-600 border-t border-slate-100/70 bg-slate-50/40">
          {body}
        </div>
      )}
    </div>
  )
}
