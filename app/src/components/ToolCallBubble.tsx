import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { ToolExecution } from '@/types';
import { TOOL_COLORS } from '@/types';
import ToolBadge from './ToolBadge';

interface ToolCallBubbleProps {
  tool: ToolExecution;
}

export default function ToolCallBubble({ tool }: ToolCallBubbleProps) {
  const color = TOOL_COLORS[tool.toolName];
  const toolLabel = tool.toolName.replace(/_/g, ' ').toUpperCase();

  const statusIcon = () => {
    switch (tool.status) {
      case 'executing':
        return <Loader2 size={14} className="loader-spin text-[#9CA3AF]" />;
      case 'completed':
        return <CheckCircle size={14} style={{ color: '#10B981' }} />;
      case 'failed':
        return <XCircle size={14} style={{ color: '#EF4444' }} />;
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border"
      style={{ borderLeftWidth: 4, borderLeftColor: color, borderColor: '#E5E7EB' }}
    >
      <ToolBadge toolName={tool.toolName} size={12} />
      <span className="text-xs font-medium tracking-wide text-[#1A1D23]">{toolLabel}</span>
      {statusIcon()}
    </motion.div>
  );
}
