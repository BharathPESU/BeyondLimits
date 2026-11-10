export type FriendId = 'user' | 'bharath_cd' | 'bharath_r' | string;

export interface FriendProfile {
  id: FriendId;
  name: string;
  shortName: string;
  roleTitle: string;
  motto: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  friendId: FriendId;
  friendName: string;
  date: string; // YYYY-MM-DD
  relapsed: boolean; // false = Clean / Controlled, true = Masturbated / Relapsed
  reason: string; // Required when relapsed === true; editable inline in table
  triggerCategory: string;
  emotionState: string;
  controlNote: string;
  urgeIntensity: number; // 1 to 10
  updatedAt: string;
}

export interface FriendStats {
  friendId: FriendId;
  friendName: string;
  totalMarkedDays: number;
  cleanDays: number;
  relapseDays: number;
  disciplineRate: number; // 0 - 100
  currentStreak: number;
  longestStreak: number;
  weeklyCleanDays: number;
  weeklyRelapseDays: number;
  weeklyMarkedDays: number;
  weeklyDisciplineRate: number;
  monthlyCleanDays: number;
  monthlyRelapseDays: number;
  monthlyMarkedDays: number;
  monthlyDisciplineRate: number;
  averageUrgeIntensity: number;
}

export interface UserProgressStats {
  userId: string;
  userName: string;
  totalMarkedDays: number;
  cleanDays: number;
  relapseDays: number;
  disciplineRate: number; // 0 - 100 (% clean / self-control)
  relapseRate: number; // 0 - 100 (% relapsed)
  currentStreak: number;
  longestStreak: number;
  weeklyCleanDays: number;
  weeklyRelapseDays: number;
  weeklyMarkedDays: number;
  weeklyDisciplineRate: number;
  monthlyCleanDays: number;
  monthlyRelapseDays: number;
  monthlyMarkedDays: number;
  monthlyDisciplineRate: number;
  monthlyRelapseRate: number;
  averageUrgeIntensity: number;
  dailyBreakdown: Array<{
    date: string;
    dayName: string;
    status: 'clean' | 'relapsed' | 'unmarked';
    reason: string;
  }>;
  weeklyTrend: Array<{
    weekLabel: string;
    cleanDays: number;
    relapseDays: number;
    disciplineRate: number;
  }>;
}

export interface WeeklyAchievementComparison {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  bharathCd: {
    cleanDays: number;
    relapseDays: number;
    markedDays: number;
    disciplineRate: number;
    reasons: string[];
  };
  bharathR: {
    cleanDays: number;
    relapseDays: number;
    markedDays: number;
    disciplineRate: number;
    reasons: string[];
  };
  leader: 'bharath_cd' | 'bharath_r' | 'tie' | 'insufficient_data';
  leaderName: string;
  summaryReason: string;
  dailyBreakdown: Array<{
    date: string;
    dayName: string;
    bharathCdStatus: 'clean' | 'relapsed' | 'unmarked';
    bharathCdReason: string;
    bharathRStatus: 'clean' | 'relapsed' | 'unmarked';
    bharathRReason: string;
  }>;
}

export interface MonthlyProgressSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  bharathCd: {
    cleanDays: number;
    relapseDays: number;
    markedDays: number;
    disciplineRate: number;
  };
  bharathR: {
    cleanDays: number;
    relapseDays: number;
    markedDays: number;
    disciplineRate: number;
  };
  weeklyTrend: Array<{
    weekLabel: string;
    bharathCdRelapses: number;
    bharathRRelapses: number;
    bharathCdClean: number;
    bharathRClean: number;
  }>;
  triggerBreakdown: Array<{
    triggerCategory: string;
    count: number;
    bharathCdCount: number;
    bharathRCount: number;
  }>;
}

export interface MotivationSource {
  title: string;
  url: string;
  snippet: string;
}

export interface DailyMotivationRecord {
  date: string;
  focusTheme: string;
  headline: string;
  quote: string;
  author: string;
  actionableHabit: string;
  neuroscienceInsight: string;
  searchQuery: string;
  sources: MotivationSource[];
  generatedBy: string;
  updatedAt: string;
}

export interface ReminderLogEntry {
  id: number;
  triggeredAt: string;
  reminderDate: string;
  targetFriends: string;
  channel: string;
  status: 'sent' | 'failed';
  messagePreview: string;
}

export interface PhoneReminderConfig {
  bharathCdPhone: string;
  bharathRPhone: string;
  reminderTime: string; // HH:mm e.g. "20:00" (8:00 PM)
  timezone: string;
  enabled: boolean;
  ntfyTopic: string;
  lastTriggeredDate: string;
  twilioConfigured: boolean;
  todayStatus: {
    date: string;
    bharathCdMarked: boolean;
    bharathRMarked: boolean;
    userMarked?: boolean;
  };
  recentLogs: ReminderLogEntry[];
}

export interface DashboardPayload {
  friends: FriendProfile[];
  stats: Record<string, FriendStats>;
  userStats: UserProgressStats;
  weeklyAchievement: WeeklyAchievementComparison;
  monthlyProgress: MonthlyProgressSummary;
  records: AttendanceRecord[];
  dailyMotivation: DailyMotivationRecord;
  dailyTechNews?: DailyTechNewsRecord;
  reminderConfig: PhoneReminderConfig;
  integrationStatus: {
    tavilyConfigured: boolean;
    geminiConfigured: boolean;
    twilioConfigured: boolean;
  };
  storageInfo: {
    engine: string;
    dbPath: string;
    isVercelTmp: boolean;
    totalRecords: number;
  };
}

export interface TechNewsItem {
  id: number;
  title: string;
  category: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
  language?: string;
  country?: string;
}

export interface DailyTechNewsRecord {
  date: string;
  scheduledTime: string; // "08:00"
  items: TechNewsItem[];
  searchQuery: string;
  category?: string;
  language?: string;
  country?: string;
  generatedBy: string;
  updatedAt: string;
}

export interface MotivationalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charCount: number;
  createdAt: string;
  viaVoice?: boolean;
}

export interface PuterTxt2SpeechOptions {
  provider?: 'aws-polly' | 'openai' | 'elevenlabs';
  voice?: string;
  engine?: 'standard' | 'neural' | 'long-form' | 'generative';
  language?: string;
  model?: string;
}

export interface PuterGlobal {
  ai: {
    txt2speech: (
      text: string,
      options?: PuterTxt2SpeechOptions | boolean
    ) => Promise<HTMLAudioElement>;
    speech2txt?: (
      audio?: Blob | File | string,
      options?: Record<string, unknown>
    ) => Promise<{ text?: string } | string>;
    chat: (
      prompt: string,
      options?: { model?: string; temperature?: number }
    ) => Promise<{ message?: { content?: string }; toString?: () => string } | string>;
  };
}

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}


