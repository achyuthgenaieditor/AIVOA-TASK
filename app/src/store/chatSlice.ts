import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Message, ToolExecution } from '@/types';
import { sendChatMessage } from '@/lib/api';
import type { RootState } from './appStore';

let msgIdCounter = 0;
let execIdCounter = 0;

function genMsgId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

function genExecId() {
  return `exec-${++execIdCounter}-${Date.now()}`;
}

interface ChatState {
  messages: Message[];
  toolExecutions: ToolExecution[];
  isLoading: boolean;
  showSuggestions: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      id: genMsgId(),
      role: 'assistant',
      content: `Hello! I'm your LangGraph HCP assistant. Describe a visit, ask for history, request follow-up, or generate call notes and I'll route it through the right CRM tool.`,
      timestamp: new Date(),
    },
  ],
  toolExecutions: [],
  isLoading: false,
  showSuggestions: true,
  error: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (text: string, { getState }) => {
    const state = getState() as RootState;
    return sendChatMessage(text, state.interaction.formData);
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<string>) {
      state.messages.push({
        id: genMsgId(),
        role: 'user',
        content: action.payload,
        timestamp: new Date(),
      });
      state.showSuggestions = false;
      state.isLoading = true;
      state.error = null;
    },
    addExecutingTool(state, action: PayloadAction<{ text: string; toolName: ToolExecution['toolName'] }>) {
      const id = genExecId();
      const execution: ToolExecution = {
        id,
        toolName: action.payload.toolName,
        parameters: { query: action.payload.text },
        status: 'executing',
        timestamp: new Date(),
      };
      state.toolExecutions.push(execution);
      state.messages.push({
        id: genMsgId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolCall: {
          id,
          toolName: action.payload.toolName,
          parameters: execution.parameters,
          status: 'executing',
        },
      });
    },
  },
  extraReducers: builder => {
    builder
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { message, toolExecution } = action.payload;
        const pendingTool = [...state.toolExecutions].reverse().find(exec => exec.status === 'executing');

        if (pendingTool) {
          pendingTool.status = toolExecution.status;
          pendingTool.result = toolExecution.result;
          pendingTool.toolName = toolExecution.toolName;
          state.messages = state.messages.map(item =>
            item.toolCall?.id === pendingTool.id
              ? {
                  ...item,
                  toolCall: {
                    ...item.toolCall,
                    toolName: toolExecution.toolName,
                    status: toolExecution.status === 'completed' ? 'success' : 'error',
                  },
                }
              : item
          );
        } else {
          state.toolExecutions.push({
            ...toolExecution,
            timestamp: new Date(toolExecution.timestamp),
          });
        }

        state.messages.push({
          ...message,
          timestamp: new Date(message.timestamp),
        });
        state.isLoading = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Unable to reach the AI backend.';
        state.messages.push({
          id: genMsgId(),
          role: 'assistant',
          content: `I couldn't reach the backend. Please make sure FastAPI is running on http://localhost:8000.\n\n${state.error}`,
          timestamp: new Date(),
        });
        state.toolExecutions = state.toolExecutions.map(exec =>
          exec.status === 'executing' ? { ...exec, status: 'failed', result: state.error ?? 'failed' } : exec
        );
        state.messages = state.messages.map(item =>
          item.toolCall?.status === 'executing'
            ? { ...item, toolCall: { ...item.toolCall, status: 'error' } }
            : item
        );
      });
  },
});

export const { addExecutingTool, addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;
