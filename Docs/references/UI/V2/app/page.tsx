"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { WorkflowTabs } from "@/components/workflow-tabs"
import { SceneGrid } from "@/components/scene-grid"
import { SettingsPanel } from "@/components/settings-panel"

export default function Home() {
  const [activeTab, setActiveTab] = useState("storyboard")
  const [selectedScene, setSelectedScene] = useState<string | null>(null)

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <WorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 flex overflow-hidden">
            <SceneGrid activeTab={activeTab} selectedScene={selectedScene} onSceneSelect={setSelectedScene} />
            <AnimatePresence>
              {selectedScene && (
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <SettingsPanel sceneId={selectedScene} onClose={() => setSelectedScene(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
