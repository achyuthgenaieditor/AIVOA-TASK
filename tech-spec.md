# Tech Spec — AI-First CRM HCP Module

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM renderer |
| `typescript` | ^5.3.0 | Type safety |
| `vite` | ^7.2.4 | Build tool |
| `@vitejs/plugin-react` | ^4.2.0 | Vite React integration |
| `tailwindcss` | ^3.4.19 | Utility-first CSS |
| `postcss` | ^8.4.0 | CSS processing |
| `autoprefixer` | ^10.4.0 | CSS vendor prefixes |
| `lucide-react` | ^0.400.0 | Icon library (Bot, Send, FileText, Bot, RotateCcw, Check, Loader2, CheckCircle, XCircle, AlertCircle, Sparkles, Calendar, History, Clock) |
| `@radix-ui/react-tooltip` | ^1.1.0 | Accessible tooltips on form field labels |
| `framer-motion` | ^11.0.0 | Animation library — entrance sequences, panel slides, message animations, toast transitions, field highlight pulse, typing indicator, stagger orchestration |

> All packages above are NOT in the base template. After initialization, run: `cd /mnt/agents/output/app && npm install framer-motion lucide-react @radix-ui/react-tooltip`

> shadcn/ui components (Button, Card, Input, Textarea, Badge, Select, Switch, Tooltip) — already included in the 40+ pre-installed components via `init-webapp.sh`. Import from `@/components/ui/*`.

---

## Component Inventory

### shadcn/ui Components (built-in, no install needed)

| Component | Source | Usage |
|-----------|--------|-------|
| `Button` | `@/components/ui/button` | Reset Form, Save Interaction, suggested prompt pills, send button |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | `@/components/ui/card` | Panel containers (left form, right chat) |
| `Input` | `@/components/ui/input` | All 8 form fields (readOnly mode) |
| `Textarea` | `@/components/ui/textarea` | Notes field |
| `Badge` | `@/components/ui/badge` | Form status badge, sentiment display, toggle display pills |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `@/components/ui/select` | Sentiment field display (readOnly, shows selected value) |
| `Switch` | `@/components/ui/switch` | Samples Dropped, Follow-Up Required display toggles |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | `@/components/ui/tooltip` | Info tooltips on field labels |
| `ScrollArea` | `@/components/ui/scroll-area` | Chat messages scrollable area, tool execution log scroll |
| `Separator` | `@/components/ui/separator` | Dividers between panel header and body |

