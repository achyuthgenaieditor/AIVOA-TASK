import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Message, ToolExecution } from '@/types';
import ChatMessage from '@/components/ChatMessage';
import TypingIndicator from '@/components/TypingIndicator';
import SuggestedPrompts from '@/components/SuggestedPrompts';
import ToolExecutionLog from '@/components/ToolExecutionLog';

interface AIChatProps {
  messages: Message[];
  isLoading: boolean;
  toolExecutions: ToolExecution[];
  showSuggestions: boolean;
  onSend: (text: string) => void;
}

export default function AIChat({
  messages,
  isLoading,
  toolExecutions,
  showSuggestions,
  onSend,
}: AIChatProps) {
  const [input, setInput] = useState('');
  const [toolLogOpen, setToolLogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep chat scrolling inside its own panel instead of moving the whole page.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    const promptMap: Record<string, string> = {
      'Log visit': 'Yesterday visited doctor Anita and discussed CardioX dosage, safety and pricing. She was interested, I gave samples and shared clinical data. Follow up next week.',
      'Correct field': 'Actually change the sentiment to neutral and change date to 25.',
      'Show history': 'Show me my recent interaction history with CRM insights.',
      'Plan follow-up': 'Schedule a follow-up next week to discuss pricing and send a reminder.',
      'Generate notes': 'Generate call notes from the current interaction.',
    };
    onSend(promptMap[prompt] || prompt);
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white rounded-xl border border-[#E5E7EB] flex flex-col overflow-hidden min-h-[620px] lg:min-h-0 lg:h-full"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <h2 className="text-base font-semibold text-[#1A1D23]" style={{ letterSpacing: '-0.01em' }}>
            AI Assistant
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#10B981]">
            Online
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto p-4 overscroll-contain"
        style={{
          background: 'linear-gradient(to bottom, #F7F8FA, #FFFFFF)',
        }}
      >
        {/* Welcome message */}
        {messages.length > 0 && messages[0].role === 'assistant' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-start gap-2 mb-4"
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={14} className="text-white" />
            </div>
            <div className="max-w-[75%]">
              <div className="bg-[#F0F2F5] text-[#1A1D23] rounded-lg px-4 py-3 border-l-[3px] border-l-[#EFF6FF] text-sm leading-relaxed">
                <p>Hello! I'm your HCP interaction assistant. Describe your visit in natural language and I'll fill out the form for you.</p>
                <p className="mt-2 text-xs text-[#9CA3AF] italic">
                  Try: "Today I met Dr. Smith and discussed ProductX. Sentiment was positive and I shared brochures."
                </p>
              </div>
              {/* Suggested Prompts */}
              <SuggestedPrompts onPromptClick={handlePromptClick} visible={showSuggestions} />
            </div>
          </motion.div>
        )}

        {/* Remaining messages (skip welcome) */}
        {messages.slice(1).map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing Indicator */}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Tool Execution Log */}
      <ToolExecutionLog
        executions={toolExecutions}
        isOpen={toolLogOpen}
        onToggle={() => setToolLogOpen(!toolLogOpen)}
      />

      {/* Chat Input */}
      <div className="px-4 py-3 border-t border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your visit or ask the assistant..."
            disabled={isLoading}
            className="flex-1 bg-[#F7F8FA] border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] focus-visible:ring-[#2563EB] focus-visible:ring-1 h-10"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              canSend
                ? 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 cursor-pointer'
                : 'bg-[#2563EB] opacity-40 cursor-not-allowed'
            }`}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
