"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Home, FileText, Folder, FolderOpen, Film, ChevronRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

export function Sidebar() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["scenes"]))

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="h-12 border-b border-border flex items-center px-4">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Home className="h-4 w-4" />
          <span className="text-sm">项目资源 (PROJECT LOCAL)</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <div className="space-y-1">
            <button
              onClick={() => toggleFolder("scripts")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sidebar-accent text-sm"
            >
              {expandedFolders.has("scripts") ? (
                <ChevronDown className="h-3 w-3 text-primary" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Folder className="h-4 w-4 text-primary" />
              <span>剧本文件</span>
            </button>
            {expandedFolders.has("scripts") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-6 space-y-1"
              >
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>剧本_V1.txt</span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() => toggleFolder("scenes")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sidebar-accent text-sm"
            >
              {expandedFolders.has("scenes") ? (
                <ChevronDown className="h-3 w-3 text-primary" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <FolderOpen className="h-4 w-4 text-primary" />
              <span>场景件</span>
            </button>
            {expandedFolders.has("scenes") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-6 space-y-1"
              >
                <div className="flex items-center gap-2 px-2 py-1 text-sm bg-sidebar-accent rounded">
                  <ChevronDown className="h-3 w-3" />
                  <span>Scene 01</span>
                </div>
                <div className="ml-6 space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                    <Film className="h-3 w-3" />
                    <span>分镜头图 A</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() => toggleFolder("audio")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sidebar-accent text-sm"
            >
              {expandedFolders.has("audio") ? (
                <ChevronDown className="h-3 w-3 text-primary" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Folder className="h-4 w-4 text-primary" />
              <span>音频件</span>
            </button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
