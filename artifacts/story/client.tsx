import { Artifact } from '@/components/create-artifact'
import { CopyIcon } from '@/components/icons'
import { Markdown } from '@/components/markdown'
import { toast } from 'sonner'

import type { Story } from './schema'

type StoryMetadata = {
  lastUpdated?: string
}

const generateStoryMarkdown = (story: Story): string => {
  const totalDuration = story.scenes.reduce(
    (sum, scene) => sum + scene.scene_duration,
    0,
  )

  let markdown = `# ${story.title}

**Script ID:** ${story.script_id}
**Total Duration:** ${totalDuration} seconds
**Number of Scenes:** ${story.scenes.length}

---

`

  story.scenes.forEach((scene, index) => {
    markdown += `## Scene ${scene.scene_id}

**Duration:** ${scene.scene_duration} seconds

### Narration
${scene.narration_text}

### Visual Concept
${scene.visual_concept_prompt}

${index < story.scenes.length - 1 ? '---\n\n' : ''}
`
  })

  return markdown
}

export const storyArtifact = new Artifact<'story', StoryMetadata>({
  kind: 'story',
  description:
    'Useful for creating whiteboard animation scripts with scenes and narration',

  initialize: async ({ setMetadata }) => {
    setMetadata({
      lastUpdated: new Date().toISOString(),
    })
  },

  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'story-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }))

      setMetadata((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
      }))
    }
  },

  content: ({ content, status }) => {
    let scriptData: Story | null = null

    try {
      scriptData = content ? JSON.parse(content) : null
    } catch (error) {
      console.error('Failed to parse script data:', error)
    }

    if (!scriptData) {
      return (
        <div className="h-full overflow-y-auto p-6">
          <div className="text-muted-foreground text-center">
            {status === 'streaming'
              ? 'Generating script...'
              : 'No script data available'}
          </div>
        </div>
      )
    }

    const markdownContent = generateStoryMarkdown(scriptData)

    return (
      <div className="h-full overflow-y-auto p-6">
        <Markdown>{markdownContent}</Markdown>
      </div>
    )
  },

  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy script content',
      onClick: ({ content }) => {
        try {
          const scriptData: Story = JSON.parse(content)
          const markdownContent = generateStoryMarkdown(scriptData)
          navigator.clipboard.writeText(markdownContent)
          toast.success('Script content copied to clipboard!')
        } catch (error) {
          navigator.clipboard.writeText(content)
          toast.success('Raw script data copied to clipboard!')
        }
      },
    },
  ],

  toolbar: [],
})
