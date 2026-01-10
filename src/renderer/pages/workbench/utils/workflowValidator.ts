/**
 * 工作流验证工具
 *
 * 提供工作流完整性验证功能，确保工作流在保存和执行前符合要求
 */

import { Node, Edge } from 'reactflow';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误列表（阻塞保存/执行） */
  errors: string[];
  /** 警告列表（不阻塞但建议修复） */
  warnings: string[];
}

/**
 * 验证工作流完整性
 *
 * @param nodes - 工作流节点列表
 * @param edges - 工作流连接列表
 * @returns 验证结果
 */
export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 检查空工作流
  if (nodes.length === 0) {
    errors.push('工作流至少需要一个节点');
    return { valid: false, errors, warnings };
  }

  // 2. 检查孤立节点（没有连接的节点）
  const connectedNodeIds = new Set([
    ...edges.map(e => e.source),
    ...edges.map(e => e.target)
  ]);

  const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
  if (orphanNodes.length > 0) {
    warnings.push(`发现 ${orphanNodes.length} 个孤立节点（未与其他节点连接）`);
  }

  // 3. 检查输入/输出节点
  const inputNodes = nodes.filter(n => n.type === 'input');
  const outputNodes = nodes.filter(n => n.type === 'output');

  if (inputNodes.length === 0 && nodes.length > 1) {
    warnings.push('建议添加至少一个输入节点');
  }

  if (outputNodes.length === 0 && nodes.length > 1) {
    warnings.push('建议添加至少一个输出节点');
  }

  // 4. 检查循环依赖（使用拓扑排序检测）
  const hasCircularDependency = detectCircularDependency(nodes, edges);
  if (hasCircularDependency) {
    errors.push('工作流中存在循环依赖，无法执行');
  }

  // 5. 检查悬空连接（连接到不存在的节点）
  const nodeIds = new Set(nodes.map(n => n.id));
  const danglingEdges = edges.filter(e =>
    !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );

  if (danglingEdges.length > 0) {
    errors.push(`发现 ${danglingEdges.length} 个无效连接（指向不存在的节点）`);
  }

  // 6. 检查自连接（节点连接到自己）
  const selfLoops = edges.filter(e => e.source === e.target);
  if (selfLoops.length > 0) {
    errors.push(`发现 ${selfLoops.length} 个节点自连接，这是不允许的`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检测循环依赖（使用深度优先搜索）
 *
 * @param nodes - 节点列表
 * @param edges - 连接列表
 * @returns 是否存在循环依赖
 */
function detectCircularDependency(nodes: Node[], edges: Edge[]): boolean {
  // 构建邻接表
  const adjList = new Map<string, string[]>();
  nodes.forEach(node => adjList.set(node.id, []));
  edges.forEach(edge => {
    const neighbors = adjList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjList.set(edge.source, neighbors);
  });

  // 使用三色标记法检测环
  // white: 未访问, gray: 正在访问, black: 已完成
  const colors = new Map<string, 'white' | 'gray' | 'black'>();
  nodes.forEach(node => colors.set(node.id, 'white'));

  // DFS遍历
  function dfs(nodeId: string): boolean {
    colors.set(nodeId, 'gray');

    const neighbors = adjList.get(nodeId) || [];
    for (const neighborId of neighbors) {
      const color = colors.get(neighborId);

      // 如果遇到灰色节点，说明存在环
      if (color === 'gray') {
        return true;
      }

      // 如果是白色节点，继续DFS
      if (color === 'white' && dfs(neighborId)) {
        return true;
      }
    }

    colors.set(nodeId, 'black');
    return false;
  }

  // 从每个未访问的节点开始DFS
  for (const node of nodes) {
    if (colors.get(node.id) === 'white') {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 获取验证结果的友好提示信息
 *
 * @param result - 验证结果
 * @returns 提示信息字符串
 */
export function getValidationMessage(result: ValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push('❌ 发现以下错误：');
    result.errors.forEach(error => messages.push(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    messages.push(result.errors.length > 0 ? '\n⚠️ 同时发现以下警告：' : '⚠️ 发现以下警告：');
    result.warnings.forEach(warning => messages.push(`  • ${warning}`));
  }

  if (result.valid && result.warnings.length === 0) {
    messages.push('✅ 工作流验证通过');
  }

  return messages.join('\n');
}
