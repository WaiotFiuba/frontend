export type DocBlock =
  | {
      type: 'paragraph'
      text: string
    }
  | {
      type: 'steps'
      steps: {
        title: string
        body: string
        tip?: string
      }[]
    }
  | {
      type: 'accordion'
      items: {
        title: string
        body: string
      }[]
    }
  | {
      type: 'note'
      text: string
      variant?: 'info' | 'warning' | 'tip'
    }

export interface DocSection {
  id: string
  title: string
  description: string
  badge?: string
  blocks: DocBlock[]
  suggestedQuestions?: {
    label: string
    targetSectionId: string
    targetRoute?: string
  }[]
}

export type DocumentationRegistry = Record<string, DocSection>
