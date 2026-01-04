# MATRIX Studio UI 设计规范 v1.0.0

> **版本**: 1.0.0 | **更新**: 2025-12-28 | **状态**: 标准规范

---

## 设计理念

**赛博朋克暗黑主题（Cyberpunk Dark Theme）** - 专业 AI 视频生成平台

**核心关键词**: 暗黑 | 科技 | 精确 | 专业 | 高对比度 | 电子绿

---

## 色彩系统

### OKLCH 色彩空间

```css
/* 主色调 - 电子绿 */
--primary: oklch(0.85 0.22 160);
--primary-foreground: oklch(0.12 0 0);

/* 基础色彩 */
--background: oklch(0.12 0 0);        /* 深黑背景 */
--foreground: oklch(0.92 0 0);        /* 主文字 */
--card: oklch(0.16 0 0);              /* 卡片背景 */
--muted: oklch(0.24 0 0);             /* 静默元素 */
--muted-foreground: oklch(0.58 0 0);  /* 次要文字 */
--border: oklch(0.24 0 0);            /* 边框 */
--destructive: oklch(0.577 0.245 27.325);  /* 危险红色 */

/* 侧边栏 */
--sidebar: oklch(0.1 0 0);            /* 更深背景 */
--sidebar-accent: oklch(0.18 0 0);    /* 悬停态 */

/* 图表色板 */
--chart-1: oklch(0.85 0.22 160);      /* 电子绿 */
--chart-2: oklch(0.7 0.18 200);       /* 青蓝 */
--chart-3: oklch(0.75 0.15 280);      /* 紫色 */
--chart-4: oklch(0.8 0.2 120);        /* 黄绿 */
--chart-5: oklch(0.65 0.2 320);       /* 洋红 */
```

### 滚动条样式

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: oklch(0.14 0 0); }
::-webkit-scrollbar-thumb { background: oklch(0.3 0 0); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: oklch(0.4 0 0); }
```

---

## 字体系统

### 字体族

```css
--font-sans: "Inter", system-ui, sans-serif;        /* 主字体 */
--font-mono: "JetBrains Mono", monospace;           /* 等宽字体 */
```

**加载方式**（Electron 环境）:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 字号规范

| 类名 | 尺寸 | 用途 |
|------|------|------|
| `text-xs` | 12px | 辅助信息、标签 |
| `text-sm` | 14px | 次要文字、按钮 |
| `text-base` | 16px | 正文（默认） |
| `text-lg` | 18px | 小标题 |
| `text-xl` | 20px | 卡片标题 |
| `text-2xl` | 24px | 页面标题 |

### 字重规范

- `font-normal` (400): 正文
- `font-medium` (500): 小标题、强调
- `font-semibold` (600): 主标题、Logo
- `font-bold` (700): 极少使用

---

## 间距与布局

### 间距系统（4px 基准）

```
gap-1: 4px    gap-2: 8px    gap-3: 12px   gap-4: 16px
gap-6: 24px   gap-8: 32px
```

### 圆角系统

```css
--radius: 0.5rem;  /* 8px 基准 */
rounded-sm: 4px    rounded-md: 6px    rounded-lg: 8px
rounded-xl: 12px   rounded-full: 50%
```

### 标准布局结构

```
┌─────────────────────────────────┐
│  Header (h-14 / 56px)           │
├──────────┬──────────────────────┤
│ Sidebar  │  Main Content        │
│ (w-64)   │  (flex-1)            │
│ 256px    │                      │
└──────────┴──────────────────────┘
```

### 关键尺寸

- **Header**: `h-14` (56px)
- **Sidebar**: `w-64` (256px)
- **按钮高度**: Small `h-8` (32px) / Default `h-10` (40px) / Large `h-12` (48px)

---

## 组件规范

### 基础技术栈

- **组件库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS v4
- **动画**: Framer Motion v12+

### 按钮（Button）

```tsx
// 变体
variant="default"     // 主色按钮（电子绿）
variant="secondary"   // 次要按钮（灰色）
variant="ghost"       // 幽灵按钮（透明）
variant="destructive" // 危险按钮（红色）

// 尺寸
size="sm"      // h-8 px-3 text-xs
size="default" // h-10 px-4 py-2
size="lg"      // h-11 px-8
size="icon"    // h-10 w-10

// 示例
<Button className="gap-2 bg-primary hover:bg-primary/90">
  <Sparkles className="h-3 w-3" />
  继续生成
