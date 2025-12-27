"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { X, Sparkles, ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SettingsPanelProps {
  sceneId: string
  onClose: () => void
}

export function SettingsPanel({ sceneId, onClose }: SettingsPanelProps) {
  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col">
      <div className="h-14 border-b border-border flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold">属性</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">检查器</Label>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <span>当前镜头</span>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground bg-transparent">
                <span>自动全部</span>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground bg-transparent">
                <span>全部设置</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">
                当前镜头 - 镜头01
              </Label>
              <Card className="p-3 space-y-3 bg-secondary/50">
                <div className="space-y-2">
                  <Label className="text-xs">Prompt</Label>
                  <Input placeholder="Cyberpunk city..." className="font-mono text-xs" />
                </div>
              </Card>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                生成设置 (GENERATION SETTINGS)
              </Label>

              <div className="space-y-2">
                <Label className="text-xs">模型</Label>
                <Select defaultValue="sora-v2">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sora-v2">Sora v2 (Cloud)</SelectItem>
                    <SelectItem value="runway">Runway Gen-3</SelectItem>
                    <SelectItem value="pika">Pika 2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">步数</Label>
                  <span className="text-xs text-muted-foreground font-mono">30</span>
                </div>
                <Slider defaultValue={[30]} max={100} step={1} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">CFG</Label>
                  <Input type="number" defaultValue="7.0" className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">种子 (Seed)</Label>
                  <Input type="number" defaultValue="-1" className="font-mono text-xs" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">关联资产 (LINKED ASSETS)</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <ImageIcon className="h-3 w-3" />
                  <span className="text-xs">Global CyberStyle_v2</span>
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <ImageIcon className="h-3 w-3" />
                  <span className="text-xs">Proj: Hero-face</span>
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">预估时间</Label>
              <div className="text-sm font-mono text-primary">$0.04</div>
            </div>
          </div>

          <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
            <Sparkles className="h-4 w-4" />
            <span>生成 (GENERATE)</span>
          </Button>
        </div>
      </ScrollArea>
    </aside>
  )
}
