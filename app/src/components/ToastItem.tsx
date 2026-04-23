import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import type { Toast } from '@/types';

const toastConfig = {
  success: {
    borderColor: '#10B981',
    icon: CheckCircle,
    iconColor: '#10B981',
    bgTint: '#ECFDF5',
  },
  error: {
    borderColor: '#EF4444',
    icon: XCircle,
    iconColor: '#EF4444',
    bgTint: '#FEF2F2',
  },
  info: {
    borderColor: '#2563EB',
    icon: AlertCircle,
    iconColor: '#2563EB',
    bgTint: '#EFF6FF',
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const config = toastConfig[toast.variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-[360px] p-4 rounded-lg shadow-lg border"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: config.borderColor,
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
      }}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} style={{ color: config.iconColor, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1A1D23]">{toast.title}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}
