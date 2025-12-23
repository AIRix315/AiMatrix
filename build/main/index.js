/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main/index.ts"
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _window__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./window */ \"./src/main/window.ts\");\n/* harmony import */ var _ipc_channels__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ipc/channels */ \"./src/main/ipc/channels.ts\");\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/project-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/asset-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/plugin-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/task-scheduler'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/api-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\n\n\n\n\n\n\n\n\nclass MatrixApp {\n    constructor() {\n        this.windowManager = new _window__WEBPACK_IMPORTED_MODULE_1__.WindowManager();\n        this.ipcManager = new _ipc_channels__WEBPACK_IMPORTED_MODULE_2__.IPCManager();\n        this.projectManager = new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/project-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();\n        this.assetManager = new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/asset-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();\n        this.pluginManager = new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/plugin-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();\n        this.taskScheduler = new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/task-scheduler'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();\n        this.apiManager = new Object(function webpackMissingModule() { var e = new Error(\"Cannot find module './services/api-manager'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();\n        this.initializeEventListeners();\n    }\n    initializeEventListeners() {\n        // 应用就绪事件\n        electron__WEBPACK_IMPORTED_MODULE_0__.app.whenReady().then(() => {\n            this.onReady();\n        });\n        // 所有窗口关闭事件\n        electron__WEBPACK_IMPORTED_MODULE_0__.app.on('window-all-closed', () => {\n            if (process.platform !== 'darwin') {\n                electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();\n            }\n        });\n        // 应用激活事件\n        electron__WEBPACK_IMPORTED_MODULE_0__.app.on('activate', () => {\n            if (electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow.getAllWindows().length === 0) {\n                this.windowManager.createMainWindow();\n            }\n        });\n        // 应用退出前事件\n        electron__WEBPACK_IMPORTED_MODULE_0__.app.on('before-quit', async () => {\n            await this.cleanup();\n        });\n    }\n    async onReady() {\n        try {\n            // 初始化服务\n            await this.initializeServices();\n            // 创建主窗口\n            this.windowManager.createMainWindow();\n            // 设置IPC处理器\n            this.setupIPCHandlers();\n            console.log('Matrix AI Workflow 应用启动成功');\n        }\n        catch (error) {\n            console.error('应用启动失败:', error);\n            electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();\n        }\n    }\n    async initializeServices() {\n        await this.projectManager.initialize();\n        await this.assetManager.initialize();\n        await this.pluginManager.initialize();\n        await this.taskScheduler.initialize();\n        await this.apiManager.initialize();\n    }\n    setupIPCHandlers() {\n        // 项目相关IPC处理\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('project:create', (_, name, template) => this.projectManager.createProject(name, template));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('project:load', (_, projectId) => this.projectManager.loadProject(projectId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('project:save', (_, projectId, config) => this.projectManager.saveProject(projectId, config));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('project:delete', (_, projectId) => this.projectManager.deleteProject(projectId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('project:list', () => this.projectManager.listProjects());\n        // 物料相关IPC处理\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('asset:add', (_, projectId, assetData) => this.assetManager.addAsset(projectId, assetData));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('asset:remove', (_, projectId, assetId) => this.assetManager.removeAsset(projectId, assetId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('asset:update', (_, projectId, assetId, updates) => this.assetManager.updateAsset(projectId, assetId, updates));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('asset:search', (_, projectId, query) => this.assetManager.searchAssets(projectId, query));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('asset:preview', (_, projectId, assetId) => this.assetManager.getAssetPreview(projectId, assetId));\n        // 插件相关IPC处理\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('plugin:install', (_, pluginPackage) => this.pluginManager.installPlugin(pluginPackage));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('plugin:uninstall', (_, pluginId) => this.pluginManager.uninstallPlugin(pluginId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('plugin:load', (_, pluginId) => this.pluginManager.loadPlugin(pluginId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('plugin:execute', (_, pluginId, action, params) => this.pluginManager.executePluginAction(pluginId, action, params));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('plugin:list', () => this.pluginManager.listPlugins());\n        // 任务相关IPC处理\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('task:create', (_, config) => this.taskScheduler.createTask(config));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('task:execute', (_, taskId, inputs) => this.taskScheduler.executeTask(taskId, inputs));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('task:status', (_, executionId) => this.taskScheduler.getTaskStatus(executionId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('task:cancel', (_, executionId) => this.taskScheduler.cancelTask(executionId));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('task:results', (_, executionId) => this.taskScheduler.getTaskResults(executionId));\n        // API相关IPC处理\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('api:call', (_, name, params) => this.apiManager.callAPI(name, params));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('api:set-key', (_, name, key) => this.apiManager.setAPIKey(name, key));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('api:get-status', (_, name) => this.apiManager.getAPIStatus(name));\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('api:get-usage', (_, name) => this.apiManager.getAPIUsage(name));\n    }\n    async cleanup() {\n        try {\n            await this.projectManager.cleanup();\n            await this.assetManager.cleanup();\n            await this.pluginManager.cleanup();\n            await this.taskScheduler.cleanup();\n            await this.apiManager.cleanup();\n            console.log('应用清理完成');\n        }\n        catch (error) {\n            console.error('应用清理失败:', error);\n        }\n    }\n}\n// 创建应用实例\nconst matrixApp = new MatrixApp();\n\n\n//# sourceURL=webpack://matrix-ai-workflow/./src/main/index.ts?\n}");

