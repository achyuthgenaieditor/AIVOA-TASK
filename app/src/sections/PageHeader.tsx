import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import type { FormStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';

interface PageHeaderProps {
  formStatus: FormStatus;
}

export default function PageHeader({ formStatus }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#1A1D23]" style={{ letterSpacing: '-0.02em' }}>
            HCP CRM
          </h1>
          <span className="text-xs text-[#9CA3AF] tracking-wide">AI-First Interaction Logger</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-xs text-[#6B7280] tracking-wide">Agent Online</span>
        </div>
        <StatusBadge status={formStatus} />
      </div>
    </motion.header>
  );
}
