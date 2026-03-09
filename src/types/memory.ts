export interface UserPreferenceMemory {
  preferredLanguage?: string;
  preferredAnswerStyle?: string;
}

export interface SystemLearningMemory {
  successfulPromptPatterns: string[];
  failedPromptPatterns: string[];
  notes: string[];
}

export interface LongTermMemory {
  userPreferences: UserPreferenceMemory;
  systemLearning: SystemLearningMemory;
}
