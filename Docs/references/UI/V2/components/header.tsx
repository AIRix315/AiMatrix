"use client"

import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2, Minus, X, Settings } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-4 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-lg font-semibold tracking-tight">
            MATRIX <span className="text-primary">Studio</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">Platform V14.0</div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setIsMaximized(!isMaximized)}
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
