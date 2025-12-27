"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { FileSearch, Palette, Film, Mic, Download, Grid3x3, List } from "lucide-react"

const tabs = [
  { id: "analysis", label: "国本分析", step: 1, icon: FileSearch },
  { id: "color", label: "场景构色", step: 2, icon: Palette },
  { id: "storyboard", label: "分镜生成", step: 3, icon: Film },
  { id: "voice", label: "配音合成", step: 4, icon: Mic },
  { id: "export", label: "导出", step: 5, icon: Download },
]

interface WorkflowTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function WorkflowTabs({ activeTab, onTabChange }: WorkflowTabsProps) {
  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-4 py-2 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`
                  w-5 h-5 rounded flex items-center justify-center text-xs font-mono
                  ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}
                `}
                >
                  {tab.step}
                </div>
                <span className={`text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-sidebar-accent rounded"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
