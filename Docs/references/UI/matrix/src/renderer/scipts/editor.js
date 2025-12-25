// matrix-studio-electron/src/renderer/scripts/editor.js

/**
 * 编辑器模块
 */
const Editor = {
    // DOM元素引用
    elements: {
        sidebarLeft: null,
        sidebarRight: null,
        taskDocker: null,
        shotContainer: null,
        viewSwitcher: null,
        subNav: null
    },

    // 状态
    state: {
        currentStep: 3,
        canvasMode: 'storyboard',
        activeTasks: 0
    },

    // 步骤子导航配置
    subSteps: {
        1: ['1.1 章节拆分', '1.2 剧情梗概提取', '1.3 影视风格生成'],
        2: ['2.1 场景提取', '2.2 全局风格', '2.3 主要角色', '2.4 服化道'],
        3: ['3.1 分镜生成', '3.2 运镜控制'],
        4: ['4.1 角色音色', '4.2 环境音效', '4.3 背景音乐'],
        5: ['5.1 导出设置', '5.2 渲染队列']
    },

    /**
     * 初始化编辑器模块
     */
    init() {
        this.cacheElements();
        this.initResizers();
        this.bindEvents();
        this.checkDockerVisibility();
    },

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements.sidebarLeft = Utils.$('#sidebarLeft');
        this.elements.sidebarRight = Utils.$('#sidebarRight');
        this.elements.taskDocker = Utils.$('#taskDocker');
        this.elements.shotContainer = Utils.$('#shot-container');
        this.elements.viewSwitcher = Utils.$('#viewSwitcher');
        this.elements.subNav = Utils.$('#subNav');
    },

    /**
     * 初始化可调整大小的分隔条
     */
    initResizers() {
        const resizerLeft = Utils.$('#resizerLeft');
        const resizerRight = Utils.$('#resizerRight');

        if (resizerLeft && this.elements.sidebarLeft) {
            this.makeResizable(resizerLeft, this.elements.sidebarLeft, null);
        }

        if (resizerRight && this.elements.sidebarRight) {
            this.makeResizable(resizerRight, null, this.elements.sidebarRight);
        }
    },

    /**
     * 使元素可调整大小
     * @param {Element} resizer - 分隔条元素
     * @param {Element} prev - 前一个面板
     * @param {Element} next - 后一个面板
     */
    makeResizable(resizer, prev, next) {
        let startX = 0;
        let startWidth = 0;
        const self = this;

        const onMouseDown = (e) => {
            startX = e.clientX;
            const el = prev || next;
            startWidth = el.getBoundingClientRect().width;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            const dx = e.clientX - startX;
            const newWidth = prev 
                ? Math.max(0, startWidth + dx) 
                : Math.max(0, startWidth - dx);

            if (prev) {
                prev.style.width = `${newWidth}px`;
            } else {
                next.style.width = `${newWidth}px`;
            }

            if (!prev) {
                self.checkDockerVisibility();
            }
        };

        const onMouseUp = () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        resizer.addEventListener('mousedown', onMouseDown);
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 左侧边栏切换
        const btnToggleLeft = Utils.$('#btnToggleLeft');
        if (btnToggleLeft) {
            btnToggleLeft.onclick = () => this.toggleSidebar('left');
        }

        // 右侧边栏切换
        const btnToggleRight = Utils.$('#btnToggleRight');
        if (btnToggleRight) {
            btnToggleRight.onclick = () => this.toggleSidebar('right');
        }

        // 最大化切换
        const btnMaximize = Utils.$('#btnMaximize');
        if (btnMaximize) {
            btnMaximize.onclick = () => this.toggleMaximize();
        }

        // Docker点击
        if (this.elements.taskDocker) {
            this.elements.taskDocker.onclick = () => {
                this.elements.sidebarRight.style.width = '280px';
                this.checkDockerVisibility();
            };
        }

        // 步骤标签切换
        const stepTabs = Utils.$('#step-tabs');
        if (stepTabs) {
            Utils.delegate(stepTabs, 'click', '.step-tab', (event, target) => {
                const step = parseInt(target.dataset.step);
                if (step) this.switchStep(step);
            });
        }

        // 视图模式切换
        if (this.elements.viewSwitcher) {
            Utils.delegate(this.elements.viewSwitcher, 'click', '.view-switch-btn', (event, target) => {
                const mode = target.dataset.mode;
                if (mode) this.setCanvasMode(mode);
            });
        }

        // 右侧面板标签切换
        const rightTabs = Utils.$$('.r-tab');
        rightTabs.forEach(tab => {
            tab.onclick = () => {
                const panel = tab.dataset.panel;
                this.switchRightTab(panel);
            };
        });

        // 生成模式切换
        const genModeSwitch = Utils.$('#gen-mode-switch');
        if (genModeSwitch) {
            Utils.delegate(genModeSwitch, 'click', '.ms-opt', (event, target) => {
                const mode = parseInt(target.dataset.mode);
                this.setGenMode(target, mode);
            });
        }

        // 生成按钮
        const btnGenerate = Utils.$('#btnGenerate');
        if (btnGenerate) {
            btnGenerate.onclick = () => this.startGeneration();
        }
    },

    /**
     * 切换侧边栏显示
     * @param {string} side - 'left' 或 'right'
     */
    toggleSidebar(side) {
        const sidebar = side === 'left' 
            ? this.elements.sidebarLeft 
            : this.elements.sidebarRight;
        
        if (!sidebar) return;

        const currentWidth = sidebar.style.width;
        const defaultWidth = side === 'left' ? '240px' : '280px';
        
        sidebar.style.width = (currentWidth === '0px') ? defaultWidth : '0px';

        if (side === 'right') {
            setTimeout(() => this.checkDockerVisibility(), 310);
        }
    },

    /**
     * 切换最大化状态
     */
    toggleMaximize() {
        const { sidebarLeft, sidebarRight } = this.elements;
        const isMaximized = (sidebarLeft.style.width === '0px' && sidebarRight.style.width === '0px');

        sidebarLeft.style.width = isMaximized ? '240px' : '0px';
        sidebarRight.style.width = isMaximized ? '280px' : '0px';

        setTimeout(() => this.checkDockerVisibility(), 310);
    },

    /**
     * 检查Docker可见性
     */
    checkDockerVisibility() {
        const { sidebarRight, taskDocker } = this.elements;
        if (!sidebarRight || !taskDocker) return;

        const width = sidebarRight.getBoundingClientRect().width;
        taskDocker.style.display = (width < 10) ? 'block' : 'none';
    },

    /**
     * 切换步骤
     * @param {number} step - 步骤编号
     */
    switchStep(step) {
        // 更新步骤标签
        const tabs = Utils.$$('.step-tab');
        tabs.forEach(el => el.classList.remove('active'));
        tabs[step - 1].classList.add('active');

        // 更新步骤内容层
        const layers = Utils.$$('.step-layer');
        layers.forEach(el => el.classList.remove('active'));
        const targetLayer = Utils.$(`#page-${step}`);
        if (targetLayer) targetLayer.classList.add('active');

        // 更新子导航
        this.updateSubNav(step);

        // 更新视图切换器状态
        if (this.elements.viewSwitcher) {
            if (step === 3) {
                this.elements.viewSwitcher.classList.remove('disabled');
            } else {
                this.elements.viewSwitcher.classList.add('disabled');
            }
        }

        this.state.currentStep = step;
    },

    /**
     * 更新子导航
     * @param {number} step - 步骤编号
     */
    updateSubNav(step) {
        const items = this.subSteps[step] || [];
        if (this.elements.subNav) {
            this.elements.subNav.innerHTML = items.map((text, index) => 
                `<div class="sub-tab ${index === 0 ? 'active' : ''}">${text}</div>`
            ).join('');
        }
    },

    /**
     * 设置画布模式
     * @param {string} mode - 'storyboard' 或 'list'
     */
    setCanvasMode(mode) {
        const container = this.elements.shotContainer;
        const btnStory = Utils.$('#btn-mode-story');
        const btnList = Utils.$('#btn-mode-list');

        if (!container) return;

        if (mode === 'storyboard') {
            container.classList.remove('mode-list');
            container.classList.add('mode-storyboard');
            if (btnStory) btnStory.classList.add('active');
            if (btnList) btnList.classList.remove('active');
        } else {
            container.classList.remove('mode-storyboard');
            container.classList.add('mode-list');
            if (btnList) btnList.classList.add('active');
            if (btnStory) btnStory.classList.remove('active');
        }

        this.state.canvasMode = mode;
    },

    /**
     * 切换右侧面板标签
     * @param {string} tab - 'prop' 或 'tool'
     */
    switchRightTab(tab) {
        Utils.$('#rtab-prop').classList.remove('active');
        Utils.$('#rtab-tool').classList.remove('active');
        Utils.$(`#rtab-${tab}`).classList.add('active');

        Utils.$('#panel-prop').style.display = (tab === 'prop') ? 'block' : 'none';
        Utils.$('#panel-tool').style.display = (tab === 'tool') ? 'block' : 'none';
    },

    /**
     * 设置生成模式
     * @param {Element} el - 点击的元素
     * @param {number} modeIndex - 模式索引
     */
    setGenMode(el, modeIndex) {
        const opts = el.parentNode.children;
        for (let opt of opts) {
            opt.classList.remove('active');
        }
        el.classList.add('active');

        const dynArea = Utils.$('#dynamic-gen-options');
        const btn = Utils.$('#btnGenerate');

        if (modeIndex === 1) {
            dynArea.style.display = 'none';
            btn.innerText = '补全缺失 (AUTO-FILL)';
        } else if (modeIndex === 2) {
            dynArea.style.display = 'block';
            btn.innerText = '全流程生成 (GENERATE ALL)';
        } else {
            dynArea.style.display = 'block';
            btn.innerText = '生成当前 (GENERATE)';
        }
    },

    /**
     * 开始生成
     */
    startGeneration() {
        this.state.activeTasks += 2;
        this.updateDocker();
    },

    /**
     * 更新Docker显示
     */
    updateDocker() {
        const numEl = Utils.$('#dockerNum');
        const liquid = Utils.$('#tideLiquid');

        if (numEl) numEl.innerText = this.state.activeTasks;
        if (liquid) {
            liquid.style.height = this.state.activeTasks > 0 ? '60%' : '0%';
        }
    }
};

// 导出到全局
window.Editor = Editor;
