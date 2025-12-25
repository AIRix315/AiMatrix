# Electron常见白屏问题及解决
---

### 🔴 核心诊断：截图中的问题分析

**现象：** 控制台报错 `Uncaught ReferenceError: require is not defined`。
**定位：** 这是最典型的 Electron **安全策略与渲染进程配置冲突**。

#### 原因深度解析
在 Electron 5.0 之后（尤其是 v12+），官方为了安全性，默认禁用了渲染进程中的 Node.js 集成。
也就是说，你的 React/Vue 代码（渲染进程）试图调用 `require`（CommonJS 语法）或者 Webpack 打包后的代码依赖 `require` 来加载模块，但浏览器环境（Chromium）本身是不认识 `require` 的，只有 Node.js 环境认识。

#### 🛠️ 解决方案（三种方案，按推荐程度排序）

**方案一：开启 Node 集成（快速解决开发问题，但安全性较低）**
这是最直接能消除你截图中报错的方法。在你的**主进程**（通常是 `main.js` 或 `index.js`）创建 `BrowserWindow` 的地方，修改 `webPreferences` 配置：

```javascript
const mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    // 开启 Node 集成，允许在渲染进程使用 require
    nodeIntegration: true, 
    // 关闭上下文隔离 (Electron 12+ 默认是 true，必须关掉才能让 nodeIntegration 生效)
    contextIsolation: false, 
    // 如果你使用了 remote 模块，可能还需要开启这个
    enableRemoteModule: true,
  }
});
```
*注意：修改主进程代码后，必须重启 Electron 应用（不仅仅是刷新页面）。*

**方案二：调整 Webpack/Vite 配置（工程化思维）**
如果你使用的是 Webpack，你的打包目标（Target）可能配置错了。如果不告诉 Webpack 这是 Electron 环境，它会以为是纯 Web 环境，从而导致 `require` 处理异常。
在 `webpack.config.js` 中添加或修改：
```javascript
module.exports = {
  // ...
  target: 'electron-renderer', // 或者 'electron-main' 视具体文件而定
  // ...
};
```

**方案三：使用 ContextBridge（最佳实践，设计师思维的优雅架构）**
不直接在页面用 `require`，而是通过 `preload.js` 充当“桥梁”，将需要的方法暴露给渲染进程。这是 Electron 官方推荐的安全做法，但改动成本较高，建议先用方案一跑通，后期再重构。

---

### 🧐 深度复盘：Electron 白屏的“全景地图”

除了截图中的 `require` 问题，作为资深工程师，我为你总结了白屏的**五大核心诱因**及排查逻辑：

#### 1. 路由与路径配置错误（由实变虚）
*   **现象：** 控制台无报错，或者报 404 (Not Found)。
*   **原因：**
    *   **开发环境：** `loadURL('http://localhost:3000')` 没连上，React/Vue 服务没启动。
    *   **生产环境：** 打包后通常使用 `loadFile`。如果你的前端框架（React/Vue）打包时的 `publicPath` 或 `base` 设置为绝对路径 `/`，在 Electron 协议（`file://`）下会找不到资源。
*   **解决：** 生产环境打包时，需将资源引用路径改为相对路径 `./`。

#### 2. 渲染进程 JS 崩溃（逻辑阻断）
*   **现象：** 类似你截图中的情况，控制台有红色报错。
*   **原因：** 前端框架在挂载（Mount）之前就抛出了异常，导致 `<div id="root"></div>` 内容没渲染出来。
*   **常见点：**
    *   使用了未定义的变量。
    *   使用了浏览器不支持的语法（如顶层 `await` 但构建工具没配置好）。
    *   **Native 模块报错：** 引入了 `fs`、`path` 等 Node 模块但未配置 Webpack Polyfill 或 `nodeIntegration`。

