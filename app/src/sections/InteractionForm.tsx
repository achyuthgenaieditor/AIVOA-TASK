import { motion, AnimatePresence } from 'framer-motion';
import { FileText, RotateCcw, Check, Sparkles, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FormData, FormStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';

interface InteractionFormProps {
  formData: FormData;
  formStatus: FormStatus;
  isSaving: boolean;
  highlightingFields: string[];
  onReset: () => void;
  onSave: () => Promise<boolean>;
}

const fieldConfig = [
  { key: 'hcpName', label: 'HCP NAME', tooltip: 'Full name of the Healthcare Professional', type: 'text', placeholder: 'e.g., Dr. Sarah Smith' },
  { key: 'productDiscussed', label: 'PRODUCT DISCUSSED', tooltip: 'Product or therapy discussed during the visit', type: 'text', placeholder: 'e.g., ProductX Tablets' },
  { key: 'dateOfVisit', label: 'DATE OF VISIT', tooltip: 'Date when the interaction took place', type: 'date', placeholder: 'Select date' },
  { key: 'sentiment', label: 'SENTIMENT', tooltip: 'Overall sentiment of the interaction', type: 'sentiment', placeholder: '' },
  { key: 'samplesDropped', label: 'SAMPLES DROPPED', tooltip: 'Were product samples provided?', type: 'toggle', placeholder: '' },
  { key: 'materialsShared', label: 'MATERIALS SHARED', tooltip: 'Promotional materials shared during the visit', type: 'materials', placeholder: '' },
  { key: 'followUpRequired', label: 'FOLLOW-UP REQUIRED', tooltip: 'Is a follow-up action needed?', type: 'followup', placeholder: '' },
  { key: 'notes', label: 'NOTES', tooltip: 'Additional observations or context', type: 'textarea', placeholder: 'Notes will appear here...' },
] as const;

function isFieldFilled(key: string, formData: FormData): boolean {
  const value = formData[key as keyof FormData];
  if (typeof value === 'string') return value !== '';
  if (typeof value === 'boolean') return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function getSentimentBorderColor(sentiment: string) {
  switch (sentiment) {
    case 'Positive': return '#10B981';
    case 'Neutral': return '#F59E0B';
    case 'Negative': return '#EF4444';
    default: return 'transparent';
  }
}

export default function InteractionForm({
  formData,
  formStatus,
  isSaving,
  highlightingFields,
  onReset,
  onSave,
}: InteractionFormProps) {
  const hasData = Object.values(formData).some(v =>
    typeof v === 'string' ? v !== '' :
    typeof v === 'boolean' ? v === true :
    Array.isArray(v) ? v.length > 0 : false
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col min-h-[520px] lg:min-h-0 lg:h-full overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2563EB]" />
          <h2 className="text-base font-semibold text-[#1A1D23]" style={{ letterSpacing: '-0.01em' }}>
            Interaction Details
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={formStatus} />
          <button
            onClick={onReset}
            className="p-1.5 text-[#9CA3AF] hover:text-[#6B7280] transition-colors rounded-md hover:bg-[#F0F2F5] cursor-pointer"
            title="Clear form"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Form Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          {fieldConfig.map(field => {
            const isHighlighting = highlightingFields.includes(field.key);
            const isFilled = isFieldFilled(field.key, formData);
            const value = formData[field.key as keyof FormData];

            return (
              <div key={field.key}>
                {/* Label Row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                      {field.label}
                    </span>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info size={12} className="text-[#9CA3AF] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-xs">
                          {field.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isFilled && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#2563EB]">
                      <Sparkles size={10} />
                      AI
                    </span>
                  )}
                </div>

                {/* Input */}
                <div
                  className={isHighlighting ? 'field-highlight rounded-md' : ''}
                  style={{
                    borderLeft: isHighlighting ? `3px solid #2563EB` : undefined,
                    paddingLeft: isHighlighting ? '9px' : undefined,
                    marginLeft: isHighlighting ? '-12px' : undefined,
                    transition: 'border-left-color 2s ease-out',
                  }}
                >
                  {field.type === 'text' && (
                    <Input
                      value={value as string}
                      placeholder={field.placeholder}
                      readOnly
                      className="bg-[#F7F8FA] border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] cursor-default focus-visible:ring-[#2563EB] focus-visible:ring-1"
                    />
                  )}

                  {field.type === 'date' && (
                    <Input
                      type="date"
                      value={value as string}
                      placeholder={field.placeholder}
                      readOnly
                      className="bg-[#F7F8FA] border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] cursor-default focus-visible:ring-[#2563EB] focus-visible:ring-1"
                    />
                  )}

                  {field.type === 'sentiment' && (
                    <div
                      className="h-10 px-3 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] flex items-center text-sm"
                      style={{
                        borderLeftWidth: (value as string) ? 3 : 1,
                        borderLeftColor: getSentimentBorderColor(value as string),
                      }}
                    >
                      <span className={value ? 'text-[#1A1D23]' : 'text-[#9CA3AF]'}>
                        {(value as string) || 'Not specified'}
                      </span>
                    </div>
                  )}

                  {field.type === 'toggle' && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          (value as boolean)
                            ? 'bg-[#ECFDF5] text-[#10B981]'
                            : 'bg-[#F0F2F5] text-[#6B7280]'
                        }`}
                      >
                        {(value as boolean) ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}

                  {field.type === 'materials' && (
                    <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                      {(value as string[]).length > 0 ? (
                        (value as string[]).map(mat => (
                          <span
                            key={mat}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#2563EB]"
                          >
                            {mat}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[#9CA3AF] py-1">None selected</span>
                      )}
                    </div>
                  )}

                  {field.type === 'followup' && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          (value as boolean)
                            ? 'bg-[#FEF3C7] text-[#F59E0B]'
                            : 'bg-[#F0F2F5] text-[#6B7280]'
                        }`}
                      >
                        {(value as boolean) ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}

                  {field.type === 'textarea' && (
                    <Textarea
                      value={value as string}
                      placeholder={field.placeholder}
                      readOnly
                      rows={3}
                      className="bg-[#F7F8FA] border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] cursor-default resize-none focus-visible:ring-[#2563EB] focus-visible:ring-1"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Footer Buttons */}
      <AnimatePresence>
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#E5E7EB]"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-[#6B7280] border-[#E5E7EB] hover:bg-[#F0F2F5] hover:text-[#1A1D23] cursor-pointer"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset Form
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
            >
              {isSaving ? (
                <svg className="loader-spin mr-1.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <Check size={14} className="mr-1.5" />
              )}
              Save Interaction
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
