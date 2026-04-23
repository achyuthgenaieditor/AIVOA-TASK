export interface FormData {
  hcpName: string;
  productDiscussed: string;
  dateOfVisit: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | '';
  samplesDropped: boolean;
  materialsShared: string[];
  followUpRequired: boolean;
  notes: string;
}

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  toolCall?: ToolCall;
}

export interface ToolCall {
  id: string;
  toolName: ToolName;
  parameters: Record<string, unknown>;
  status: 'executing' | 'success' | 'error';
}

export type ToolName = 'log_interaction' | 'edit_interaction' | 'get_history' | 'schedule_followup' | 'generate_notes';

export interface ToolExecution {
  id: string;
  toolName: ToolName;
  parameters: Record<string, unknown>;
  status: 'executing' | 'completed' | 'failed';
  timestamp: Date;
  result?: string;
}

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
}

export type FormStatus = 'draft' | 'filled' | 'saved';

export const TOOL_COLORS: Record<ToolName, string> = {
  log_interaction: '#2563EB',
  edit_interaction: '#F59E0B',
  get_history: '#8B5CF6',
  schedule_followup: '#10B981',
  generate_notes: '#EC4899',
};

export const TOOL_ICONS: Record<ToolName, string> = {
  log_interaction: 'FileText',
  edit_interaction: 'Pencil',
  get_history: 'History',
  schedule_followup: 'Calendar',
  generate_notes: 'Sparkles',
};

export const MATERIAL_OPTIONS = ['Brochures', 'Clinical Studies', 'Pricing', 'Samples Info'] as const;
