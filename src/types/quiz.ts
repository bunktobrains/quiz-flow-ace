export interface QuizMedia {
  type: 'image' | 'audio' | 'video';
  url: string;
  caption?: string;
}

export interface QuizOption {
  oid: string;
  text: string;
}

export interface QuizQuestion {
  qid: string;
  rawText: string;
  stem: string;
  media: QuizMedia[];
  options: QuizOption[];
  correct: string[];
  pointsIfCorrect: number;
  pointsIfWrong: number;
  timerSeconds: number;
  openAt: string | null;
  closeAt: string | null;
  explanation?: string | null;
}

export interface QuizSettings {
  mode: 'live';
  creatorOnlyLogin: boolean;
  joinRequiresLogin: boolean;
  guestNameUnique: boolean;
  defaultTimerSeconds: number;
  displayAllQuestionsAtOnce: boolean;
  negativeMarkingDefault: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxParticipants: number;
}

export interface QuizJoin {
  joinUrlPattern: string;
  qrPayload: string;
  tokenLength: number;
  token: string;
}

export interface QuizParticipant {
  participantId: string;
  displayName: string;
  score: number;
  correctCount: number;
  joinedAt: string;
}

export interface QuizLeaderboard {
  enabled: boolean;
  displayNamesAnonymized: boolean;
  topN: number;
}

export interface QuizMetadata {
  createdBy: string;
  createdAt: string;
  language: string;
  notes?: string;
}

export interface Quiz {
  id: string;
  quizId: string;
  title: string;
  description: string;
  settings: QuizSettings;
  join: QuizJoin;
  questions: QuizQuestion[];
  participants: QuizParticipant[];
  leaderboard: QuizLeaderboard;
  metadata: QuizMetadata;
  errors: string[];
  answerKeyMissing: boolean;
  status: 'draft' | 'ready' | 'live' | 'ended';
  currentQuestionIndex: number;
  startedAt?: string;
  endedAt?: string;
}

export interface QuizSession {
  sessionId: string;
  quizId: string;
  participantId: string;
  displayName: string;
  answers: Record<string, string[]>;
  score: number;
  correctCount: number;
  joinedAt: string;
}

// Parser types
export interface ParseResult {
  quiz: Partial<Quiz>;
  errors: string[];
  warnings: string[];
  answerKeyMissing: boolean;
}
