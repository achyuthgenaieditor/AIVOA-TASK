import { Badge } from '@/components/ui/badge';
import type { FormStatus } from '@/types';

const statusConfig: Record<FormStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-[#F0F2F5] text-[#6B7280] hover:bg-[#F0F2F5]',
  },
  filled: {
    label: 'Filled',
    className: 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF]',
  },
  saved: {
    label: 'Saved',
    className: 'bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]',
  },
};

interface StatusBadgeProps {
  status: FormStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium uppercase tracking-wider ${config.className}`}>
      {config.label}
    </Badge>
  );
}
