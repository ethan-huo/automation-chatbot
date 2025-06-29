import { Artifact } from '@/components/create-artifact'
import { CopyIcon } from '@/components/icons'
import { ProjectForm } from '@/components/project-form'
import { toast } from 'sonner'

import type { Project } from './schema'

type ProjectMetadata = {
  isFormValid?: boolean
  lastUpdated?: string
}

export const projectArtifact = new Artifact<'project', ProjectMetadata>({
  kind: 'project',
  description: 'Useful for creating whiteboard animation projects',

  initialize: async ({ setMetadata }) => {
    setMetadata({
      isFormValid: false,
      lastUpdated: new Date().toISOString(),
    })
  },

  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'project-delta') {
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

  content: ({ content, onSaveContent, status, metadata, setMetadata }) => {
    let projectData: Project | null = null

    try {
      projectData = content ? JSON.parse(content) : null
    } catch (error) {
      console.error('Failed to parse project data:', error)
    }

    return (
      <ProjectForm
        projectData={projectData}
        onSave={(updatedProject: Project) => {
          onSaveContent(JSON.stringify(updatedProject, null, 2), true)
          setMetadata((prev) => ({
            ...prev,
            isFormValid: true,
            lastUpdated: new Date().toISOString(),
          }))
        }}
        status={status}
        metadata={metadata}
      />
    )
  },

  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy project configuration',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content)
        toast.success('Project configuration copied to clipboard!')
      },
    },
  ],

  toolbar: [],
})
