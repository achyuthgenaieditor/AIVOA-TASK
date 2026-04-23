import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { ToolExecution } from '@/types';
import ToolBadge from './ToolBadge';

interface ToolExecutionLogProps {
  executions: ToolExecution[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function ToolExecutionLog({ executions, isOpen, onToggle }: ToolExecutionLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const orderedExecutions = useMemo(() => [...executions].reverse(), [executions]);

  return (
    <div className="border-t border-[#E5E7EB] bg-white flex-shrink-0">
      {!isOpen ? (
        <button
          onClick={onToggle}
          className="w-full text-center py-2 text-xs text-[#9CA3AF] hover:text-[#6B7280] hover:underline transition-colors cursor-pointer"
        >
          LangGraph Tool Log {executions.length > 0 ? `(${executions.length})` : ''}
        </button>
      ) : (
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 320 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="h-80 max-h-[42vh] min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E7EB] flex-shrink-0">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                    LangGraph Tool Executions
                  </span>
                  <p className="text-[11px] text-[#9CA3AF]">Click any row to view full query and result.</p>
                </div>
                <button
                  onClick={onToggle}
                  className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer"
                  aria-label="Close LangGraph tool executions"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {executions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-[#9CA3AF]">
                    No tool executions yet
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E7EB]">
                    {orderedExecutions.map(exec => {
                      const timestamp = exec.timestamp instanceof Date ? exec.timestamp : new Date(exec.timestamp);
                      const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const query = typeof exec.parameters.query === 'string'
                        ? exec.parameters.query
                        : JSON.stringify(exec.parameters);
                      const paramsFull = JSON.stringify(exec.parameters, null, 2);
                      const expanded = expandedId === exec.id;

                      return (
                        <div
                          key={exec.id}
                          className="bg-white hover:bg-[#F7F8FA] transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : exec.id)}
                            className="w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
                            aria-expanded={expanded}
                          >
                            <ToolBadge toolName={exec.toolName} size={12} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#1A1D23] capitalize">
                                {exec.toolName.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-[#9CA3AF] truncate">
                                Query: {query}
                              </p>
                              <p className="text-xs text-[#6B7280] truncate">
                                Result: {exec.result || 'Running...'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-[#9CA3AF]">{timeStr}</span>
                              {exec.status === 'executing' && <Loader2 size={14} className="loader-spin text-[#9CA3AF]" />}
                              {exec.status === 'completed' && <CheckCircle size={14} style={{ color: '#10B981' }} />}
                              {exec.status === 'failed' && <XCircle size={14} style={{ color: '#EF4444' }} />}
                              <ChevronDown
                                size={14}
                                className={`text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="mx-4 mb-3 ml-[62px] rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Query</p>
                                  <p className="mt-1 text-xs leading-relaxed text-[#1A1D23] select-text">
                                    {query}
                                  </p>
                                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Result</p>
                                  <p className="mt-1 text-xs leading-relaxed text-[#1A1D23] whitespace-pre-wrap select-text">
                                    {exec.result || 'The tool is still running.'}
                                  </p>
                                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Raw Parameters</p>
                                  <pre className="mt-1 max-h-28 overflow-y-auto rounded-md bg-white p-2 text-xs text-[#6B7280] whitespace-pre-wrap break-words select-text">
                                    {paramsFull}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
