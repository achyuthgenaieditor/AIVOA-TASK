import type { FormData, Message, ToolExecution } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface ChatResponse {
  message: Message;
  formData: Partial<FormData>;
  changedFields: string[];
  toolExecution: ToolExecution;
}

interface InteractionResponse {
  id: number;
  formData: FormData;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function sendChatMessage(text: string, currentFormData: FormData) {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ text, currentFormData }),
  });
}

export function saveInteraction(formData: FormData) {
  return request<InteractionResponse>('/api/interactions', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export function fetchInteractionHistory(hcpName?: string) {
  const params = hcpName ? `?hcpName=${encodeURIComponent(hcpName)}` : '';
  return request<InteractionResponse[]>(`/api/interactions${params}`);
}
