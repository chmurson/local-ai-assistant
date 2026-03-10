import { z } from 'zod';
import type { TelegramInboundMessage } from '../types/telegram.js';

const telegramUpdateSchema = z
  .object({
    update_id: z.number().int(),
    message: z
      .object({
        message_id: z.number().int(),
        date: z.number().int(),
        text: z.string().min(1).optional(),
        from: z
          .object({
            id: z.union([z.number().int(), z.string().min(1)])
          })
          .optional(),
        chat: z.object({
          id: z.union([z.number().int(), z.string().min(1)])
        })
      })
      .optional()
  })
  .strict();

const telegramGetUpdatesResponseSchema = z
  .object({
    ok: z.boolean(),
    result: z.array(z.unknown())
  })
  .strict();

export function parseTelegramGetUpdatesResponse(payload: unknown): unknown[] {
  const parsed = telegramGetUpdatesResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new Error('Telegram getUpdates returned ok=false');
  }
  return parsed.result;
}

export function extractTelegramInboundMessages(updates: unknown[]): TelegramInboundMessage[] {
  const messages: TelegramInboundMessage[] = [];

  for (const candidate of updates) {
    const parsed = telegramUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }

    const message = parsed.data.message;
    if (!message?.text || !message.from) {
      continue;
    }

    const timestamp = new Date(message.date * 1000).toISOString();
    messages.push({
      updateId: parsed.data.update_id,
      chatId: String(message.chat.id),
      userId: String(message.from.id),
      messageId: message.message_id,
      timestamp,
      messageText: message.text
    });
  }

  return messages;
}