### Custom Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| `PageHeader` | `src/sections/PageHeader.tsx` | Fixed header bar with app icon, title, agent status, form status | `formStatus: 'draft' \| 'filled' \| 'saved'` |
| `InteractionForm` | `src/sections/InteractionForm.tsx` | Left panel — 8 read-only form fields with AI indicators, empty state, footer | `formData: FormData, onReset: () => void, onSave: () => void, highlightingFields: string[]` |
| `AIChat` | `src/sections/AIChat.tsx` | Right panel — chat interface with messages, tool bubbles, input, suggested prompts, tool log | `messages: Message[], onSend: (text: string) => void, isLoading: boolean, toolExecutions: ToolExecution[]` |
| `ChatMessage` | `src/components/ChatMessage.tsx` | Individual chat message (user or AI) with avatar, bubble, timestamp | `message: Message` |
| `ToolCallBubble` | `src/components/ToolCallBubble.tsx` | Compact tool invocation indicator in chat flow | `tool: ToolExecution` |
| `TypingIndicator` | `src/components/TypingIndicator.tsx` | Three-dot pulsing animation while AI processes | — |
| `SuggestedPrompts` | `src/components/SuggestedPrompts.tsx` | Horizontal pill buttons for quick actions | `onPromptClick: (prompt: string) => void, visible: boolean` |
| `StatusBadge` | `src/components/StatusBadge.tsx` | Pill badge for form state (draft/filled/saved/error) | `status: 'draft' \| 'filled' \| 'saved' \| 'error'` |
| `ToolBadge` | `src/components/ToolBadge.tsx` | Colored circle icon for tool identification | `toolName: string, size?: number` |
| `FormField` | `src/components/FormField.tsx` | Reusable form field row with label, AI indicator, read-only input | `label: string, tooltip: string, children: ReactNode, isAiFilled: boolean, isHighlighting: boolean` |
| `ToastContainer` | `src/components/ToastContainer.tsx` | Fixed top-right toast stack | `toasts: Toast[], onDismiss: (id: string) => void` |
| `ToastItem` | `src/components/ToastItem.tsx` | Individual toast with icon, title, message | `toast: Toast, onDismiss: () => void` |
| `ToolExecutionLog` | `src/components/ToolExecutionLog.tsx` | Collapsible panel showing LangGraph tool calls | `executions: ToolExecution[], isOpen: boolean, onToggle: () => void` |

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useChat` | `src/hooks/useChat.ts` | Manages chat state (messages, send, loading), orchestrates AI response simulation with tool calls |
| `useForm` | `src/hooks/useForm.ts` | Manages form data state, field highlighting, reset, save simulation |
| `useToast` | `src/hooks/useToast.ts` | Manages toast queue, auto-dismiss after 4s, add/remove toasts |
| `useAnimatedFields` | `src/hooks/useAnimatedFields.ts` | Tracks which fields are currently undergoing highlight animation, manages stagger timing |

---

## Animation Implementation

| Animation | Library | Implementation Approach | Complexity |
|-----------|---------|------------------------|------------|
| Header entrance | Framer Motion | `motion.header` with `initial={{ opacity: 0, y: -12 }}` `animate={{ opacity: 1, y: 0 }}` transition 400ms | Low |
| Left panel slide | Framer Motion | `motion.div` with `initial={{ opacity: 0, x: -24 }}` `animate={{ opacity: 1, x: 0 }}` transition 500ms, delay 100ms | Low |
| Right panel slide | Framer Motion | `motion.div` with `initial={{ opacity: 0, x: 24 }}` `animate={{ opacity: 1, x: 0 }}` transition 500ms, delay 200ms | Low |
| Welcome message | Framer Motion | `motion.div` inside chat, `initial={{ opacity: 0, y: 8 }}` `animate={{ opacity: 1, y: 0 }}` transition 400ms, delay 500ms | Low |
| User message | Framer Motion | `motion.div` per message, key-based `AnimatePresence` with `initial={{ opacity: 0, y: 8 }}` `animate={{ opacity: 1, y: 0 }}` 300ms | Low |
| AI message | Framer Motion | Same as user message but 400ms duration, orchestrated after tool bubble completes | Low |
| Typing indicator | CSS Keyframes | Three `span` dots with `@keyframes pulse { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }`, animation-delay 0ms / 150ms / 300ms per dot | Low |
| Tool bubble pop | Framer Motion | `motion.div` with `initial={{ scale: 0.8, opacity: 0 }}` `animate={{ scale: 1, opacity: 1 }}` transition `type: "spring", stiffness: 400, damping: 15` | Medium |
| Field fill pulse | CSS Keyframes + React state | `@keyframes fieldPulse { 0% { background: #F7F8FA } 50% { background: #EFF6FF } 100% { background: #F7F8FA } }` applied via class toggle when field enters highlighting state | Medium |
| Field border flash | CSS transition | `transition: border-color 2s ease-out` from `border-focus` to `border`, triggered by adding then removing a class after 2s | Low |
| Text typewriter | React state + setInterval | Custom hook: iterate character index at 50ms intervals (20 chars/sec), render substring. Clear interval on complete. | Medium |
| Stagger cascade | Framer Motion / manual delay | `useAnimatedFields` hook: maintain queue of fields to animate, shift every 100ms, each field triggers its own pulse + typewriter | Medium |
| Toast entrance | Framer Motion | `AnimatePresence` + `motion.div` `initial={{ x: "120%" }}` `animate={{ x: 0 }}` `exit={{ x: "120%" }}` transition 400ms | Low |
| Toast exit | Framer Motion | Same `AnimatePresence` exit animation, auto-triggered by `setTimeout` 4s after add | Low |
| Tool log expand | Framer Motion | `AnimatePresence` + `motion.div` `initial={{ height: 0 }}` `animate={{ height: 200 }}` `exit={{ height: 0 }}` transition 300ms | Low |
| Suggested prompts dismiss | Framer Motion | `AnimatePresence` `exit={{ opacity: 0, height: 0 }}` when `visible` becomes false | Low |
| Send button press | CSS transition | `active:scale-95` Tailwind class + `transition-transform duration-100` | Low |

> **Framer Motion** is the primary animation library. All entrance sequences, message animations, panel slides, toasts, and collapsible panels use it. CSS keyframes handle the infinite-loop typing indicator and field pulse (one-shot but simpler as pure CSS).

---

## State & Logic Plan

### Data Model

```typescript
// src/types/index.ts

interface FormData {
  hcpName: string;
  productDiscussed: string;
  dateOfVisit: string;       // ISO date string
  sentiment: 'Positive' | 'Neutral' | 'Negative' | '';
  samplesDropped: boolean;
  materialsShared: string[]; // ['Brochures', 'Clinical Studies', 'Pricing', 'Samples Info']
  followUpRequired: boolean;
  notes: string;
}

type MessageRole = 'user' | 'assistant';
type MessageStatus = 'sending' | 'sent' | 'error';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  toolCall?: ToolCall;       // Associated tool invocation
}

interface ToolCall {
  id: string;
  toolName: ToolName;
  parameters: Record<string, unknown>;
  status: 'executing' | 'success' | 'error';
}

type ToolName = 'log_interaction' | 'edit_interaction' | 'get_history' | 'schedule_followup' | 'generate_notes';

interface ToolExecution {
  id: string;
  toolName: ToolName;
  parameters: Record<string, unknown>;
  status: 'executing' | 'completed' | 'failed';
  timestamp: Date;
  result?: string;
}

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
}

type FormStatus = 'draft' | 'filled' | 'saved';
```

### State Distribution

```
App (root)
├── formData: FormData              ← useForm hook
├── formStatus: FormStatus          ← derived from formData (empty=draft, has data=filled, post-save=saved)
├── highlightingFields: string[]    ← useAnimatedFields hook (field names currently animating)
├── messages: Message[]             ← useChat hook
├── isLoading: boolean              ← useChat hook (AI processing)
├── toolExecutions: ToolExecution[] ← useChat hook (accumulated tool calls)
├── toasts: Toast[]                 ← useToast hook
└── toolLogOpen: boolean            ← local useState
```

### State Ownership Table

| State | Owner | Access Pattern | Notes |
|-------|-------|---------------|-------|
| `formData` | `useForm` hook | Read by InteractionForm, Write by useChat (AI populates) | Central form state, read-only in UI |
| `formStatus` | Derived from `formData` | Read by PageHeader, InteractionForm | Computed: all empty = draft, any filled = filled, after save = saved |
| `highlightingFields` | `useAnimatedFields` hook | Write by useChat (when AI populates), Read by InteractionForm | Queue-based stagger system |
| `messages` | `useChat` hook | Read/Write by AIChat, ChatMessage | Append-only message history |
| `isLoading` | `useChat` hook | Read by AIChat (typing indicator, input disabled) | True from user send until AI response complete |
| `toolExecutions` | `useChat` hook | Read by AIChat, ToolCallBubble, ToolExecutionLog | Append-only, updated when tool status changes |
| `toasts` | `useToast` hook | Read by ToastContainer, Write by useChat / useForm | Queue with auto-dismiss |
| `toolLogOpen` | Local `useState` in AIChat | Read/Write by ToolExecutionLog toggle | Pure UI toggle |

### Communication Flow

1. **User types → Send**: `useChat.sendMessage(text)` called from AIChat
2. **Chat processes**: `useChat` appends user message, sets `isLoading=true`, simulates AI pipeline:
   - Extract intent from message (keyword matching for the 5 tools)
   - Create ToolExecution entry, append to `toolExecutions`
   - Simulate LLM delay (1.5–2.5s random)
   - Update tool status → success
   - Call `useForm.populateFields(extractedData)` to update form
   - Append AI response message
   - Set `isLoading=false`
3. **Form updates**: `useForm.populateFields()` updates `formData`, triggers `useAnimatedFields` to queue highlight animations
4. **Toasts**: `useToast.addToast()` called after form population or save

### Interaction Orchestration Logic

The AI response simulation must follow this exact sequence:
1. User message appears → typing indicator starts
2. Tool bubble appears with "executing" state
3. Delay 1.5–2.5s (simulated LLM processing)
4. Tool bubble transitions to "success"
5. AI text message appears
6. Form fields animate (staggered, 100ms apart)
7. Form status updates (Draft → Filled)
8. Success toast fires

This sequencing is managed inside `useChat` via `async/await` with `setTimeout` delays to simulate network latency.

---

## Other Key Decisions

### AI Response Simulation Strategy

Since this is a frontend-only build with no real backend, the AI "intelligence" is simulated via intent classification:

- **Keyword mapping**: Each tool has trigger keywords:
  - `log_interaction`: "met", "visited", "saw", "discussed", "interaction with"
  - `edit_interaction`: "sorry", "actually", "wrong", "not", "change", "update", "correct"
  - `get_history`: "history", "previous", "past", "recent", "show me", "list"
  - `schedule_followup`: "schedule", "follow up", "follow-up", "remind", "next time"
  - `generate_notes`: "notes", "summary", "call notes", "report"
- **Entity extraction**: Regex patterns extract names (`Dr\.?\s+\w+`), products, dates, sentiments, materials
- **Default**: If no keyword match, respond as conversational fallback

This simulation is contained entirely in `src/hooks/useChat.ts` and can be replaced with real API calls to a FastAPI backend in a future iteration.

### Form Read-Only Architecture

All 8 form fields are rendered as `readOnly` inputs. There are no `onChange` handlers on form inputs. The ONLY way to modify `formData` is through `useForm.populateFields(data)` which is called exclusively by the AI simulation logic. This enforces the core UX constraint: form population happens only via AI assistant.

### Responsive Breakpoint

Single breakpoint at 1024px:
- `≥1024px`: `grid-cols-2` side-by-side panels
- `<1024px`: `grid-cols-1` stacked vertically (form above chat)

Implemented via Tailwind `lg:` prefix on the grid container.

### No External Assets

All visuals are composed from Lucide icons and CSS. No image generation or video creation is needed. The "empty state" illustration is a CSS dashed circle with an icon inside.