</Button>
```

### 卡片（Card）

```tsx
<Card className={cn(
  "cursor-pointer transition-colors",
  isSelected && "ring-2 ring-primary"
)}>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>{/* 内容 */}</CardContent>
</Card>
```

### 侧边栏（Sidebar）

```tsx
<aside className="w-64 border-r border-border bg-sidebar flex flex-col">
  <div className="h-12 border-b border-border">
    {/* Header */}
  </div>
  <ScrollArea className="flex-1">
    {/* 内容 */}
  </ScrollArea>
</aside>

// 导航项
<button className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sidebar-accent text-sm">
```

---

## 动画系统

### Framer Motion 标准参数

```tsx
// 弹簧动画（主推荐）
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// 缓动动画
transition={{ duration: 0.2, ease: "easeInOut" }}
```

### 常用动画模式

```tsx
// 1. 悬停缩放
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>

// 2. 淡入淡出
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

// 3. 侧滑面板
<motion.div
  initial={{ x: 300, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: 300, opacity: 0 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
/>

// 4. 折叠展开
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
/>

// 5. 选项卡切换（layoutId）
{isActive && (
  <motion.div
    layoutId="activeTab"
    className="absolute inset-0 bg-sidebar-accent rounded"
    style={{ zIndex: -1 }}
    transition={{ type: "spring", damping: 25, stiffness: 300 }}
  />
)}
```

### CSS 过渡

```css
.element { @apply transition-colors duration-200; }
```

---

## 图标系统

### 图标库

**lucide-react**

### 尺寸规范

```tsx
h-3 w-3  // 12px - 小型图标（列表项）
h-4 w-4  // 16px - 标准图标（按钮、导航）
h-5 w-5  // 20px - 中型图标
h-6 w-6  // 24px - 大型图标（播放按钮）
```

### Logo 设计

```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
  <span className="text-lg font-semibold tracking-tight">
    MATRIX <span className="text-primary">Studio</span>
  </span>
</div>
```

**特点**: 脉动电子绿圆点 + 双色文字

---

## 响应式设计

### 断点系统

```
sm:  640px   (小型平板)
md:  768px   (平板)
lg:  1024px  (笔记本)
xl:  1280px  (桌面)
2xl: 1536px  (大屏)
```

### 最小分辨率

**1280x720** (HD Ready)

### 响应式示例

```tsx
// Sidebar 响应
<aside className="hidden lg:flex w-64 ...">

// 网格布局
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
```

---

## 无障碍设计

### WCAG 2.1 合规

- **对比度**: 正文 7:1（AAA 级），大字体 4.5:1（AA 级）
- **焦点指示**: `@apply outline-ring/50;`
- **键盘导航**: Tab / Enter / Escape / Arrow Keys
- **屏幕阅读器**: 使用语义化标签和 `aria-label`

```tsx
<Button aria-label="关闭设置面板">
  <X className="h-4 w-4" />
</Button>
```

---

## 实现要求

### 必需依赖

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "framer-motion": "^12.23.26",
    "lucide-react": "latest",
    "tailwindcss": "^4.0.0",
    "@radix-ui/*": "latest"
  }
}
```

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: "var(--color-primary)",
        // ...映射所有 CSS 变量
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 组件命名规范

```
components/
├── ui/              # 基础 UI 组件（shadcn/ui）
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── layout/          # 布局组件
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Layout.tsx
└── features/        # 功能组件
    ├── SceneCard.tsx
    └── WorkflowTabs.tsx
```

### 类型安全

```tsx
interface SceneCardProps {
  scene: Scene;
  isSelected: boolean;
  onSelect: () => void;
}

export function SceneCard({ scene, isSelected, onSelect }: SceneCardProps) {
  // ...
}
```

### 样式组合工具

```tsx
import { cn } from "@/lib/utils";  // clsx + tailwind-merge

<Card className={cn(
  "cursor-pointer transition-colors",
  isSelected && "ring-2 ring-primary",
  className
)}>
```

---

## 性能优化

1. **图片**: WebP 格式 + 占位符
2. **懒加载**: 非首屏组件使用 `React.lazy`
3. **动画**: GPU 加速（`transform` / `opacity`）
4. **减少重绘**: 避免频繁修改 layout 属性

---

## 设计参考

- **Radix Colors**: https://www.radix-ui.com/colors
- **shadcn/ui**: https://ui.shadcn.com
- **Framer Motion**: https://www.framer.com/motion
- **Tailwind CSS v4**: https://tailwindcss.com

---

## 变更日志

### v1.0.0 (2025-12-28)
- ✅ 初始版本发布
- ✅ 基于 V2 设计参考提炼完整规范
- ✅ 定义色彩、字体、间距、组件、动画系统

---

**文档所有者**: MATRIX Studio 设计团队
**审批状态**: ✅ 已批准
**下次审查**: 2026-03-28
