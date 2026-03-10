export function isAllowedTelegramSource(params: {
  chatId: string;
  userId: string;
  allowedChatId: string;
  allowedUserId?: string;
}): boolean {
  const chatAllowed = String(params.chatId).trim() === String(params.allowedChatId).trim();
  if (!chatAllowed) {
    return false;
  }

  if (!params.allowedUserId) {
    return true;
  }

  return String(params.userId).trim() === String(params.allowedUserId).trim();
}