#### 3. Preload 脚本加载失败（桥梁断裂）
*   **现象：** 屏幕一片白，控制台可能报IPC相关错误，或者 `window.myAPI` undefined。
*   **原因：** `preload.js` 文件中有语法错误。注意：Preload 脚本执行失败会直接导致渲染进程后续脚本不仅载，直接白屏。
*   **排查：** 查看终端（Terminal）是否有主进程报错，或者在 DevTools 顶部查看是否有 Preload 相关的 Error。

#### 4. 本地模块（Native Modules）编译问题
*   **现象：** 开发运行正常，打包安装后白屏。
*   **原因：** 比如使用了 `sqlite3`、`serialport` 等 C++ 扩展模块。它们需要针对 Electron 的 Node 版本进行重编译（`electron-rebuild`），否则会导致加载失败进而白屏。

#### 5. CSP（内容安全策略）限制
*   **现象：** 你的截图中那个黄色的警告 `Security Warning`。
*   **原因：** 虽然通常只是警告，但如果 CSP 设置得太严格（例如禁止了 `script-src 'self'` 或者 `unsafe-eval`），会导致 Webpack 的 HMR（热更新）机制或某些 eval 代码无法执行，导致白屏。

---

### 💡 工程师的调试锦囊

遇到白屏，不要慌，按这个 SOP（标准作业程序）操作：

1.  **看控制台 (DevTools)：** `Ctrl+Shift+I` (Win) / `Cmd+Opt+I` (Mac)。看 Console 里的红字。（你已经做到了这一步，很棒！）
2.  **看终端 (Terminal)：** 主进程的报错不会显示在浏览器控制台，而是在启动 Electron 的命令行窗口里。
3.  **钩子函数检测：**
    在主进程监听崩溃事件，辅助定位：
    ```javascript
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('页面加载失败:', errorCode, errorDescription);
    });
  
    mainWindow.webContents.on('crashed', () => {
        console.error('渲染进程崩溃了！');
    });
    ```

**总结建议：**
针对你当前的截图，请优先尝试 **方案一（修改 webPreferences）**。这通常能立即解决 `require is not defined` 的问题，让你先看到画面，然后再去优化架构。

如有其他报错，欢迎继续把错误信息发给我！ 🚀

---

### 第一部分：渲染进程 JS 崩溃 (Render Process Crashes)

这是白屏最常见的原因，通常是因为代码逻辑在 UI 渲染完成前就抛出了异常，导致挂载点（如 `<div id="root"></div>`）依然是空的。

#### 1. 如何精准排查（侦探模式）

**A. 抓住“红字”现场**
*   **现象：** 打开 DevTools (F12)，Console 面板有红色报错。
*   **重点关注：** `Uncaught TypeError`, `Uncaught ReferenceError`。
*   **关键动作：** 报错信息通常会指向 `bundle.js` 的某一行。但在开发模式下，如果你配置了 SourceMap，它应该能指向你源码的具体文件（例如 `App.vue:25` 或 `Home.tsx:14`）。

**B. 框架生命周期排查**
Electron 应用通常包裹着 React/Vue/Angular。白屏往往发生在框架的**初始化阶段**。
*   **React:** 检查 `ReactDOM.render` 或 `createRoot` 之前的代码。如果在 `render` 之前引用了 `undefined` 的变量，页面必白。
*   **Vue:** 检查 `new Vue()` 或 `createApp()` 以及 `created`/`mounted` 钩子里的代码。

**C. 异步陷阱 (Async/Await)**
*   **场景：** 在组件挂载时请求本地文件或数据库。
*   **错误逻辑：** 如果没有 `try/catch` 包裹，且 Promise 被 reject，现代框架可能会直接卸载整个组件树导致白屏。
*   **排查技巧：** 在主入口文件顶部添加全局错误监听，防止错误被吞没：
    ```javascript
    // 在 renderer/index.js (或者 main.ts) 的最顶部
    window.addEventListener('error', (event) => {
        console.error('全局捕获错误:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未捕获的 Promise 异常:', event.reason);
    });
    ```

#### 2. 常见 JS 崩溃场景与对策

