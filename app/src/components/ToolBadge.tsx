import { FileText, Pencil, History, Calendar, Sparkles, type LucideIcon } from 'lucide-react';
import type { ToolName } from '@/types';
import { TOOL_COLORS } from '@/types';

const iconMap: Record<ToolName, LucideIcon> = {
  log_interaction: FileText,
  edit_interaction: Pencil,
  get_history: History,
  schedule_followup: Calendar,
  generate_notes: Sparkles,
};

interface ToolBadgeProps {
  toolName: ToolName;
  size?: number;
}

export default function ToolBadge({ toolName, size = 14 }: ToolBadgeProps) {
  const Icon = iconMap[toolName];
  const color = TOOL_COLORS[toolName];

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 28,
        height: 28,
        backgroundColor: `${color}1A`,
        border: `1.5px solid ${color}4D`,
      }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}
