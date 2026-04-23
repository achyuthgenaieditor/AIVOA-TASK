import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import type { Message } from '@/types';
import ToolCallBubble from './ToolCallBubble';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timeStr = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Tool call message (no text content, just tool bubble)
  if (message.toolCall && !message.content) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-start gap-2 mb-4"
      >
        <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={14} className="text-white" />
        </div>
        <ToolCallBubble tool={{
          id: message.toolCall.id,
          toolName: message.toolCall.toolName,
          parameters: message.toolCall.parameters,
          status: message.toolCall.status === 'success' ? 'completed' : message.toolCall.status === 'error' ? 'failed' : 'executing',
          timestamp: message.timestamp,
        }} />
      </motion.div>
    );
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex justify-end mb-4"
      >
        <div className="max-w-[75%]">
          <div className="bg-[#2563EB] text-white rounded-lg px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1 text-right">{timeStr}</p>
        </div>
      </motion.div>
    );
  }

  // AI message with content
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-start gap-2 mb-4"
    >
      <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-white" />
      </div>
      <div className="max-w-[75%]">
        {message.toolCall && (
          <div className="mb-2">
            <ToolCallBubble tool={{
              id: message.toolCall.id,
              toolName: message.toolCall.toolName,
              parameters: message.toolCall.parameters,
              status: message.toolCall.status === 'success' ? 'completed' : message.toolCall.status === 'error' ? 'failed' : 'executing',
              timestamp: message.timestamp,
            }} />
          </div>
        )}
        <div className="bg-[#F0F2F5] text-[#1A1D23] rounded-lg px-4 py-3 border-l-[3px] border-l-[#EFF6FF] text-sm leading-relaxed whitespace-pre-wrap">
          {message.content.split('\n').map((line, i) => {
            // Render bold markdown-style **text**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <span key={i}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                  }
                  return <span key={j}>{part}</span>;
                })}
                {i < message.content.split('\n').length - 1 && <br />}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-[#9CA3AF] mt-1">{timeStr}</p>
      </div>
    </motion.div>
  );
}
