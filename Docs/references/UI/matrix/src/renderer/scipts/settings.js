// matrix-studio-electron/src/renderer/scripts/settings.js

/**
 * 设置页面模块
 */
const Settings = {
    currentTab: 'ollama',

    /**
     * 初始化设置模块
     */
    init() {
        this.bindEvents();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        const providerList = Utils.$('#provider-list');
        if (!providerList) return;

        // 使用事件委托处理provider点击
        Utils.delegate(providerList, 'click', '.provider-item', (event, target) => {
            const tabId = target.dataset.tab;
            if (tabId) {
                this.openTab(tabId, target);
            }
        });
    },

    /**
     * 打开设置标签页
     * @param {string} tabId - 标签ID
     * @param {Element} btnElement - 点击的按钮元素
     */
    openTab(tabId, btnElement) {
        // 1. 更新侧边栏激活状态
        if (btnElement) {
            const siblings = btnElement.parentNode.querySelectorAll('.provider-item');
            siblings.forEach(item => item.classList.remove('active'));
            btnElement.classList.add('active');
        }

        // 2. 切换标签内容
        const tabs = Utils.$$('.settings-tab-content');
        tabs.forEach(t => t.classList.remove('active'));

        const targetTab = Utils.$(`#set-${tabId}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabId;
    },

    /**
     * 保存配置
     * @param {string} provider - 服务商名称
     * @param {Object} config - 配置对象
     */
    saveConfig(provider, config) {
        // TODO: 实现配置保存逻辑
        console.log(`Saving config for ${provider}:`, config);
        
        // 可以通过 electronAPI 调用主进程保存配置
        // if (window.electronAPI) {
        //     window.electronAPI.saveConfig(provider, config);
        // }
    },

    /**
     * 测试连接
     * @param {string} provider - 服务商名称
     * @param {string} baseUrl - API基础URL
     */
    async testConnection(provider, baseUrl) {
        console.log(`Testing connection to ${provider} at ${baseUrl}`);
        
        // TODO: 实现连接测试逻辑
        try {
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                alert('连接成功！');
                return true;
            } else {
                alert('连接失败：' + response.statusText);
                return false;
            }
        } catch (error) {
            alert('连接失败：' + error.message);
            return false;
        }
    }
};

// 导出到全局
window.Settings = Settings;
