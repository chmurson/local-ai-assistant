import OpenAI from 'openai';
import type { ChatMessage, LlmTextResponse } from '../types/llm.js';

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const baseURL = process.env.LM_STUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1';
  const apiKey = process.env.LM_STUDIO_API_KEY ?? 'lm-studio';

  cachedClient = new OpenAI({ baseURL, apiKey });
  return cachedClient;
}

export async function generateText(params: {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  messages: ChatMessage[];
}): Promise<LlmTextResponse> {
  const client = getClient();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? '30000');
  const response = await client.chat.completions.create({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.maxOutputTokens,
    messages: params.messages
  }, {
    timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000
  });

  const choice = response.choices[0];
  const text = choice?.message?.content ?? '';
  return {
    text,
    model: response.model ?? params.model
  };
}
