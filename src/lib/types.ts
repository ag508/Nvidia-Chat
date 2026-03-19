export interface Model {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  modelId: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  name: string;
  type: string;
  data: string;  // base64 data URI
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface ChatRequest {
  messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[];
  modelId: string;
  conversationId: string;
}
