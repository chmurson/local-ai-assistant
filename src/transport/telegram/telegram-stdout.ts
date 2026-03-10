export function logTelegramConversationTurn(params: {
  chatId: string;
  userId: string;
  userMessage: string;
  assistantMessage: string;
  traceId: string;
  metaSummary?: {
    score: number;
    issues: string[];
  };
  metaError?: string;
}): void {
  console.log(`[telegram] from chat=${params.chatId} user=${params.userId}`);
  console.log(`[telegram] user: ${params.userMessage}`);
  console.log(`[telegram] assistant: ${params.assistantMessage}`);
  console.log(`[telegram] trace: ${params.traceId}`);
  if (params.metaSummary) {
    console.log(`[telegram] meta score: ${params.metaSummary.score.toFixed(2)}`);
    if (params.metaSummary.issues.length > 0) {
      console.log(`[telegram] meta issues: ${params.metaSummary.issues.join(' | ')}`);
    }
  } else if (params.metaError) {
    console.log(`[telegram] meta error: ${params.metaError}`);
  }
}
