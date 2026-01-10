import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FolderOpen, ChevronDown } from 'lucide-react';
import './OutputNode.css';

export interface OutputNodeData {
  label?: string;
  outputFormat?: string;
  savePath?: string;
  autoSave?: boolean;
}

/**
 * Output节点组件
 * - 有左端口，无右端口
 * - 输出格式选择
 * - 保存位置配置
 */
const OutputNode: React.FC<NodeProps<OutputNodeData>> = ({ data, selected }) => {
  const [outputFormat, setOutputFormat] = useState<string>(data.outputFormat || 'png');
  const [savePath, setSavePath] = useState<string>(data.savePath || '项目输出目录');
  const [autoSave, setAutoSave] = useState<boolean>(data.autoSave ?? true);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  // 支持的输出格式
  const outputFormats = {
    image: [
      { value: 'png', label: 'PNG' },
      { value: 'jpg', label: 'JPG' },
      { value: 'webp', label: 'WebP' },
      { value: 'gif', label: 'GIF' }
    ],
    video: [
      { value: 'mp4', label: 'MP4' },
      { value: 'mov', label: 'MOV' },
      { value: 'webm', label: 'WebM' }
    ],
    audio: [
      { value: 'mp3', label: 'MP3' },
      { value: 'wav', label: 'WAV' },
      { value: 'aac', label: 'AAC' }
    ],
    text: [
      { value: 'txt', label: 'TXT' },
      { value: 'json', label: 'JSON' },
      { value: 'md', label: 'Markdown' }
    ]
  };

  // 合并所有格式选项
  const allFormats = [
    ...outputFormats.image,
    ...outputFormats.video,
    ...outputFormats.audio,
    ...outputFormats.text
  ];

  const handleFormatChange = (format: string) => {
    setOutputFormat(format);
    setShowFormatDropdown(false);
    data.outputFormat = format;
  };

  const handleChoosePath = async () => {
    try {
      if (window.electronAPI?.openDirectoryDialog) {
        const result = await window.electronAPI.openDirectoryDialog();
        if (result) {
          setSavePath(result);
          data.savePath = result;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('选择保存路径失败:', error);
    }
  };

  const handleAutoSaveToggle = () => {
    const newValue = !autoSave;
    setAutoSave(newValue);
    data.autoSave = newValue;
  };

  const selectedFormatLabel =
    allFormats.find((f) => f.value === outputFormat)?.label || outputFormat.toUpperCase();

  return (
    <div className={`custom-node output-node ${selected ? 'selected' : ''}`}>
      {/* 左侧输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="node-handle node-handle-input"
      />

      {/* 节点标题 */}
      <div className="node-header">
        <span className="node-icon">📤</span>
        <span className="node-title">{data.label || 'Output'}</span>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        {/* 输出格式选择 */}
        <div className="format-selector">
          <label className="format-label">输出格式:</label>
          <div className="dropdown-wrapper">
            <button
              className="dropdown-btn"
              onClick={() => setShowFormatDropdown(!showFormatDropdown)}
            >
              <span className="dropdown-text">{selectedFormatLabel}</span>
              <ChevronDown
                size={14}
                className={`dropdown-icon ${showFormatDropdown ? 'rotated' : ''}`}
              />
            </button>

            {showFormatDropdown && (
              <div className="dropdown-menu">
                {Object.entries(outputFormats).map(([category, formats]) => (
                  <div key={category} className="format-category">
                    <div className="category-header">{category.toUpperCase()}</div>
                    {formats.map((format) => (
                      <div
                        key={format.value}
                        className={`dropdown-item ${
                          outputFormat === format.value ? 'active' : ''
                        }`}
                        onClick={() => handleFormatChange(format.value)}
                      >
                        {format.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 保存位置配置 */}
        <div className="save-path-config">
          <label className="path-label">保存位置:</label>
          <div className="path-selector">
            <div className="path-display" title={savePath}>
              {savePath}
            </div>
            <button className="path-btn" onClick={handleChoosePath} title="选择目录">
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        {/* 自动保存选项 */}
        <div className="auto-save-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={handleAutoSaveToggle}
              className="toggle-checkbox"
            />
            <span className="toggle-text">自动保存到项目</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputNode);
