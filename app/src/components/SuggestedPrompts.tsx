import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void;
  visible: boolean;
}

const prompts = [
  'Log visit',
  'Correct field',
  'Show history',
  'Plan follow-up',
  'Generate notes',
];

export default function SuggestedPrompts({ onPromptClick, visible }: SuggestedPromptsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap gap-2 mt-3 overflow-hidden"
        >
          {prompts.map(prompt => (
            <button
              key={prompt}
              onClick={() => onPromptClick(prompt)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#6B7280] bg-white border border-[#E5E7EB] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-200 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