/***/ },

/***/ "./src/main/ipc/channels.ts"
/*!**********************************!*\
  !*** ./src/main/ipc/channels.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IPCManager: () => (/* binding */ IPCManager),\n/* harmony export */   IPC_CHANNELS: () => (/* binding */ IPC_CHANNELS)\n/* harmony export */ });\nconst IPC_CHANNELS = {\n    // 项目相关\n    PROJECT_CREATE: 'project:create',\n    PROJECT_LOAD: 'project:load',\n    PROJECT_SAVE: 'project:save',\n    PROJECT_DELETE: 'project:delete',\n    PROJECT_LIST: 'project:list',\n    // 工作流相关\n    WORKFLOW_EXECUTE: 'workflow:execute',\n    WORKFLOW_STATUS: 'workflow:status',\n    WORKFLOW_CANCEL: 'workflow:cancel',\n    WORKFLOW_LIST: 'workflow:list',\n    WORKFLOW_SAVE: 'workflow:save',\n    WORKFLOW_LOAD: 'workflow:load',\n    // 资产相关\n    ASSET_UPLOAD: 'asset:upload',\n    ASSET_DELETE: 'asset:delete',\n    ASSET_LIST: 'asset:list',\n    ASSET_METADATA: 'asset:metadata',\n    // MCP服务相关\n    MCP_CONNECT: 'mcp:connect',\n    MCP_DISCONNECT: 'mcp:disconnect',\n    MCP_CALL: 'mcp:call',\n    MCP_STATUS: 'mcp:status',\n    MCP_LIST: 'mcp:list',\n    // 本地服务相关\n    LOCAL_START: 'local:start',\n    LOCAL_STOP: 'local:stop',\n    LOCAL_STATUS: 'local:status',\n    LOCAL_RESTART: 'local:restart',\n    // 文件系统相关\n    FILE_READ: 'file:read',\n    FILE_WRITE: 'file:write',\n    FILE_DELETE: 'file:delete',\n    FILE_EXISTS: 'file:exists',\n    FILE_LIST: 'file:list',\n    FILE_WATCH: 'file:watch',\n    FILE_UNWATCH: 'file:unwatch',\n    // 窗口相关\n    WINDOW_MINIMIZE: 'window:minimize',\n    WINDOW_MAXIMIZE: 'window:maximize',\n    WINDOW_CLOSE: 'window:close',\n    WINDOW_IS_MAXIMIZED: 'window:isMaximized',\n    // 应用相关\n    APP_VERSION: 'app:version',\n    APP_QUIT: 'app:quit',\n    APP_RESTART: 'app:restart',\n    // 事件通知\n    EVENT_WORKFLOW_PROGRESS: 'event:workflow:progress',\n    EVENT_WORKFLOW_COMPLETED: 'event:workflow:completed',\n    EVENT_WORKFLOW_ERROR: 'event:workflow:error',\n    EVENT_FILE_CHANGED: 'event:file:changed',\n    EVENT_SERVICE_STATUS: 'event:service:status'\n};\nclass IPCManager {\n    constructor() {\n        this.channels = new Map();\n    }\n    register(channel, handler) {\n        if (!this.channels.has(channel)) {\n            this.channels.set(channel, []);\n        }\n        this.channels.get(channel).push(handler);\n    }\n    unregister(channel, handler) {\n        const handlers = this.channels.get(channel);\n        if (handlers) {\n            const index = handlers.indexOf(handler);\n            if (index > -1) {\n                handlers.splice(index, 1);\n            }\n        }\n    }\n    getHandlers(channel) {\n        return this.channels.get(channel) || [];\n    }\n    clear() {\n        this.channels.clear();\n    }\n}\n\n\n//# sourceURL=webpack://matrix-ai-workflow/./src/main/ipc/channels.ts?\n}");

/***/ },

