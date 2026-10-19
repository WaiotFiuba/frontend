import React from 'react'
import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/utils/ui/button'
import { useDocumentation } from './DocumentationContext'

interface HelpButtonProps {
  sectionId?: string
  variant?: 'outline' | 'ghost' | 'default'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  sectionId,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const { openDocumentation } = useDocumentation()
  const { i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const label = isEn ? 'Help' : 'Ayuda'

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => openDocumentation(sectionId)}
      className={`cursor-pointer gap-1.5 font-semibold transition-all ${className}`}
      title={label}
      aria-label={label}
    >
      <HelpCircle className="h-4 w-4 text-sky-600" />
      {showLabel && <span>{label}</span>}
    </Button>
  )
}
