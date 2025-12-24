// matrix-studio-electron/src/renderer/scripts/utils.js

/**
 * 工具函数模块
 */
const Utils = {
    /**
     * 简单的元素选择器
     */
    $(selector) {
        return document.querySelector(selector);
    },

    /**
     * 选择所有匹配的元素
     */
    $$(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * 事件委托 - 高效处理动态元素的事件
     */
    delegate(parent, eventType, selector, callback) {
        parent.addEventListener(eventType, (event) => {
            const target = event.target.closest(selector);
            if (target) {
                callback(event, target);
            }
        });
    },

    /**
     * 加载外部HTML文件
     */
    async loadHTML(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            console.error('Failed to load HTML:', url, error);
            return '';
        }
    },

    /**
     * 将HTML注入到元素
     */
    injectHTML(element, html) {
        if (element) {
            element.innerHTML = html;
        }
    },
};

// 导出到全局
window.Utils = Utils;
