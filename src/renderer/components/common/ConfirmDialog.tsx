import React from 'react';
import Modal from './Modal';
import Button from './Button';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  onConfirm,
  onCancel
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} width="480px">
      <div className="confirm-dialog">
        {title && <h3 className="confirm-title">{title}</h3>}
        <div className={`confirm-message confirm-${type}`}>
          <div className="confirm-icon">{getIcon(type)}</div>
          <div className="confirm-text">{message}</div>
        </div>
        <div className="confirm-actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'primary' : 'primary'}
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

function getIcon(type: string): string {
  switch (type) {
    case 'warning': return '⚠';
    case 'danger': return '⚠';
    case 'info': return 'ℹ';
    default: return 'ℹ';
  }
}

export default ConfirmDialog;
