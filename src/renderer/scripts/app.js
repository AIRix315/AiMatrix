// matrix-studio-electron/src/renderer/scripts/app.js

/**
 * 应用主入口
 */
const App = {
    /**
     * 初始化应用
     */
    async init() {
        console.log('MATRIX Studio initializing...');

        // 加载视图HTML
        await this.loadViews();

        // 初始化各模块
        Navigation.init();
        Settings.init();

        // 绑定窗口控制
        this.bindWindowControls();

        // 绑定全局事件
        this.bindGlobalEvents();

        console.log('MATRIX Studio initialized successfully.');
    },

    /**
     * 加载视图HTML
     */
    async loadViews() {
        // 加载菜单
        const menuHTML = await Utils.loadHTML('views/menu.html');
        Utils.injectHTML(Utils.$('#global-menu'), menuHTML);

        // 加载首页
        const homeHTML = await Utils.loadHTML('views/home.html');
        Utils.injectHTML(Utils.$('#view-home'), homeHTML);

        // 加载素材页
        const assetsHTML = await Utils.loadHTML('views/assets.html');
        Utils.injectHTML(Utils.$('#view-assets'), assetsHTML);

        // 加载插件页
        const pluginsHTML = await Utils.loadHTML('views/plugins.html');
        Utils.injectHTML(Utils.$('#view-plugins'), pluginsHTML);

        // 加载设置页
        const settingsHTML = await Utils.loadHTML('views/settings.html');
        Utils.injectHTML(Utils.$('#view-settings'), settingsHTML);

        // 加载编辑器页
        const editorHTML = await Utils.loadHTML('views/editor.html');
        Utils.injectHTML(Utils.$('#view-editor'), editorHTML);
    },

    /**
     * 绑定窗口控制按钮
     */
    bindWindowControls() {
        const btnMinimize = Utils.$('#btn-minimize');
        const btnMaximize = Utils.$('#btn-maximize');
        const btnClose = Utils.$('#btn-close');

        if (window.electronAPI) {
            if (btnMinimize) {
                btnMinimize.onclick = () => window.electronAPI.minimizeWindow();
            }
            if (btnMaximize) {
                btnMaximize.onclick = () => window.electronAPI.maximizeWindow();
            }
            if (btnClose) {
                btnClose.onclick = () => window.electronAPI.closeWindow();
            }
        } else {
            // 非Electron环境的fallback
            console.warn('electronAPI not available, window controls disabled');
        }
    },

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 项目卡片点击
        const projectGrid = Utils.$('#project-card-grid');
        if (projectGrid) {
            Utils.delegate(projectGrid, 'click', '.project-card', (event, target) => {
                const projectName = target.dataset.project;
                if (projectName) {
                    Navigation.openProject(projectName);
                }
            });
        }

        // 新建项目按钮
        const btnNewProject = Utils.$('#btn-new-project');
        if (btnNewProject) {
            btnNewProject.onclick = () => {
                // TODO: 实现新建项目逻辑
                console.log('Create new project');
            };
        }

        // 创建第一个项目按钮
        const btnCreateFirst = Utils.$('#btn-create-first');
        if (btnCreateFirst) {
            btnCreateFirst.onclick = () => {
                Navigation.createFirstProject();
            };
        }

        // 关于弹窗关闭
        const modalAbout = Utils.$('#modal-about');
        if (modalAbout) {
            modalAbout.onclick = (e) => {
                if (e.target === modalAbout) {
                    Navigation.toggleAbout();
                }
            };
        }

        const btnCloseAbout = Utils.$('#btn-close-about');
        if (btnCloseAbout) {
            btnCloseAbout.onclick = () => {
                Navigation.toggleAbout();
            };
        }
    }
};

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 导出到全局
window.App = App;
