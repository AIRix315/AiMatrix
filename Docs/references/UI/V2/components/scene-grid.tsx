"use client"

import { SceneCard } from "@/components/scene-card"
import { ScrollArea } from "@/components/ui/scroll-area"

const scenes = [
  {
    id: "1",
    number: 1,
    title: "镜头01",
    description: "赛博朋克城市夜景，霓虹灯，混浊黑暗的街道…",
    duration: "00:00:00",
    thumbnail: "/cyberpunk-city-night-neon.jpg",
  },
  {
    id: "2",
    number: 2,
    title: "镜头02",
    description: "主角特写…",
    duration: "00:00:04",
    thumbnail: "/cyberpunk-character-closeup.jpg",
  },
]

interface SceneGridProps {
  activeTab: string
  selectedScene: string | null
  onSceneSelect: (sceneId: string | null) => void
}

export function SceneGrid({ activeTab, selectedScene, onSceneSelect }: SceneGridProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">3.1 分镜生成</h2>
          <div className="text-xs text-muted-foreground font-mono">3.2 后期编辑</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isSelected={selectedScene === scene.id}
              onSelect={() => onSceneSelect(scene.id === selectedScene ? null : scene.id)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
