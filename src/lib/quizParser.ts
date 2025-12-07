import { QuizQuestion, QuizOption, ParseResult, Quiz, QuizSettings } from '@/types/quiz';

const generateToken = (length: number = 8): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const generateQuizId = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 5);
  return `${slug}-${date}-${rand}`;
};

export const parseQuizDocument = (text: string, teacherName: string = 'Teacher'): ParseResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const questions: QuizQuestion[] = [];
  let answerKeyMissing = false;

  // Extract title from first line or heading
  const lines = text.trim().split('\n');
  let title = 'Untitled Quiz';
  let description = '';
  let startIndex = 0;

  // Check for title in first lines
  if (lines[0]) {
    const titleMatch = lines[0].match(/^#?\s*(.+)$/);
    if (titleMatch && !lines[0].match(/^\d+[\.\)]/)) {
      title = titleMatch[1].trim();
      startIndex = 1;
      
      // Check for description
      if (lines[1] && !lines[1].match(/^\d+[\.\)]/)) {
        description = lines[1].trim();
        startIndex = 2;
      }
    }
  }

  // Parse global settings from text
  const defaultSettings: QuizSettings = {
    mode: 'live',
    creatorOnlyLogin: true,
    joinRequiresLogin: false,
    guestNameUnique: true,
    defaultTimerSeconds: 8,
    displayAllQuestionsAtOnce: false,
    negativeMarkingDefault: 0,
    shuffleQuestions: false,
    shuffleOptions: false,
    maxParticipants: 500,
  };

  // Look for settings markers
  const settingsMatch = text.match(/\(default\s*timer:\s*(\d+)s?\)/i);
  if (settingsMatch) {
    defaultSettings.defaultTimerSeconds = parseInt(settingsMatch[1]);
  }
  
  const negativeMatch = text.match(/\(negative:\s*([-\d.]+)\)/i);
  if (negativeMatch) {
    defaultSettings.negativeMarkingDefault = parseFloat(negativeMatch[1]);
  }

  const allVisibleMatch = text.match(/\(all[\s-]visible\)/i);
  if (allVisibleMatch) {
    defaultSettings.displayAllQuestionsAtOnce = true;
  }

  // Split into question blocks
  const questionPattern = /(?:^|\n)(\d+)[\.\)]\s*/;
  const content = lines.slice(startIndex).join('\n');
  const parts = content.split(questionPattern).filter(Boolean);

  for (let i = 0; i < parts.length; i += 2) {
    const qNum = parts[i];
    const qContent = parts[i + 1];
    
    if (!qContent) continue;

    const qid = `q${qNum}`;
    
    // Parse options (A), B), C), D) or A. B. C. D.
    const optionPattern = /([A-Z])[\.\)]\s*(.+?)(?=(?:[A-Z][\.\)]|\[|$|\(time|\(\+))/gs;
    const options: QuizOption[] = [];
    let optionMatch;
    
    const cleanContent = qContent.replace(/\[Answer:[^\]]+\]/gi, '').replace(/✓/g, '');
    
    while ((optionMatch = optionPattern.exec(cleanContent)) !== null) {
      options.push({
        oid: optionMatch[1],
        text: optionMatch[2].trim(),
      });
    }

    if (options.length < 2) {
      errors.push(`Question ${qNum}: Must have at least 2 options`);
      continue;
    }

    // Extract question stem
    const stemEnd = cleanContent.search(/[A-Z][\.\)]/);
    const stem = stemEnd > 0 ? cleanContent.substring(0, stemEnd).trim() : cleanContent.split('\n')[0].trim();

    // Find correct answer
    const answerMatch = qContent.match(/\[Answer:\s*([A-Z,\s]+)\]/i) || qContent.match(/([A-Z])\s*✓/);
    let correct: string[] = [];
    if (answerMatch) {
      correct = answerMatch[1].split(/[,\s]+/).filter(Boolean);
    } else {
      answerKeyMissing = true;
      warnings.push(`Question ${qNum}: Answer key missing, please specify correct answer`);
    }

    // Parse points and timer
    const pointsMatch = qContent.match(/\(\+?([\d.]+)\s*\/\s*([-\d.]+)\)/);
    const timerMatch = qContent.match(/\(time:\s*(\d+)s?\)/i);

    const pointsIfCorrect = pointsMatch ? parseFloat(pointsMatch[1]) : 1;
    const pointsIfWrong = pointsMatch ? parseFloat(pointsMatch[2]) : defaultSettings.negativeMarkingDefault;
    const timerSeconds = timerMatch ? Math.max(3, parseInt(timerMatch[1])) : defaultSettings.defaultTimerSeconds;

    if (timerMatch && parseInt(timerMatch[1]) < 3) {
      warnings.push(`Question ${qNum}: Timer increased to minimum 3 seconds`);
    }

    // Extract explanation
    const explanationMatch = qContent.match(/\[Explanation:\s*(.+?)\]/i);
    const explanation = explanationMatch ? explanationMatch[1] : null;

    questions.push({
      qid,
      rawText: qContent.trim(),
      stem,
      media: [],
      options,
      correct,
      pointsIfCorrect,
      pointsIfWrong,
      timerSeconds,
      openAt: null,
      closeAt: null,
      explanation,
    });
  }

  if (questions.length === 0) {
    errors.push('No valid questions found in the document');
  }

  const token = generateToken(8);
  const quizId = generateQuizId(title);

  const quiz: Partial<Quiz> = {
    quizId,
    title,
    description,
    settings: defaultSettings,
    join: {
      joinUrlPattern: `${window.location.origin}/j/{quizId}?t={token}`,
      qrPayload: `${quizId}|${token}`,
      tokenLength: 8,
      token,
    },
    questions,
    participants: [],
    leaderboard: {
      enabled: true,
      displayNamesAnonymized: false,
      topN: 10,
    },
    metadata: {
      createdBy: teacherName,
      createdAt: new Date().toISOString(),
      language: 'en',
      notes: warnings.join('; '),
    },
    errors,
    answerKeyMissing,
    status: answerKeyMissing ? 'draft' : 'ready',
    currentQuestionIndex: -1,
  };

  return { quiz, errors, warnings, answerKeyMissing };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