/***/ "./src/main/window.ts"
/*!****************************!*\
  !*** ./src/main/window.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   WindowManager: () => (/* binding */ WindowManager)\n/* harmony export */ });\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);\n\n\nclass WindowManager {\n    constructor() {\n        this.mainWindow = null;\n    }\n    createMainWindow() {\n        const { width, height } = electron__WEBPACK_IMPORTED_MODULE_0__.screen.getPrimaryDisplay().workAreaSize;\n        this.mainWindow = new electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow({\n            width: Math.min(1200, width - 100),\n            height: Math.min(800, height - 100),\n            minWidth: 800,\n            minHeight: 600,\n            webPreferences: {\n                nodeIntegration: false,\n                contextIsolation: true,\n                preload: path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, 'preload.js')\n            },\n            icon: path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, '../../resources/icons/icon.png'),\n            show: false,\n            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'\n        });\n        // 加载应用\n        if (true) {\n            this.mainWindow.loadURL('http://localhost:3001');\n            this.mainWindow.webContents.openDevTools();\n        }\n        else // removed by dead control flow\n{}\n        // 窗口准备显示时才显示，避免视觉闪烁\n        this.mainWindow.once('ready-to-show', () => {\n            if (this.mainWindow) {\n                this.mainWindow.show();\n                this.mainWindow.focus();\n            }\n        });\n        // 窗口关闭时清理引用\n        this.mainWindow.on('closed', () => {\n            this.mainWindow = null;\n        });\n        return this.mainWindow;\n    }\n    getMainWindow() {\n        return this.mainWindow;\n    }\n    closeMainWindow() {\n        if (this.mainWindow) {\n            this.mainWindow.close();\n        }\n    }\n    minimizeMainWindow() {\n        if (this.mainWindow) {\n            this.mainWindow.minimize();\n        }\n    }\n    maximizeMainWindow() {\n        if (this.mainWindow) {\n            if (this.mainWindow.isMaximized()) {\n                this.mainWindow.unmaximize();\n            }\n            else {\n                this.mainWindow.maximize();\n            }\n        }\n    }\n    isMainWindowMaximized() {\n        return this.mainWindow ? this.mainWindow.isMaximized() : false;\n    }\n}\n\n\n//# sourceURL=webpack://matrix-ai-workflow/./src/main/window.ts?\n}");

/***/ },

/***/ "electron"
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
(module) {

module.exports = require("electron");

/***/ },

/***/ "path"
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
(module) {

module.exports = require("path");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/index.ts");
/******/ 	
/******/ })()
;