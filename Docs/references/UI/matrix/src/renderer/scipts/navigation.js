// matrix-studio-electron/src/renderer/scripts/navigation.js

/**
 * 导航控制模块
 */
const Navigation = {
    // 视图映射
    views: {},
    menuItems: {},
    currentView: 'home',
    currentProject: null,

    /**
     * 初始化导航模块
     */
    init() {
        // 获取视图元素
        this.views = {
            'home': Utils.$('#view-home'),
            'assets': Utils.$('#view-assets'),
            'plugins': Utils.$('#view-plugins'),
            'settings': Utils.$('#view-settings'),
            'workflow': Utils.$('#view-editor')
        };

        // 获取菜单项元素
        this.menuItems = {
            'home': Utils.$('#menu-home'),
            'assets': Utils.$('#menu-assets'),
            'plugins': Utils.$('#menu-plugins'),
            'settings': Utils.$('#menu-settings'),
            'workflow': Utils.$('#menu-workflow'),
            'about': Utils.$('#menu-about')
        };

        // 绑定菜单点击事件
        this.bindMenuEvents();
    },

    /**
     * 绑定菜单事件
     */
    bindMenuEvents() {
        const menu = Utils.$('#global-menu');
        if (!menu) return;

        Utils.delegate(menu, 'click', '.menu-item', (event, target) => {
            const viewName = target.id.replace('menu-', '');
            
            if (viewName === 'about') {
                this.toggleAbout();
            } else {
                this.switchView(viewName);
            }
        });
    },

    /**
     * 切换主视图
     * @param {string} viewName - 视图名称
     */
    switchView(viewName) {
        // 检查工作流视图是否需要先打开项目
        if (viewName === 'workflow' && !this.currentProject) {
            alert('请先在首页选择或新建一个项目 (Please open a project first)');
            this.switchView('home');
            return;
        }

        // 1. 隐藏所有视图
        Object.values(this.views).forEach(el => {
            if (el) el.classList.remove('active');
        });

        // 2. 显示目标视图
        if (this.views[viewName]) {
            this.views[viewName].classList.add('active');
        }

        // 3. 更新菜单选中状态
        Object.values(this.menuItems).forEach(el => {
            if (el) el.classList.remove('active');
        });
        if (this.menuItems[viewName]) {
            this.menuItems[viewName].classList.add('active');
        }

        this.currentView = viewName;
    },

    /**
     * 打开项目
     * @param {string} projectName - 项目名称
     */
    openProject(projectName) {
        this.currentProject = projectName;
        
        // 更新状态栏
        const statusEl = Utils.$('#footer-status-project');
        if (statusEl) {
            statusEl.innerText = `当前项目: ${projectName}`;
        }
        
        // 切换到工作流视图
        this.switchView('workflow');
    },

    /**
     * 创建第一个项目
     */
    createFirstProject() {
        const emptyState = Utils.$('#empty-state');
        const projectGrid = Utils.$('#project-grid-area');
        
        if (emptyState) emptyState.style.display = 'none';
        if (projectGrid) projectGrid.style.display = 'block';
    },

    /**
     * 切换关于弹窗
     */
    toggleAbout() {
        const modal = Utils.$('#modal-about');
        if (modal) {
            const isVisible = modal.classList.contains('show');
            modal.classList.toggle('show', !isVisible);
        }
    }
};

// 导出到全局
window.Navigation = Navigation;
