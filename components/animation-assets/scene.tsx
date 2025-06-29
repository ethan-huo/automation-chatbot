'use client'

import type { Scene as SceneType } from '@/lib/ai/tools/animation-assets/generate-animation-assets-v2'

import { Shot } from './shot'

type SceneProps = {
  scene: SceneType
}

export function Scene({ scene }: SceneProps) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="mb-3 text-sm font-medium text-foreground">
        Scene {scene.scene_id}: {scene.title}
      </h4>
      <div className="space-y-3">
        {scene.shots.map((shot) => (
          <Shot key={shot.shot_id} shot={shot} sceneId={scene.scene_id} />
        ))}
      </div>
    </div>
  )
}
