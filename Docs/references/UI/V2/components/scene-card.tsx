"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Play, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

interface Scene {
  id: string
  number: number
  title: string
  description: string
  duration: string
  thumbnail: string
}

interface SceneCardProps {
  scene: Scene
  isSelected: boolean
  onSelect: () => void
}

export function SceneCard({ scene, isSelected, onSelect }: SceneCardProps) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <Card
        className={`overflow-hidden cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={onSelect}
      >
        <div className="relative aspect-video bg-muted">
          <Image src={scene.thumbnail || "/placeholder.svg"} alt={scene.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
              <Play className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono">{scene.duration}</div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <span className="text-muted-foreground">#{scene.number}</span>
              <span>{scene.title}</span>
            </h3>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{scene.description}</p>

          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Sparkles className="h-3 w-3" />
              <span>继续</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
