import { extractTelegramInboundMessages, parseTelegramGetUpdatesResponse } from '../../schemas/telegram-schema.js';
import type { TelegramHealthResponse, TelegramInboundMessage } from '../../types/telegram.js';

interface TelegramApiBaseResponse {
  ok: boolean;
  result?: unknown;
}

function buildTelegramApiUrl(botToken: string, method: string): string {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

async function callTelegramApi(params: {
  botToken: string;
  method: string;
  payload: Record<string, unknown>;
}): Promise<TelegramApiBaseResponse> {
  const response = await fetch(buildTelegramApiUrl(params.botToken, params.method), {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(params.payload)
  });

  if (!response.ok) {
    throw new Error(`Telegram API ${params.method} failed with status ${response.status}`);
  }

  const json = (await response.json()) as TelegramApiBaseResponse;
  if (!json.ok) {
    throw new Error(`Telegram API ${params.method} returned ok=false`);
  }
  return json;
}

export async function getTelegramHealth(botToken: string): Promise<TelegramHealthResponse> {
  const response = await callTelegramApi({
    botToken,
    method: 'getMe',
    payload: {}
  });

  const result = response.result as
    | {
        id?: number;
        username?: string;
      }
    | undefined;

  return {
    ok: true,
    ...(typeof result?.id === 'number' ? { id: result.id } : {}),
    ...(typeof result?.username === 'string' ? { username: result.username } : {})
  };
}

export async function getTelegramUpdates(params: {
  botToken: string;
  offset?: number;
  timeoutSec: number;
  limit: number;
}): Promise<TelegramInboundMessage[]> {
  const response = await callTelegramApi({
    botToken: params.botToken,
    method: 'getUpdates',
    payload: {
      offset: params.offset,
      timeout: params.timeoutSec,
      limit: params.limit,
      allowed_updates: ['message']
    }
  });

  const updates = parseTelegramGetUpdatesResponse({
    ok: response.ok,
    result: response.result
  });
  return extractTelegramInboundMessages(updates);
}

export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
  replyToMessageId?: number;
}): Promise<void> {
  await callTelegramApi({
    botToken: params.botToken,
    method: 'sendMessage',
    payload: {
      chat_id: params.chatId,
      text: params.text,
      ...(params.replyToMessageId ? { reply_to_message_id: params.replyToMessageId } : {})
    }
  });
}
