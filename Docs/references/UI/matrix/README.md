# MATRIX Studio - Electron版本
Platform V14.0 的 Electron 桌面应用版本。

## 项目结构

```项目结构
matrix-studio-electron/
    ├── package.json                 # 项目配置
    ├── README.md                    # 项目说明
    ├── src/
    │   ├── main/                    # 主进程
    │   │   ├── main.js              # 主进程入口
    │   │   └── preload.js           # 预加载脚本
    │   └── renderer/                # 渲染进程
    │       ├── index.html           # 主HTML文件
    │       ├── styles/              # 样式文件
    │       │   ├── variables.css    # CSS变量
    │       │   ├── base.css         # 基础样式
    │       │   ├── layout.css       # 布局样式
    │       │   ├── components.css   # 组件样式
    │       │   ├── views.css        # 视图样式
    │       │   ├── editor.css       # 编辑器样式
    │       │   └── settings.css     # 设置页样式
    │       ├── scripts/             # JavaScript文件
    │       │   ├── utils.js         # 工具函数
    │       │   ├── navigation.js    # 导航模块
    │       │   ├── settings.js      # 设置模块
    │       │   ├── editor.js        # 编辑器模块
    │       │   └── app.js           # 应用入口
    │       └── views/               # HTML视图模板
    │           ├── menu.html        # 左侧菜单
    │           ├── home.html        # 首页
    │           ├── assets.html      # 素材页
    │           ├── plugins.html     # 插件页
    │           ├── settings.html    # 设置页
    │           └── editor.html      # 编辑器页
```

## 安装
```bash
npm install

# 正常运行
npm start

# 开发模式（带DevTools）
npm run dev

# 需要先安装electron-builder
npm install electron-builder --save-dev

# 构建
npm run build


---

## 完整性检查清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `package.json` | ✅ | 项目配置 |
| `src/main/main.js` | ✅ | 主进程 |
| `src/main/preload.js` | ✅ | 预加载脚本 |
| `src/renderer/index.html` | ✅ | 主HTML |
| `src/renderer/styles/variables.css` | ✅ | CSS变量 |
| `src/renderer/styles/base.css` | ✅ | 基础样式 |
| `src/renderer/styles/layout.css` | ✅ | 布局样式 |
| `src/renderer/styles/components.css` | ✅ | 组件样式 |
| `src/renderer/styles/views.css` | ✅ | 视图样式 |
| `src/renderer/styles/settings.css` | ✅ | 设置页样式 |
| `src/renderer/styles/editor.css` | ✅ | 编辑器样式 |
| `src/renderer/scripts/utils.js` | ✅ | 工具函数 |
| `src/renderer/scripts/navigation.js` | ✅ | 导航模块 |
| `src/renderer/scripts/settings.js` | ✅ | 设置模块 |
| `src/renderer/scripts/editor.js` | ✅ | 编辑器模块 |
| `src/renderer/scripts/app.js` | ✅ | 应用入口 |
| `src/renderer/views/menu.html` | ✅ | 菜单视图 |
| `src/renderer/views/home.html` | ✅ | 首页视图 |
| `src/renderer/views/assets.html` | ✅ | 素材视图 |
| `src/renderer/views/plugins.html` | ✅ | 插件视图 |
| `src/renderer/views/settings.html` | ✅ | 设置视图 |
| `src/renderer/views/editor.html` | ✅ | 编辑器视图 |
| `README.md` | ✅ | 项目说明 |

---

## 创建目录的Shell脚本

```bash
#!/bin/bash
# create-structure.sh - 创建项目目录结构

# 创建目录
mkdir -p matrix-studio-electron/src/main
mkdir -p matrix-studio-electron/src/renderer/styles
mkdir -p matrix-studio-electron/src/renderer/scripts
mkdir -p matrix-studio-electron/src/renderer/views

echo "目录结构创建完成！"
echo ""
echo "请按以下顺序创建文件："
echo "1. package.json"
echo "2. src/main/main.js"
echo "3. src/main/preload.js"
echo "4. src/renderer/index.html"
echo "5. src/renderer/styles/*.css (共7个文件)"
echo "6. src/renderer/scripts/*.js (共5个文件)"
echo "7. src/renderer/views/*.html (共6个文件)"
echo "8. README.md"
