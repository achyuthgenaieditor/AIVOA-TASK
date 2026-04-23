export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
      </div>
      <div className="bg-[#F0F2F5] rounded-lg px-4 py-3 border-l-[3px] border-l-[#EFF6FF]">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#9CA3AF] inline-block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#9CA3AF] inline-block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#9CA3AF] inline-block" />
        </div>
      </div>
    </div>
  );
}
