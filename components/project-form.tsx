'use client'

import type { Project } from '@/artifacts/project/schema'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useState } from 'react'

type ProjectFormProps = {
  projectData: Project | null
  onSave: (project: Project) => void
  status: 'streaming' | 'idle'
  metadata?: any
}

export function ProjectForm({ projectData, onSave, status }: ProjectFormProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    topic: '',
    targetAudience: '',
    tone: 'friendly',
    desiredDurationInSeconds: 60,
    callToAction: '',
    aspectRatio: '16:9',
    visualStyle: 'minimalist',
    lineStyle: 'medium',
    colorScheme: 'limited-color',
    backgroundStyle: 'clean-white',
  })

  useEffect(() => {
    if (projectData) {
      setFormData(projectData)
    }
  }, [projectData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 验证必填字段
    if (!formData.topic || !formData.targetAudience || !formData.callToAction) {
      return
    }

    onSave(formData as Project)
  }

  const isFormValid =
    formData.topic && formData.targetAudience && formData.callToAction

  return (
    <div className="h-full overflow-y-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Define the core content and target of the video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={formData.topic || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, topic: e.target.value }))
                }
                placeholder="e.g. Introduction to Quantum Computing"
                disabled={status === 'streaming'}
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience *</Label>
              <Input
                id="targetAudience"
                value={formData.targetAudience || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                placeholder="e.g. High school students, marketing managers, software developers"
                disabled={status === 'streaming'}
              />
            </div>

            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    tone: value as Project['tone'],
                  }))
                }
                disabled={status === 'streaming'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.desiredDurationInSeconds || 60}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    desiredDurationInSeconds: parseInt(e.target.value),
                  }))
                }
                min="30"
                max="300"
                disabled={status === 'streaming'}
              />
            </div>

            <div>
              <Label htmlFor="callToAction">Call to Action *</Label>
              <Textarea
                id="callToAction"
                value={formData.callToAction || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    callToAction: e.target.value,
                  }))
                }
                placeholder="e.g. Visit our website a.com, download our app, subscribe to the channel"
                disabled={status === 'streaming'}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Settings</CardTitle>
            <CardDescription>
              Customize the visual style and appearance of the video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                <Select
                  value={formData.aspectRatio}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      aspectRatio: value as Project['aspectRatio'],
                    }))
                  }
                  disabled={status === 'streaming'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="4:3">4:3 (Traditional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="visualStyle">Visual Style</Label>
                <Select
                  value={formData.visualStyle}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      visualStyle: value as Project['visualStyle'],
                    }))
                  }
                  disabled={status === 'streaming'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="sketch">Sketch</SelectItem>
                    <SelectItem value="doodle">Doodle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lineStyle">Line Style</Label>
                <Select
                  value={formData.lineStyle}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      lineStyle: value as Project['lineStyle'],
                    }))
                  }
                  disabled={status === 'streaming'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thin">Thin</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="thick">Thick</SelectItem>
                    <SelectItem value="varied">Varied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="colorScheme">Color Scheme</Label>
                <Select
                  value={formData.colorScheme}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      colorScheme: value as Project['colorScheme'],
                    }))
                  }
                  disabled={status === 'streaming'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="two-color">Two-color</SelectItem>
                    <SelectItem value="limited-color">Limited color</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="backgroundStyle">Background Style</Label>
              <Select
                value={formData.backgroundStyle}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    backgroundStyle: value as Project['backgroundStyle'],
                  }))
                }
                disabled={status === 'streaming'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean-white">Clean white</SelectItem>
                  <SelectItem value="grid-paper">Grid paper</SelectItem>
                  <SelectItem value="notebook">Notebook</SelectItem>
                  <SelectItem value="digital-whiteboard">
                    Digital whiteboard
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isFormValid || status === 'streaming'}
            className="min-w-24"
          >
            {status === 'streaming' ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
