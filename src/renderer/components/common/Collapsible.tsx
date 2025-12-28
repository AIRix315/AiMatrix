/**
 * Collapsible - 可折叠区域组件
 * 支持展开/收起、localStorage持久化
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Collapsible.css';

interface CollapsibleProps {
  title: string;
  storageKey?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  storageKey,
  defaultExpanded = true,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : defaultExpanded;
    }
    return defaultExpanded;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="collapsible">
      <button className="collapsible-header" onClick={toggleExpand}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="collapsible-title">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className="collapsible-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="collapsible-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