*   **场景一：使用了浏览器没有的 API**
    *   *错误：* 在渲染进程直接写 `const fs = require('fs')` (在未开启 Node 集成时)。
    *   *解决：* 使用 `preload.js` 暴露 API，或按上一条回答开启 `nodeIntegration`。
*   **场景二：Webpack 环境变量注入失败**
    *   *错误：* 代码里用了 `process.env.API_URL`，但打包后 `process` 对象不存在。
    *   *解决：* 使用 Webpack 的 `DefinePlugin` 或 Vite 的 `loadEnv` 显式注入变量。
*   **场景三：路由模式错误**
    *   *错误：* 使用了 `BrowserRouter` (依赖 History API 和服务端支持)，在 Electron 的 `file://` 协议下刷新页面会导致路径解析失败，JS 执行异常。
    *   *解决：* Electron 项目必须使用 `HashRouter` (React) 或 `createWebHashHistory` (Vue)。

---

### 第二部分：CSP (内容安全策略) 限制

CSP 是浏览器的安全机制，目的是防止 XSS 攻击。但在 Electron 开发中，它往往是导致白屏的“隐形杀手”，特别是你的截图里已经出现了相关警告。

#### 1. 为什么 CSP 会导致白屏？

*   **开发环境的冲突：** Webpack/Vite 在开发模式下（Hot Module Replacement），为了快速构建，通常会使用 `eval()` 来执行模块代码（`devtool: 'eval-source-map'`）。
*   **拦截机制：** 默认的安全 CSP 策略通常禁止 `unsafe-eval` 和 `unsafe-inline`。
*   **结果：** 浏览器拒绝执行 Webpack 生成的 JS 代码，导致脚本加载被阻断，页面全白。控制台通常会报：
    > `Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive...`

#### 2. 如何排查 CSP 问题？

**A. 检查 Meta 标签**
打开你的 `public/index.html`，查看是否有类似标签：
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
```

**B. 查看 Network 和 Console 头部**
有些 CSP 是通过 HTTP 响应头（如果是加载远程 URL）或 Electron 的 `session` 设置注入的。查看控制台不仅要有 Error，还要看 Warnings（黄色感叹号），通常 CSP 违规会先警告再拦截。

#### 3. 针对性解决方案

**方案 A：开发环境放宽策略（推荐）**
在开发阶段，为了让 HMR 热更新和调试工具正常工作，我们需要允许 `unsafe-eval`。

修改 `public/index.html` 中的 Meta 标签：
```html
<!-- 开发环境 CSP 配置 -->
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self' 'unsafe-inline'; 
    script-src 'self' 'unsafe-eval' 'unsafe-inline'; 
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
  "
>
```
*解释：`script-src 'unsafe-eval'` 允许了 Webpack 运行 eval 代码，解决了白屏问题。*

**方案 B：生产环境收紧策略**
打包上线时，为了安全，应该去掉 `unsafe-eval`。你可以在构建脚本中动态替换这个 Meta 标签，或者让 Webpack 在生产打包时不使用 `eval` 类型的 source-map。

**方案 C：Electron 层面控制**
如果在 `index.html` 里找不到 meta 标签，可能是 Electron 主进程拦截了请求并添加了头部。
检查主进程代码：
```javascript
const { session } = require('electron');

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': ["script-src 'self' 'unsafe-eval'"] // 可以在这里动态调整
    }
  });
});
```

### 👨‍💻 资深工程师总结

*   **遇到 JS 崩溃**：先看 Console 红字，再看路由模式（Hash vs History），最后查全局 Promise 异常。
*   **遇到 CSP 问题**：只要看到 `Refused to evaluate` 或 `Refused to load`，第一时间去检查 `index.html` 里的 `<meta>` 标签。**开发环境允许 `unsafe-eval` 是 Electron 开发的潜规则。**

建议你现在立刻去检查一下你的 `index.html`，加上 `script-src 'self' 'unsafe-eval' 'unsafe-inline'`，配合上一条建议开启 `nodeIntegration`，你的白屏问题应该就能迎刃而解了。