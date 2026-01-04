# MATRIX Studio UI 设计规范 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 更新 | 精简冗余章节 |
| 1.0.0 | 2025-12-28 | 初始版本 | 完整UI设计规范 |

---

## 设计理念

**赛博朋克暗黑主题（Cyberpunk Dark Theme）** - 专业 AI 视频生成平台

**核心关键词**: 暗黑 | 科技 | 精确 | 专业 | 高对比度 | 电子绿

---

## 色彩系统（OKLCH）

```css
/* 主色调 - 电子绿 */
--primary: oklch(0.85 0.22 160);
--primary-foreground: oklch(0.12 0 0);

/* 基础色彩 */
--background: oklch(0.12 0 0);        /* 深黑背景 */
--foreground: oklch(0.92 0 0);        /* 主文字 */
--card: oklch(0.16 0 0);              /* 卡片背景 */
--border: oklch(0.24 0 0);            /* 边框 */
--destructive: oklch(0.577 0.245 27.325); /* 危险红色 */

/* 侧边栏 */
--sidebar: oklch(0.1 0 0);            /* 更深背景 */
--sidebar-accent: oklch(0.18 0 0);    /* 悬停态 */
```

---

## 字体系统

### 字体族
```css
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### 字号规范
- `text-xs`: 12px（辅助信息、标签）
- `text-sm`: 14px（次要文字、按钮）
- `text-base`: 16px（正文，默认）
- `text-lg`: 18px（小标题）
- `text-xl`: 20px（卡片标题）
- `text-2xl`: 24px（页面标题）

### 字重规范
- `font-normal` (400): 正文
- `font-medium` (500): 小标题、强调
- `font-semibold` (600): 主标题、Logo
- `font-bold` (700): 极少使用

---

## 间距与布局

### 间距系统（4px基准）
```
gap-1: 4px    gap-2: 8px    gap-3: 12px   gap-4: 16px
gap-6: 24px   gap-8: 32px
```

### 圆角系统
```css
--radius: 0.5rem;  /* 8px 基准 */
rounded-sm: 4px    rounded-md: 6px    rounded-lg: 8px
rounded-xl: 12px
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

---

## 组件规范

### 基础技术栈
- **组件库**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS v4
- **动画**: Framer Motion v12+

### 按钮（Button）
```tsx
variant="default"     // 主色按钮（电子绿）
variant="secondary"   // 次要按钮（灰色）
variant="ghost"       // 幽灵按钮（透明）
variant="destructive" // 危险按钮（红色）

size="sm"      // h-8 px-3 text-xs
size="default" // h-10 px-4 py-2
size="lg"      // h-11 px-8
size="icon"    // h-10 w-10
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

---

## 动画系统

### Framer Motion 标准参数

```tsx
// 弹簧动画（主推荐）
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// 悬停缩放
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>

// 淡入淡出
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

// 侧滑面板
<motion.div
  initial={{ x: 300, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: 300, opacity: 0 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
/>
```

---

## 图标系统

**图标库**: lucide-react

**尺寸规范**:
```tsx
h-3 w-3  // 12px - 小型图标（列表项）
h-4 w-4  // 16px - 标准图标（按钮、导航）
h-5 w-5  // 20px - 中型图标
h-6 w-6  // 24px - 大型图标（播放按钮）
```

---

## 无障碍设计（WCAG 2.1）

- **对比度**: 正文 7:1（AAA级），大字体 4.5:1（AA级）
- **焦点指示**: `@apply outline-ring/50;`
- **键盘导航**: Tab / Enter / Escape / Arrow Keys
- **屏幕阅读器**: 使用语义化标签和 `aria-label`

---

## 性能优化

1. **图片**: WebP 格式 + 占位符
2. **懒加载**: 非首屏组件使用 `React.lazy`
3. **动画**: GPU 加速（`transform` / `opacity`）
4. **减少重绘**: 避免频繁修改 layout 属性

---

**English Version**: `docs/en/08-ui-design-specification-v1.1.0.md`
