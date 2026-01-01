import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import ReactFlow, {
  Node,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel as FlowPanel,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Toast, Loading } from '../../components/common';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { ToastType } from '../../components/common/Toast';
import { validateWorkflow } from './utils/workflowValidator';
import { InputNode, ExecuteNode, OutputNode } from '../../components/workflow/nodes';
import './WorkflowEditor.css';

const WorkflowEditor: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('未命名工作流');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 面板折叠状态
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 切换左侧面板折叠状态
  const toggleLeftPanel = () => {
    setLeftPanelCollapsed((prev) => !prev);
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 执行监控相关状态
  const [executionStatus, setExecutionStatus] = useState<string>('idle');
  const [executionProgress, setExecutionProgress] = useState<number>(0);

  // 加载工作流
  useEffect(() => {
    if (workflowId && workflowId !== 'new') {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.loadWorkflow) {
        // TODO: [中期改进] 定义准确的loadWorkflow返回类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workflow = await window.electronAPI.loadWorkflow(id) as any;
        setWorkflowName((workflow as any).name);
        setNodes((workflow as any).nodes || []);
        setEdges((workflow as any).edges || []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load workflow:', error);
      setToast({
        type: 'error',
        message: `加载工作流失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 验证工作流完整性
      const validation = validateWorkflow(nodes, edges);
      if (!validation.valid) {
        setToast({
          type: 'error',
          message: `验证失败：${validation.errors.join('; ')}`
        });
        setIsSaving(false);
        return;
      }

      // 如果有警告，也显示给用户（但不阻塞保存）
      if (validation.warnings.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('工作流警告:', validation.warnings);
      }

      // 遵循全局时间处理要求：使用 TimeService 获取时间戳
      const timestamp = await window.electronAPI.getCurrentTime();
      const config = {
        id: workflowId === 'new' || !workflowId ? `workflow-${timestamp}` : workflowId,
        name: workflowName,
        type: 'custom',
        nodes,
        edges,
        config: {},
        createdAt: new Date(timestamp).toISOString(),
        updatedAt: new Date(timestamp).toISOString()
      };

      if (window.electronAPI?.saveWorkflow) {
        await window.electronAPI.saveWorkflow(config.id, config);
        setToast({
          type: 'success',
          message: '工作流保存成功'
        });

        // 如果是新建，跳转到编辑页面
        if (workflowId === 'new') {
          navigate(`/workflows/${config.id}`, { replace: true });
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save workflow:', error);
      setToast({
        type: 'error',
        message: `保存失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 状态轮询函数
  const startStatusPolling = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        if (window.electronAPI?.getWorkflowStatus) {
          // TODO: [中期改进] 定义准确的getWorkflowStatus返回类型
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = await window.electronAPI.getWorkflowStatus(jobId) as any;
          setExecutionStatus((status as any).status || 'running');
          setExecutionProgress((status as any).progress || 0);

          // 如果执行完成或失败，停止轮询
          if ((status as any).status === 'completed' || (status as any).status === 'failed' || (status as any).status === 'cancelled') {
            clearInterval(interval);
            setIsExecuting(false);

            if ((status as any).status === 'completed') {
              setToast({
                type: 'success',
                message: '工作流执行完成'
              });
            } else if ((status as any).status === 'failed') {
              setToast({
                type: 'error',
                message: `工作流执行失败: ${(status as any).error || '未知错误'}`
              });
            } else {
              setToast({
                type: 'info',
                message: '工作流执行已取消'
              });
            }

            // 重置状态
            setExecutionStatus('idle');
            setExecutionProgress(0);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get workflow status:', error);
        clearInterval(interval);
        setIsExecuting(false);
      }
    }, 1000); // 每秒轮询一次

    // 保存 interval ID 用于清理
    return interval;
  }, []);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);

      // 验证工作流完整性
      const validation = validateWorkflow(nodes, edges);
      if (!validation.valid) {
        setToast({
          type: 'error',
          message: `无法执行：${validation.errors.join('; ')}`
        });
        setIsExecuting(false);
        return;
      }

      // 如果有警告，显示但继续执行
      if (validation.warnings.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('工作流警告:', validation.warnings);
      }

      const config = {
        id: workflowId,
        name: workflowName,
        type: 'custom',
        nodes,
        edges,
        config: {}
      };

      if (window.electronAPI?.executeWorkflow) {
        const jobId = await window.electronAPI.executeWorkflow(config);
        setExecutionStatus('running');
        setToast({
          type: 'success',
          message: `工作流已开始执行，任务ID: ${jobId}`
        });

        // 开始轮询执行状态
        startStatusPolling(jobId);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to execute workflow:', error);
      setToast({
        type: 'error',
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}`
      });
      setIsExecuting(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 节点库
  const nodeLibrary = [
    { type: 'inputNode', label: '输入节点', icon: 'input', description: '资源选择和加载' },
    { type: 'executeNode', label: '执行节点', icon: 'settings', description: 'AI服务调用' },
    { type: 'outputNode', label: '输出节点', icon: 'output', description: '结果保存' }
  ];

  const handleAddNode = async (nodeType: string, label: string) => {
    // 遵循全局时间处理要求：使用 TimeService 获取时间戳
    const timestamp = await window.electronAPI.getCurrentTime();
    const newNode: Node = {
      id: `${nodeType}-${timestamp}`,
      type: nodeType,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100
      },
      data: { label: `${label}` }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 注册自定义节点类型
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      inputNode: InputNode,
      executeNode: ExecuteNode,
      outputNode: OutputNode
    }),
    []
  );

  // 删除节点处理函数
  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) =>
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
      setToast({ type: 'success', message: '节点已删除' });
    }
  }, [selectedNode, setNodes, setEdges]);

  // 监听键盘Delete/Backspace键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleDeleteNode]);

  if (isLoading) {
    return <Loading size="lg" message="加载工作流..." fullscreen />;
  }

  return (
    <div className="workflow-editor">
      {/* 左右分栏+中间列上下分区布局 */}
      <PanelGroup orientation="horizontal" className="editor-panels">
        {/* 左侧：节点库 (区域B) */}
        <Panel
          id="left-panel"
          defaultSize={250}
          minSize={0}
          maxSize={250}
          collapsible
          collapsedSize={0}
          data-panel-collapsed={leftPanelCollapsed ? 'true' : 'false'}
        >
          <div className="node-library">
            <h3>节点库</h3>
            <div className="node-list">
              {nodeLibrary.map((node) => (
                <div
                  key={node.type}
                  className="node-item"
                  onClick={() => handleAddNode(node.type, node.label)}
                >
                  <span className="node-icon">{node.icon}</span>
                  <span className="node-label">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* 中间列：上下分区 (区域A + 区域C) */}
        <Panel defaultSize={60}>
          <PanelGroup orientation="vertical" className="middle-column">
            {/* 中间列上部：工具栏 (区域A) */}
            <Panel defaultSize={25} minSize={10} maxSize={50}>
              <div className="editor-toolbar">
                {/* 左侧折叠按钮 */}
                <button
                  className={`collapse-btn left-collapse ${leftPanelCollapsed ? 'collapsed' : ''}`}
                  onClick={toggleLeftPanel}
                  title={leftPanelCollapsed ? '展开左侧面板' : '折叠左侧面板'}
                >
                  <span className="collapse-icon">{leftPanelCollapsed ? '◀' : '▶'}</span>
                </button>

                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="workflow-name-input"
                  placeholder="工作流名称"
                />
                <div className="toolbar-actions">
                  <Button variant="ghost" onClick={() => navigate('/workflows')}>
                    返回
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExecute}
                    disabled={isExecuting || nodes.length === 0}
                  >
                    {isExecuting ? '执行中...' : '执行工作流'}
                  </Button>
                  <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                  {/* 全屏切换按钮 */}
                  <button
                    className="icon-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? '退出全屏' : '全屏显示'}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle resize-handle-vertical" />

            {/* 中间列下部：画布 (区域C) */}
            <Panel defaultSize={75}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap />
                <FlowPanel position="top-right" className="workflow-info">
                  <div className="info-item">
                    <span>节点: {nodes.length}</span>
                  </div>
                  <div className="info-item">
                    <span>连接: {edges.length}</span>
                  </div>
                  {executionStatus !== 'idle' && (
                    <div className="info-item execution-status">
                      <span>状态: {executionStatus}</span>
                      {executionProgress > 0 && (
                        <span> ({Math.round(executionProgress)}%)</span>
                      )}
                    </div>
                  )}
                </FlowPanel>
              </ReactFlow>
            </Panel>
          </PanelGroup>
        </Panel>

      </PanelGroup>

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default WorkflowEditor;
