import { BaseFilter } from "./filters/index.js";

/**
 * 过滤器管理器类
 * 负责管理过滤器链的增加、删除、替换和插入操作
 */
export default class FilterManager {
    /**
     * 创建过滤器管理器实例
     * @param {BaseFilter|null} headerFilter - 过滤器链的头节点
     */
    constructor(headerFilter = null) {
        this.headerFilter = headerFilter;
    }

    /**
     * 获取过滤器链的头节点
     * @returns {BaseFilter|null} 过滤器链头节点
     */
    getFilterChain() {
        return this.headerFilter;
    }

    /**
     * 设置过滤器链的头节点
     * @param {BaseFilter} filterChain - 新的过滤器链头节点
     */
    setFilterChain(filterChain) {
        this.headerFilter = filterChain;
    }

    /**
     * 添加过滤器到责任链的开头
     * @param {BaseFilter} filter - 要添加的过滤器
     */
    prependFilter(filter) {
        if (!(filter instanceof BaseFilter)) {
            throw new Error("Filter must be an instance of BaseFilter");
        }

        const filterChain = this.getFilterChain();
        filter.setNext(filterChain);
        this.setFilterChain(filter);
    }

    /**
     * 添加过滤器到责任链的尾部
     * @param {BaseFilter} filter - 要添加的过滤器
     */
    appendFilter(filter) {
        if (!(filter instanceof BaseFilter)) {
            throw new Error("Filter must be an instance of BaseFilter");
        }

        const filterChain = this.getFilterChain();

        // 如果链为空，直接设置为头节点
        if (!filterChain) {
            this.setFilterChain(filter);
            return;
        }

        // 找到链的最后一个节点
        let current = filterChain;
        while (current.nextFilter) {
            current = current.nextFilter;
        }

        // 将新过滤器添加到尾部
        current.setNext(filter);
    }

    /**
     * 根据过滤器类型获取过滤器
     * @param {string} filterType - 过滤器类型
     * @returns {BaseFilter|null} 找到的过滤器或null
     */
    getFilter(filterType) {
        let current = this.getFilterChain();
        while (current) {
            if (current.getFilterType() === filterType) {
                return current;
            }
            current = current.nextFilter;
        }
        return null;
    }

    /**
     * 在指定过滤器之前插入新过滤器
     * @param {BaseFilter} newFilter - 新过滤器
     * @param {BaseFilter} targetFilter - 目标过滤器
     */
    insertFilterBefore(newFilter, targetFilter) {
        if (!(newFilter instanceof BaseFilter)) {
            throw new Error("Filter must be an instance of BaseFilter");
        }

        const filterChain = this.getFilterChain();

        // 如果目标过滤器是链的开头
        if (filterChain === targetFilter) {
            newFilter.setNext(filterChain);
            this.setFilterChain(newFilter);
            return;
        }

        // 查找目标过滤器的前一个节点
        let current = filterChain;
        while (current && current.nextFilter !== targetFilter) {
            current = current.nextFilter;
        }

        if (current) {
            newFilter.setNext(targetFilter);
            current.setNext(newFilter);
        }
    }

    /**
     * 在指定类型的过滤器之前插入新过滤器
     * @param {BaseFilter} newFilter - 新过滤器
     * @param {string} targetFilterType - 目标过滤器类型
     */
    insertFilterBeforeType(newFilter, targetFilterType) {
        if (!(newFilter instanceof BaseFilter)) {
            throw new Error("Filter must be an instance of BaseFilter");
        }

        const targetFilter = this.getFilter(targetFilterType);
        if (targetFilter) {
            this.insertFilterBefore(newFilter, targetFilter);
        } else {
            throw new Error(`Filter of type '${targetFilterType}' not found`);
        }
    }

    /**
     * 复写现有的过滤器
     * @param {string} filterType - 要复写的过滤器类型
     * @param {BaseFilter} newFilter - 新的过滤器
     * @returns {boolean} 是否成功复写
     */
    replaceFilter(filterType, newFilter) {
        if (!(newFilter instanceof BaseFilter)) {
            throw new Error("Filter must be an instance of BaseFilter");
        }

        const filterChain = this.getFilterChain();

        // 如果是链的开头
        if (filterChain && filterChain.getFilterType() === filterType) {
            newFilter.setNext(filterChain.nextFilter);
            this.setFilterChain(newFilter);
            return true;
        }

        // 查找要替换的过滤器
        let current = filterChain;
        while (current && current.nextFilter) {
            if (current.nextFilter.getFilterType() === filterType) {
                const targetFilter = current.nextFilter;
                newFilter.setNext(targetFilter.nextFilter);
                current.setNext(newFilter);
                return true;
            }
            current = current.nextFilter;
        }

        return false;
    }

    /**
     * 移除指定类型的过滤器
     * @param {string} filterType - 要移除的过滤器类型
     * @returns {boolean} 是否成功移除
     */
    removeFilter(filterType) {
        const filterChain = this.getFilterChain();

        // 如果是链的开头
        if (filterChain && filterChain.getFilterType() === filterType) {
            this.setFilterChain(filterChain.nextFilter);
            return true;
        }

        // 查找要移除的过滤器
        let current = filterChain;
        while (current && current.nextFilter) {
            if (current.nextFilter.getFilterType() === filterType) {
                current.setNext(current.nextFilter.nextFilter);
                return true;
            }
            current = current.nextFilter;
        }

        return false;
    }

    /**
     * 清空所有过滤器
     * 将过滤器链重置为空状态
     */
    clearFilter() {
        this.setFilterChain(null);
    }
}
