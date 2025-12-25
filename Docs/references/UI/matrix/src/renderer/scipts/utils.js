// matrix-studio-electron/src/renderer/scripts/utils.js

/**
 * 工具函数模块
 */
const Utils = {
    /**
     * 获取DOM元素
     * @param {string} selector - CSS选择器
     * @returns {Element}
     */
    $(selector) {
        return document.querySelector(selector);
    },

    /**
     * 获取所有匹配的DOM元素
     * @param {string} selector - CSS选择器
     * @returns {NodeList}
     */
    $$(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * 异步加载HTML片段
     * @param {string} url - HTML文件路径
     * @returns {Promise<string>}
     */
    async loadHTML(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Failed to load HTML from ${url}:`, error);
            return '';
        }
    },

    /**
     * 将HTML字符串插入到目标元素
     * @param {Element} target - 目标DOM元素
     * @param {string} html - HTML字符串
     */
    injectHTML(target, html) {
        if (target && html) {
            target.innerHTML = html;
        }
    },

    /**
     * 添加事件监听器（支持事件委托）
     * @param {Element} parent - 父元素
     * @param {string} eventType - 事件类型
     * @param {string} selector - 子元素选择器
     * @param {Function} handler - 事件处理函数
     */
    delegate(parent, eventType, selector, handler) {
        parent.addEventListener(eventType, (event) => {
            const target = event.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, event, target);
            }
        });
    },

    /**
     * 切换元素的class
     * @param {Element} element - DOM元素
     * @param {string} className - class名称
     * @param {boolean} force - 强制添加或移除
     */
    toggleClass(element, className, force) {
        if (element) {
            element.classList.toggle(className, force);
        }
    },

    /**
     * 显示/隐藏元素
     * @param {Element} element - DOM元素
     * @param {boolean} show - 是否显示
     */
    setVisible(element, show) {
        if (element) {
            element.style.display = show ? '' : 'none';
        }
    },

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 时间限制（毫秒）
     * @returns {Function}
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// 导出到全局
window.Utils = Utils;
