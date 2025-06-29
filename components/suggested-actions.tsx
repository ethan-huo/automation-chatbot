'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import { motion } from 'framer-motion'
import { memo } from 'react'

import type { VisibilityType } from './visibility-selector'
import { Button } from './ui/button'

interface SuggestedActionsProps {
  chatId: string
  append: UseChatHelpers['append']
  selectedVisibilityType: VisibilityType
}

function PureSuggestedActions({
  chatId,
  append,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Explain the water cycle',
      label: 'with whiteboard animation',
      action: 'Create a whiteboard animation explaining the water cycle',
    },
    {
      title: 'Show photosynthesis process',
      label: 'in an educational video',
      action: 'Generate an educational video about photosynthesis process',
    },
    {
      title: 'Present business ideas',
      label: 'with animated slides',
      action: 'Make an animated presentation for a business pitch',
    },
    {
      title: 'Teach equation solving',
      label: 'through step-by-step animation',
      action: 'Design a tutorial animation showing how to solve equations',
    },
  ]

  return (
    <div
      data-testid="suggested-actions"
      className="grid w-full gap-2 sm:grid-cols-2"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`)

              append({
                role: 'user',
                content: suggestedAction.action,
              })
            }}
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  )
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false

    return true
  },
)
