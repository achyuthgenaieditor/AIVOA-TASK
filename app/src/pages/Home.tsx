import { useCallback } from 'react';
import PageHeader from '@/sections/PageHeader';
import InteractionForm from '@/sections/InteractionForm';
import AIChat from '@/sections/AIChat';
import ToastContainer from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useAnimatedFields } from '@/hooks/useAnimatedFields';
import type { ToolName } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addExecutingTool, addUserMessage, sendMessage } from '@/store/chatSlice';
import { populateFields, resetForm, saveInteraction } from '@/store/interactionSlice';

function inferToolName(text: string): ToolName {
  const lower = text.toLowerCase();

  if (/\b(generate|create|write)\b.*\b(notes?|summary|report)\b/i.test(lower)) return 'generate_notes';
  if (/\b(show|get|list|view|recent|past|history)\b/i.test(lower) && /\b(history|interactions?|visits?|calls?)\b/i.test(lower)) return 'get_history';
  if (/\b(met|visited|saw|called|spoke with|spoke to|meeting with|call with|visit with)\b/i.test(lower)) return 'log_interaction';
  if (/\b(schedule|set|book|plan|arrange)\b/i.test(lower) && /\b(follow[\s-]?up|followup|remind|next)\b/i.test(lower)) return 'schedule_followup';
  if (/\b(sorry|actually|wrong|change|update|correct|not|edit|fix|modify|replace|instead|should be|make it)\b/i.test(lower)) return 'edit_interaction';

  return 'log_interaction';
}

export default function Home() {
  const dispatch = useAppDispatch();
  const { formData, formStatus, isSaving } = useAppSelector(state => state.interaction);
  const { messages, isLoading, toolExecutions, showSuggestions } = useAppSelector(state => state.chat);
  const { highlightingFields, queueFields } = useAnimatedFields();
  const { toasts, addToast, dismissToast } = useToast();

  const wrappedSendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const toolName = inferToolName(trimmed);
    dispatch(addUserMessage(trimmed));
    dispatch(addExecutingTool({ text: trimmed, toolName }));

    try {
      const response = await dispatch(sendMessage(trimmed)).unwrap();
      if (Object.keys(response.formData).length > 0) {
        dispatch(populateFields(response.formData));
        queueFields(response.changedFields);
      }

      if (response.toolExecution.status === 'completed') {
        const successTitles: Record<ToolName, string> = {
          log_interaction: 'Interaction Logged',
          edit_interaction: 'Form Updated',
          get_history: 'History Retrieved',
          schedule_followup: 'Follow-Up Planned',
          generate_notes: 'Notes Generated',
        };
        addToast('success', successTitles[response.toolExecution.toolName], response.toolExecution.result || 'Tool completed successfully.');
      }
    } catch {
      addToast('error', 'Backend Unavailable', 'Start FastAPI, then try the assistant again.');
    }
  }, [addToast, dispatch, isLoading, queueFields]);

  const handleSave = useCallback(async () => {
    try {
      await dispatch(saveInteraction(formData)).unwrap();
      addToast('success', 'Interaction Saved', 'Your interaction has been saved successfully.');
      return true;
    } catch {
      addToast('error', 'Save Failed', 'The backend could not save this interaction.');
      return false;
    }
  }, [addToast, dispatch, formData]);

  const handleReset = useCallback(() => {
    dispatch(resetForm());
    addToast('info', 'Form Reset', 'The form has been cleared.');
  }, [addToast, dispatch]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F7F8FA] lg:overflow-hidden">
      <PageHeader formStatus={formStatus} />

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto lg:overflow-hidden">
        <InteractionForm
          formData={formData}
          formStatus={formStatus}
          isSaving={isSaving}
          highlightingFields={highlightingFields}
          onReset={handleReset}
          onSave={handleSave}
        />
        <AIChat
          messages={messages}
          isLoading={isLoading}
          toolExecutions={toolExecutions}
          showSuggestions={showSuggestions}
          onSend={wrappedSendMessage}
        />
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
