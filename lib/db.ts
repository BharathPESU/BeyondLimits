import fs from 'fs';
import path from 'path';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import {
  AttendanceRecord,
  DailyMotivationRecord,
  DailyTechNewsRecord,
  DashboardPayload,
  FriendId,
  FriendProfile,
  FriendStats,
  MonthlyProgressSummary,
  MotivationSource,
  PhoneReminderConfig,
  ReminderLogEntry,
  TechNewsItem,
  UserProgressStats,
  WeeklyAchievementComparison,
} from './types';

interface ResolvedDbConfig {
  dbPath: string;
  isVercelTmp: boolean;
}

interface StoredSchemaState {
  friends: FriendProfile[];
  attendanceLogs: AttendanceRecord[];
  dailyMotivations: Record<string, DailyMotivationRecord>;
  dailyTechNews: Record<string, DailyTechNewsRecord>;
  reminderSettings: {
    bharathCdPhone: string;
    bharathRPhone: string;
    reminderTime: string;
    timezone: string;
    enabled: boolean;
    ntfyTopic: string;
    lastTriggeredDate: string;
    updatedAt: string;
  };
  reminderLogs: ReminderLogEntry[];
  nextAttendanceId: number;
  nextReminderLogId: number;
}

const DEFAULT_TECH_NEWS_ITEMS: TechNewsItem[] = [
  {
    id: 1,
    title: 'Next-Gen Frontier AI Agents Automate End-to-End Software Engineering Workflows',
    category: 'AI Models & Agents',
    summary:
      'Leading AI labs rolled out autonomous coding and reasoning models capable of planning, testing, and deploying multi-file production codebases with significantly lower latency.',
    source: 'AI & Tech Daily Briefing',
    url: 'https://news.ycombinator.com',
    publishedAt: '07:00 AM Today',
  },
  {
    id: 2,
    title: 'Breakthrough in On-Device Neural Processing Cuts Mobile AI Power Usage by 45%',
    category: 'Chips & Hardware',
    summary:
      'New NPUs and quantized inference engines enable smartphones and laptops to run multimodal voice and vision models locally with near-zero cloud latency.',
    source: 'Semiconductor & Systems Review',
    url: 'https://techcrunch.com/category/artificial-intelligence/',
    publishedAt: '07:00 AM Today',
  },
  {
    id: 3,
    title: 'Open-Source Multimodal Speech & Reasoning Models Reach New Benchmark Highs',
    category: 'Open Source AI',
    summary:
      'Developers now have access to compact open-weights models that combine real-time voice synthesis, code generation, and long-context document retrieval.',
    source: 'Developer Tech Wire',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
    publishedAt: '07:00 AM Today',
  },
  {
    id: 4,
    title: 'Cloud Infrastructure Providers Expand High-Density GPU & Custom Silicon Clusters',
    category: 'Cloud & Infra',
    summary:
      'Hyperscalers announced next-generation liquid-cooled AI superclusters designed to train and serve trillion-parameter reasoning systems cleanly and efficiently.',
    source: 'Cloud & Systems Digest',
    url: 'https://arstechnica.com/information-technology/',
    publishedAt: '07:00 AM Today',
  },
  {
    id: 5,
    title: 'AI-Assisted Robotics & Smart Automation Accelerate Real-World Manufacturing',
    category: 'Robotics & Future Tech',
    summary:
      'Vision-language-action models are helping physical robots learn complex dexterity tasks in hours rather than months of manual programming.',
    source: 'MIT Technology Review',
    url: 'https://www.technologyreview.com',
    publishedAt: '07:00 AM Today',
  },
];

function resolveDatabasePath(): ResolvedDbConfig {
  if (process.env.SQLITE_DB_PATH && process.env.SQLITE_DB_PATH.trim().length > 0) {
    return {
      dbPath: process.env.SQLITE_DB_PATH.trim(),
      isVercelTmp: process.env.SQLITE_DB_PATH.startsWith('/tmp'),
    };
  }

  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    return {
      dbPath: path.join('/tmp', 'discipline-tracker-store.json'),
      isVercelTmp: true,
    };
  }

  const localDataDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    fs.accessSync(localDataDir, fs.constants.W_OK);
    return {
      dbPath: path.join(localDataDir, 'discipline-tracker-store.json'),
      isVercelTmp: false,
    };
  } catch {
    return {
      dbPath: path.join('/tmp', 'discipline-tracker-store.json'),
      isVercelTmp: true,
    };
  }
}

let memoryStore: StoredSchemaState | null = null;
let dbConfigCache: ResolvedDbConfig | null = null;

function createInitialSeedState(): StoredSchemaState {
  const nowIso = new Date().toISOString();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const friends: FriendProfile[] = [
    {
      id: 'bharath_cd',
      name: 'Bharath CD',
      shortName: 'CD',
      roleTitle: 'Accountability Partner A',
      motto: 'Discipline over impulse. Zero excuses.',
      createdAt: nowIso,
    },
    {
      id: 'bharath_r',
      name: 'Bharath R',
      shortName: 'BR',
      roleTitle: 'Accountability Partner B',
      motto: 'Master the mind, master the day.',
      createdAt: nowIso,
    },
  ];

  const sampleHistory: Array<{
    daysAgo: number;
    cd: {
      relapsed: boolean;
      reason: string;
      trigger: string;
      emotion: string;
      note: string;
      urge: number;
    };
    br: {
      relapsed: boolean;
      reason: string;
      trigger: string;
      emotion: string;
      note: string;
      urge: number;
    };
  }> = [
    {
      daysAgo: 11,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Morning gym session and coding study kept mind occupied.',
        urge: 2,
      },
      br: {
        relapsed: true,
        reason: 'Stayed awake scrolling reels past 1:00 AM alone in room.',
        trigger: 'Late Night Phone Use',
        emotion: 'Bored / Restless',
        note: 'Need to leave phone outside bedroom after 10:30 PM.',
        urge: 8,
      },
    },
    {
      daysAgo: 10,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Calm',
        note: 'Cold shower and evening walk.',
        urge: 3,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Determined',
        note: 'Kept phone on desk away from bed.',
        urge: 4,
      },
    },
    {
      daysAgo: 9,
      cd: {
        relapsed: true,
        reason: 'High exam & project stress led to procrastination in the afternoon.',
        trigger: 'Academic / Work Stress',
        emotion: 'Stressed / Anxious',
        note: 'Work in library or shared study space when stressed.',
        urge: 7,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Completed full workout and read 20 pages.',
        urge: 2,
      },
    },
    {
      daysAgo: 8,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Determined',
        note: 'Reset mindset immediately and stayed busy.',
        urge: 3,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Calm',
        note: 'Early sleep schedule worked well.',
        urge: 2,
      },
    },
    {
      daysAgo: 7,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Productive day with zero idle browsing.',
        urge: 2,
      },
      br: {
        relapsed: true,
        reason: 'Unplanned idle weekend afternoon with no schedule.',
        trigger: 'Boredom / Idle Time',
        emotion: 'Lethargic',
        note: 'Must plan weekend hours in advance.',
        urge: 7,
      },
    },
    {
      daysAgo: 6,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Disciplined',
        note: 'Did 50 pushups when urge hit.',
        urge: 4,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Checked in with Bharath CD in the evening.',
        urge: 3,
      },
    },
    {
      daysAgo: 5,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Calm',
        note: 'Strong routine maintained all day.',
        urge: 2,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Disciplined',
        note: 'Meditation for 10 mins before sleep.',
        urge: 2,
      },
    },
    {
      daysAgo: 4,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Zero social media triggers.',
        urge: 1,
      },
      br: {
        relapsed: true,
        reason: 'Triggered by social media explore feed late at night.',
        trigger: 'Social Media Trigger',
        emotion: 'Impulsive',
        note: 'Installed app blocker after 10 PM.',
        urge: 8,
      },
    },
    {
      daysAgo: 3,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Disciplined',
        note: 'Stayed accountable and focused on project tasks.',
        urge: 2,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Determined',
        note: 'App blocker helped avoid late-night scrolling.',
        urge: 3,
      },
    },
    {
      daysAgo: 2,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Calm',
        note: 'Evening run and cold shower.',
        urge: 2,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Studied until 10 PM then slept directly.',
        urge: 2,
      },
    },
    {
      daysAgo: 1,
      cd: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Focused',
        note: 'Full self-control maintained.',
        urge: 1,
      },
      br: {
        relapsed: false,
        reason: '',
        trigger: 'None',
        emotion: 'Calm',
        note: 'Consistent routine and accountability call.',
        urge: 2,
      },
    },
  ];

  const attendanceLogs: AttendanceRecord[] = [];
  let nextId = 1;

  for (const item of sampleHistory) {
    const logDate = format(subDays(today, item.daysAgo), 'yyyy-MM-dd');
    attendanceLogs.push({
      id: nextId++,
      friendId: 'bharath_cd',
      friendName: 'Bharath CD',
      date: logDate,
      relapsed: item.cd.relapsed,
      reason: item.cd.reason,
      triggerCategory: item.cd.trigger,
      emotionState: item.cd.emotion,
      controlNote: item.cd.note,
      urgeIntensity: item.cd.urge,
      updatedAt: nowIso,
    });
    attendanceLogs.push({
      id: nextId++,
      friendId: 'bharath_r',
      friendName: 'Bharath R',
      date: logDate,
      relapsed: item.br.relapsed,
      reason: item.br.reason,
      triggerCategory: item.br.trigger,
      emotionState: item.br.emotion,
      controlNote: item.br.note,
      urgeIntensity: item.br.urge,
      updatedAt: nowIso,
    });
  }

  const defaultSources: MotivationSource[] = [
    {
      title: 'Stanford Dopamine & Impulse Mastery Research — Huberman Lab',
      url: 'https://www.hubermanlab.com/newsletter/tools-to-manage-dopamine-and-improve-motivation-and-drive',
      snippet:
        'Resisting short-term cheap dopamine spikes preserves baseline motivation and strengthens prefrontal cortex willpower pathways.',
    },
    {
      title: 'Atomic Habits: Environment Design & Self-Control — James Clear',
      url: 'https://jamesclear.com/self-control',
      snippet:
        'People with high self-control spend less time in tempting situations. Designing your evening environment removes 80% of relapse triggers.',
    },
  ];

  const defaultMotivation: DailyMotivationRecord = {
    date: todayStr,
    focusTheme: 'Self-Discipline & Dopamine Mastery',
    headline: 'Every Urge Conquered Transfers Raw Energy Into Your Real Ambitions',
    quote:
      'You have power over your mind — not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius · Meditations',
    actionableHabit:
      'At 8:00 PM tonight, check in your clean attendance, dock your phone outside the bed area by 10:30 PM, and replace late-night scrolling with 15 minutes of reading or planning tomorrow.',
    neuroscienceInsight:
      'Every time you override a sudden impulse, the anterior mid-cingulate cortex (the brain’s willpower hub) physically grows stronger, making long-term career and academic focus effortless.',
    searchQuery: 'scientific habits self discipline dopamine mastery success motivation',
    sources: defaultSources,
    generatedBy: 'Daily Discipline Briefing (Tap Refresh for Live Tavily + Gemini Search)',
    updatedAt: nowIso,
  };

  const defaultTechNews: DailyTechNewsRecord = {
    date: todayStr,
    scheduledTime: '07:00',
    items: DEFAULT_TECH_NEWS_ITEMS,
    searchQuery: 'top 5 latest artificial intelligence and technology news breakthroughs today',
    generatedBy: '7:00 AM Scheduled Briefing (Tap Refresh for Live Tavily Search)',
    updatedAt: nowIso,
  };

  const defaultTopic =
    process.env.NTFY_TOPIC && process.env.NTFY_TOPIC.trim().length > 0
      ? process.env.NTFY_TOPIC.trim()
      : 'bharath-cd-r-attendance-8pm';

  return {
    friends,
    attendanceLogs,
    dailyMotivations: {
      [todayStr]: defaultMotivation,
    },
    dailyTechNews: {
      [todayStr]: defaultTechNews,
    },
    reminderSettings: {
      bharathCdPhone: '+919876543210',
      bharathRPhone: '+919876543211',
      reminderTime: '20:00',
      timezone: 'Asia/Kolkata',
      enabled: true,
      ntfyTopic: defaultTopic,
      lastTriggeredDate: '',
      updatedAt: nowIso,
    },
    reminderLogs: [],
    nextAttendanceId: nextId,
    nextReminderLogId: 1,
  };
}

function loadStore(): { store: StoredSchemaState; config: ResolvedDbConfig } {
  const config = dbConfigCache || resolveDatabasePath();
  dbConfigCache = config;

  if (memoryStore) {
    return { store: memoryStore, config };
  }

  try {
    if (fs.existsSync(config.dbPath)) {
      const raw = fs.readFileSync(config.dbPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoredSchemaState>;
      const fallback = createInitialSeedState();
      memoryStore = {
        friends:
          Array.isArray(parsed.friends) && parsed.friends.length > 0
            ? parsed.friends
            : fallback.friends,
        attendanceLogs: Array.isArray(parsed.attendanceLogs)
          ? parsed.attendanceLogs
          : fallback.attendanceLogs,
        dailyMotivations:
          parsed.dailyMotivations && typeof parsed.dailyMotivations === 'object'
            ? parsed.dailyMotivations
            : fallback.dailyMotivations,
        dailyTechNews:
          parsed.dailyTechNews && typeof parsed.dailyTechNews === 'object'
            ? parsed.dailyTechNews
            : fallback.dailyTechNews,
        reminderSettings:
          parsed.reminderSettings && typeof parsed.reminderSettings === 'object'
            ? { ...fallback.reminderSettings, ...parsed.reminderSettings }
            : fallback.reminderSettings,
        reminderLogs: Array.isArray(parsed.reminderLogs)
          ? parsed.reminderLogs
          : [],
        nextAttendanceId:
          typeof parsed.nextAttendanceId === 'number'
            ? parsed.nextAttendanceId
            : fallback.nextAttendanceId,
        nextReminderLogId:
          typeof parsed.nextReminderLogId === 'number'
            ? parsed.nextReminderLogId
            : 1,
      };
      return { store: memoryStore, config };
    }
  } catch {
    // Fallback to fresh seed if file is missing or unreadable
  }

  memoryStore = createInitialSeedState();
  persistStore(memoryStore, config);
  return { store: memoryStore, config };
}

function persistStore(store: StoredSchemaState, config?: ResolvedDbConfig): void {
  const resolved = config || dbConfigCache || resolveDatabasePath();
  try {
    const dir = path.dirname(resolved.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved.dbPath, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Keep in-memory state if filesystem is read-only
  }
}

export function getDb(): { store: StoredSchemaState; config: ResolvedDbConfig } {
  return loadStore();
}

export function getDailyMotivation(dateStr?: string): DailyMotivationRecord {
  const { store, config } = loadStore();
  const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');

  if (store.dailyMotivations[targetDate]) {
    return store.dailyMotivations[targetDate];
  }

  const dates = Object.keys(store.dailyMotivations).sort().reverse();
  if (dates.length > 0) {
    return store.dailyMotivations[dates[0]];
  }

  const seeded = createInitialSeedState().dailyMotivations[targetDate];
  if (seeded) {
    store.dailyMotivations[targetDate] = seeded;
    persistStore(store, config);
    return seeded;
  }

  const fallbackRecord: DailyMotivationRecord = {
    date: targetDate,
    focusTheme: 'Self-Discipline & Dopamine Mastery',
    headline: 'Every Urge Conquered Transfers Raw Energy Into Your Real Ambitions',
    quote:
      'You have power over your mind — not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    actionableHabit:
      'At 8:00 PM tonight, check in your clean attendance and dock your phone outside the bedroom.',
    neuroscienceInsight:
      'Resisting short-term impulses strengthens prefrontal willpower pathways.',
    searchQuery: 'self discipline motivation success',
    sources: [],
    generatedBy: 'Daily Discipline Briefing',
    updatedAt: new Date().toISOString(),
  };

  store.dailyMotivations[targetDate] = fallbackRecord;
  persistStore(store, config);
  return fallbackRecord;
}

export function saveDailyMotivation(
  record: Omit<DailyMotivationRecord, 'updatedAt'>
): DailyMotivationRecord {
  const { store, config } = loadStore();
  const saved: DailyMotivationRecord = {
    ...record,
    sources: record.sources || [],
    updatedAt: new Date().toISOString(),
  };
  store.dailyMotivations[record.date] = saved;
  persistStore(store, config);
  return saved;
}

export function getReminderConfig(): PhoneReminderConfig {
  const { store } = loadStore();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayLogs = store.attendanceLogs.filter((r) => r.date === todayStr);
  const bharathCdMarked = todayLogs.some((r) => r.friendId === 'bharath_cd');
  const bharathRMarked = todayLogs.some((r) => r.friendId === 'bharath_r');

  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_PHONE
  );

  return {
    bharathCdPhone: store.reminderSettings.bharathCdPhone,
    bharathRPhone: store.reminderSettings.bharathRPhone,
    reminderTime: store.reminderSettings.reminderTime,
    timezone: store.reminderSettings.timezone,
    enabled: store.reminderSettings.enabled,
    ntfyTopic: store.reminderSettings.ntfyTopic,
    lastTriggeredDate: store.reminderSettings.lastTriggeredDate,
    twilioConfigured,
    todayStatus: {
      date: todayStr,
      bharathCdMarked,
      bharathRMarked,
    },
    recentLogs: [...store.reminderLogs].slice(0, 8),
  };
}

export function updateReminderSettings(input: {
  bharathCdPhone: string;
  bharathRPhone: string;
  reminderTime: string;
  timezone: string;
  enabled: boolean;
  ntfyTopic: string;
}): PhoneReminderConfig {
  const { store, config } = loadStore();

  store.reminderSettings = {
    ...store.reminderSettings,
    bharathCdPhone: input.bharathCdPhone.trim(),
    bharathRPhone: input.bharathRPhone.trim(),
    reminderTime: input.reminderTime.trim(),
    timezone: input.timezone.trim(),
    enabled: Boolean(input.enabled),
    ntfyTopic: input.ntfyTopic.trim() || 'bharath-cd-r-attendance-8pm',
    updatedAt: new Date().toISOString(),
  };

  persistStore(store, config);
  return getReminderConfig();
}

export function recordReminderDispatch(entry: {
  reminderDate: string;
  targetFriends: string;
  channel: string;
  status: 'sent' | 'failed';
  messagePreview: string;
  markDateTriggered?: boolean;
}) {
  const { store, config } = loadStore();

  const newLog: ReminderLogEntry = {
    id: store.nextReminderLogId++,
    triggeredAt: new Date().toISOString(),
    reminderDate: entry.reminderDate,
    targetFriends: entry.targetFriends,
    channel: entry.channel,
    status: entry.status,
    messagePreview: entry.messagePreview,
  };

  store.reminderLogs.unshift(newLog);
  if (store.reminderLogs.length > 30) {
    store.reminderLogs = store.reminderLogs.slice(0, 30);
  }

  if (entry.markDateTriggered && entry.status === 'sent') {
    store.reminderSettings.lastTriggeredDate = entry.reminderDate;
    store.reminderSettings.updatedAt = new Date().toISOString();
  }

  persistStore(store, config);
}

function computeStreaks(recordsAsc: Array<{ date: string; relapsed: boolean }>): {
  currentStreak: number;
  longestStreak: number;
} {
  let longestStreak = 0;
  let running = 0;

  for (const r of recordsAsc) {
    if (!r.relapsed) {
      running += 1;
      if (running > longestStreak) {
        longestStreak = running;
      }
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  for (let i = recordsAsc.length - 1; i >= 0; i--) {
    if (!recordsAsc[i].relapsed) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

export function getDashboardPayload(referenceDateStr?: string): DashboardPayload {
  const { store, config } = loadStore();
  const refDate = referenceDateStr ? parseISO(referenceDateStr) : new Date();

  const weekStartDate = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(refDate, { weekStartsOn: 1 });
  const weekStart = format(weekStartDate, 'yyyy-MM-dd');
  const weekEnd = format(weekEndDate, 'yyyy-MM-dd');

  const monthStartDate = startOfMonth(refDate);
  const monthEndDate = endOfMonth(refDate);
  const monthStart = format(monthStartDate, 'yyyy-MM-dd');
  const monthEnd = format(monthEndDate, 'yyyy-MM-dd');

  const friendRows = [...store.friends].sort((a, b) => a.id.localeCompare(b.id));

  const records: AttendanceRecord[] = [...store.attendanceLogs].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return a.friendId.localeCompare(b.friendId);
  });

  const stats = {} as Record<FriendId, FriendStats>;

  for (const friend of friendRows) {
    const fRecordsDesc = records.filter((r) => r.friendId === friend.id);
    const fRecordsAsc = [...fRecordsDesc].sort((a, b) => a.date.localeCompare(b.date));

    const totalMarkedDays = fRecordsDesc.length;
    const cleanDays = fRecordsDesc.filter((r) => !r.relapsed).length;
    const relapseDays = fRecordsDesc.filter((r) => r.relapsed).length;
    const disciplineRate =
      totalMarkedDays > 0 ? Math.round((cleanDays / totalMarkedDays) * 100) : 100;

    const { currentStreak, longestStreak } = computeStreaks(fRecordsAsc);

    const weekRecords = fRecordsDesc.filter(
      (r) => r.date >= weekStart && r.date <= weekEnd
    );
    const weeklyMarkedDays = weekRecords.length;
    const weeklyCleanDays = weekRecords.filter((r) => !r.relapsed).length;
    const weeklyRelapseDays = weekRecords.filter((r) => r.relapsed).length;
    const weeklyDisciplineRate =
      weeklyMarkedDays > 0
        ? Math.round((weeklyCleanDays / weeklyMarkedDays) * 100)
        : 100;

    const monthRecords = fRecordsDesc.filter(
      (r) => r.date >= monthStart && r.date <= monthEnd
    );
    const monthlyMarkedDays = monthRecords.length;
    const monthlyCleanDays = monthRecords.filter((r) => !r.relapsed).length;
    const monthlyRelapseDays = monthRecords.filter((r) => r.relapsed).length;
    const monthlyDisciplineRate =
      monthlyMarkedDays > 0
        ? Math.round((monthlyCleanDays / monthlyMarkedDays) * 100)
        : 100;

    const avgUrge =
      totalMarkedDays > 0
        ? Number(
            (
              fRecordsDesc.reduce((acc, item) => acc + item.urgeIntensity, 0) /
              totalMarkedDays
            ).toFixed(1)
          )
        : 0;

    stats[friend.id] = {
      friendId: friend.id,
      friendName: friend.name,
      totalMarkedDays,
      cleanDays,
      relapseDays,
      disciplineRate,
      currentStreak,
      longestStreak,
      weeklyCleanDays,
      weeklyRelapseDays,
      weeklyMarkedDays,
      weeklyDisciplineRate,
      monthlyCleanDays,
      monthlyRelapseDays,
      monthlyMarkedDays,
      monthlyDisciplineRate,
      averageUrgeIntensity: avgUrge,
    };
  }

  const cdWeek = stats.bharath_cd;
  const brWeek = stats.bharath_r;

  let leader: 'bharath_cd' | 'bharath_r' | 'tie' | 'insufficient_data' = 'tie';
  let leaderName = 'Tied Discipline Standings';
  let summaryReason = '';

  if (cdWeek.weeklyMarkedDays === 0 && brWeek.weeklyMarkedDays === 0) {
    leader = 'insufficient_data';
    leaderName = 'No Attendance Marked This Week';
    summaryReason =
      'Mark daily attendance for both friends to calculate the weekly winner.';
  } else if (cdWeek.weeklyRelapseDays < brWeek.weeklyRelapseDays) {
    leader = 'bharath_cd';
    leaderName = 'Bharath CD';
    summaryReason = `Leading with fewer relapses (${cdWeek.weeklyRelapseDays} vs ${brWeek.weeklyRelapseDays}) and ${cdWeek.weeklyCleanDays} clean days this week.`;
  } else if (brWeek.weeklyRelapseDays < cdWeek.weeklyRelapseDays) {
    leader = 'bharath_r';
    leaderName = 'Bharath R';
    summaryReason = `Leading with fewer relapses (${brWeek.weeklyRelapseDays} vs ${cdWeek.weeklyRelapseDays}) and ${brWeek.weeklyCleanDays} clean days this week.`;
  } else if (cdWeek.weeklyCleanDays > brWeek.weeklyCleanDays) {
    leader = 'bharath_cd';
    leaderName = 'Bharath CD';
    summaryReason = `Equal relapses (${cdWeek.weeklyRelapseDays}), but Bharath CD has more verified clean attendance days (${cdWeek.weeklyCleanDays} vs ${brWeek.weeklyCleanDays}).`;
  } else if (brWeek.weeklyCleanDays > cdWeek.weeklyCleanDays) {
    leader = 'bharath_r';
    leaderName = 'Bharath R';
    summaryReason = `Equal relapses (${brWeek.weeklyRelapseDays}), but Bharath R has more verified clean attendance days (${brWeek.weeklyCleanDays} vs ${cdWeek.weeklyCleanDays}).`;
  } else {
    leader = 'tie';
    leaderName = 'Both Tied for Weekly Achievement';
    summaryReason = `Both Bharath CD and Bharath R have ${cdWeek.weeklyRelapseDays} relapses and ${cdWeek.weeklyCleanDays} clean days this week.`;
  }

  const weekDays = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });
  const dailyBreakdown = weekDays.map((dayObj) => {
    const dStr = format(dayObj, 'yyyy-MM-dd');
    const cdRec = records.find((r) => r.friendId === 'bharath_cd' && r.date === dStr);
    const brRec = records.find((r) => r.friendId === 'bharath_r' && r.date === dStr);

    return {
      date: dStr,
      dayName: format(dayObj, 'EEE, MMM d'),
      bharathCdStatus: cdRec
        ? cdRec.relapsed
          ? ('relapsed' as const)
          : ('clean' as const)
        : ('unmarked' as const),
      bharathCdReason: cdRec?.reason || '',
      bharathRStatus: brRec
        ? brRec.relapsed
          ? ('relapsed' as const)
          : ('clean' as const)
        : ('unmarked' as const),
      bharathRReason: brRec?.reason || '',
    };
  });

  const weeklyAchievement: WeeklyAchievementComparison = {
    weekStart,
    weekEnd,
    weekLabel: `${format(weekStartDate, 'MMM d')} – ${format(weekEndDate, 'MMM d, yyyy')}`,
    bharathCd: {
      cleanDays: cdWeek.weeklyCleanDays,
      relapseDays: cdWeek.weeklyRelapseDays,
      markedDays: cdWeek.weeklyMarkedDays,
      disciplineRate: cdWeek.weeklyDisciplineRate,
      reasons: records
        .filter(
          (r) =>
            r.friendId === 'bharath_cd' &&
            r.date >= weekStart &&
            r.date <= weekEnd &&
            r.relapsed &&
            r.reason
        )
        .map((r) => r.reason),
    },
    bharathR: {
      cleanDays: brWeek.weeklyCleanDays,
      relapseDays: brWeek.weeklyRelapseDays,
      markedDays: brWeek.weeklyMarkedDays,
      disciplineRate: brWeek.weeklyDisciplineRate,
      reasons: records
        .filter(
          (r) =>
            r.friendId === 'bharath_r' &&
            r.date >= weekStart &&
            r.date <= weekEnd &&
            r.relapsed &&
            r.reason
        )
        .map((r) => r.reason),
    },
    leader,
    leaderName,
    summaryReason,
    dailyBreakdown,
  };

  const weeklyTrend: MonthlyProgressSummary['weeklyTrend'] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = startOfWeek(subDays(refDate, i * 7), { weekStartsOn: 1 });
    const wEnd = addDays(wStart, 6);
    const wStartStr = format(wStart, 'yyyy-MM-dd');
    const wEndStr = format(wEnd, 'yyyy-MM-dd');

    const cdInWeek = records.filter(
      (r) => r.friendId === 'bharath_cd' && r.date >= wStartStr && r.date <= wEndStr
    );
    const brInWeek = records.filter(
      (r) => r.friendId === 'bharath_r' && r.date >= wStartStr && r.date <= wEndStr
    );

    weeklyTrend.push({
      weekLabel: `${format(wStart, 'MMM d')}`,
      bharathCdRelapses: cdInWeek.filter((r) => r.relapsed).length,
      bharathRRelapses: brInWeek.filter((r) => r.relapsed).length,
      bharathCdClean: cdInWeek.filter((r) => !r.relapsed).length,
      bharathRClean: brInWeek.filter((r) => !r.relapsed).length,
    });
  }

  const relapseRecords = records.filter((r) => r.relapsed);
  const triggerMap = new Map<
    string,
    { count: number; bharathCdCount: number; bharathRCount: number }
  >();

  for (const r of relapseRecords) {
    const key =
      r.triggerCategory && r.triggerCategory !== 'None'
        ? r.triggerCategory
        : 'Unspecified Trigger';
    const existing = triggerMap.get(key) || {
      count: 0,
      bharathCdCount: 0,
      bharathRCount: 0,
    };
    existing.count += 1;
    if (r.friendId === 'bharath_cd') {
      existing.bharathCdCount += 1;
    } else {
      existing.bharathRCount += 1;
    }
    triggerMap.set(key, existing);
  }

  const triggerBreakdown = Array.from(triggerMap.entries())
    .map(([triggerCategory, counts]) => ({
      triggerCategory,
      ...counts,
    }))
    .sort((a, b) => b.count - a.count);

  const monthlyProgress: MonthlyProgressSummary = {
    monthKey: format(refDate, 'yyyy-MM'),
    monthLabel: format(refDate, 'MMMM yyyy'),
    bharathCd: {
      cleanDays: cdWeek.monthlyCleanDays,
      relapseDays: cdWeek.monthlyRelapseDays,
      markedDays: cdWeek.monthlyMarkedDays,
      disciplineRate: cdWeek.monthlyDisciplineRate,
    },
    bharathR: {
      cleanDays: brWeek.monthlyCleanDays,
      relapseDays: brWeek.monthlyRelapseDays,
      markedDays: brWeek.monthlyMarkedDays,
      disciplineRate: brWeek.monthlyDisciplineRate,
    },
    weeklyTrend,
    triggerBreakdown,
  };

  // Build unified individual user stats & habit tracking timeline
  const userDailyMap = new Map<string, AttendanceRecord>();
  for (const r of records) {
    const existing = userDailyMap.get(r.date);
    if (!existing) {
      userDailyMap.set(r.date, r);
    } else if (r.friendId === 'user') {
      userDailyMap.set(r.date, r);
    } else if (existing.friendId !== 'user' && r.friendId === 'bharath_cd') {
      userDailyMap.set(r.date, r);
    }
  }

  const userRecordsDesc = Array.from(userDailyMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const userRecordsAsc = [...userRecordsDesc].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const userTotalMarked = userRecordsDesc.length;
  const userCleanDays = userRecordsDesc.filter((r) => !r.relapsed).length;
  const userRelapseDays = userRecordsDesc.filter((r) => r.relapsed).length;
  const userDisciplineRate =
    userTotalMarked > 0 ? Math.round((userCleanDays / userTotalMarked) * 100) : 100;
  const userRelapseRate =
    userTotalMarked > 0 ? Math.round((userRelapseDays / userTotalMarked) * 100) : 0;

  // Streak calculations
  let userCurrentStreak = 0;
  for (let i = userRecordsAsc.length - 1; i >= 0; i--) {
    if (!userRecordsAsc[i].relapsed) {
      userCurrentStreak++;
    } else {
      break;
    }
  }

  let userLongestStreak = 0;
  let userTempStreak = 0;
  for (const rec of userRecordsAsc) {
    if (!rec.relapsed) {
      userTempStreak++;
      if (userTempStreak > userLongestStreak) userLongestStreak = userTempStreak;
    } else {
      userTempStreak = 0;
    }
  }

  // Weekly user stats
  const userWeeklyRecords = userRecordsDesc.filter(
    (r) => r.date >= weekStart && r.date <= weekEnd
  );
  const userWeeklyClean = userWeeklyRecords.filter((r) => !r.relapsed).length;
  const userWeeklyRelapse = userWeeklyRecords.filter((r) => r.relapsed).length;
  const userWeeklyMarked = userWeeklyRecords.length;
  const userWeeklyRate =
    userWeeklyMarked > 0 ? Math.round((userWeeklyClean / userWeeklyMarked) * 100) : 100;

  // Monthly user stats
  const userMonthlyRecords = userRecordsDesc.filter(
    (r) => r.date >= monthStart && r.date <= monthEnd
  );
  const userMonthlyClean = userMonthlyRecords.filter((r) => !r.relapsed).length;
  const userMonthlyRelapse = userMonthlyRecords.filter((r) => r.relapsed).length;
  const userMonthlyMarked = userMonthlyRecords.length;
  const userMonthlyRate =
    userMonthlyMarked > 0
      ? Math.round((userMonthlyClean / userMonthlyMarked) * 100)
      : 100;
  const userMonthlyRelapseRate =
    userMonthlyMarked > 0
      ? Math.round((userMonthlyRelapse / userMonthlyMarked) * 100)
      : 0;

  const totalUrge = userRecordsDesc.reduce(
    (sum, r) => sum + (r.urgeIntensity || 2),
    0
  );
  const userAvgUrge =
    userTotalMarked > 0 ? Number((totalUrge / userTotalMarked).toFixed(1)) : 2;

  // Daily breakdown for the current week (Mon-Sun)
  const userDailyBreakdown = weekDays.map((dayObj) => {
    const dStr = format(dayObj, 'yyyy-MM-dd');
    const rec = userDailyMap.get(dStr);
    return {
      date: dStr,
      dayName: format(dayObj, 'EEE, MMM d'),
      status: rec
        ? rec.relapsed
          ? ('relapsed' as const)
          : ('clean' as const)
        : ('unmarked' as const),
      reason: rec?.reason || '',
    };
  });

  // Weekly trend for 4 weeks (to show progress across the month)
  const userWeeklyTrend: UserProgressStats['weeklyTrend'] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = startOfWeek(subDays(refDate, i * 7), { weekStartsOn: 1 });
    const wEnd = addDays(wStart, 6);
    const wStartStr = format(wStart, 'yyyy-MM-dd');
    const wEndStr = format(wEnd, 'yyyy-MM-dd');

    const inWeek = userRecordsDesc.filter(
      (r) => r.date >= wStartStr && r.date <= wEndStr
    );
    const cleanInWeek = inWeek.filter((r) => !r.relapsed).length;
    const relapseInWeek = inWeek.filter((r) => r.relapsed).length;
    const totalInWeek = inWeek.length;
    const rateInWeek =
      totalInWeek > 0 ? Math.round((cleanInWeek / totalInWeek) * 100) : 100;

    userWeeklyTrend.push({
      weekLabel: format(wStart, 'MMM d'),
      cleanDays: cleanInWeek,
      relapseDays: relapseInWeek,
      disciplineRate: rateInWeek,
    });
  }

  const userStats: UserProgressStats = {
    userId: 'user',
    userName: 'You',
    totalMarkedDays: userTotalMarked,
    cleanDays: userCleanDays,
    relapseDays: userRelapseDays,
    disciplineRate: userDisciplineRate,
    relapseRate: userRelapseRate,
    currentStreak: userCurrentStreak,
    longestStreak: userLongestStreak,
    weeklyCleanDays: userWeeklyClean,
    weeklyRelapseDays: userWeeklyRelapse,
    weeklyMarkedDays: userWeeklyMarked,
    weeklyDisciplineRate: userWeeklyRate,
    monthlyCleanDays: userMonthlyClean,
    monthlyRelapseDays: userMonthlyRelapse,
    monthlyMarkedDays: userMonthlyMarked,
    monthlyDisciplineRate: userMonthlyRate,
    monthlyRelapseRate: userMonthlyRelapseRate,
    averageUrgeIntensity: userAvgUrge,
    dailyBreakdown: userDailyBreakdown,
    weeklyTrend: userWeeklyTrend,
  };

  const dailyMotivation = getDailyMotivation(format(refDate, 'yyyy-MM-dd'));
  const dailyTechNews = getDailyTechNews(format(refDate, 'yyyy-MM-dd'));
  const reminderConfig = getReminderConfig();
  if (reminderConfig?.todayStatus) {
    reminderConfig.todayStatus.userMarked = userRecordsDesc.some(
      (r) => r.date === format(refDate, 'yyyy-MM-dd')
    );
  }

  const tavilyConfigured = Boolean(
    process.env.TAVILY_API_KEY &&
      process.env.TAVILY_API_KEY.trim().length > 0 &&
      process.env.TAVILY_API_KEY !== 'MY_TAVILY_API_KEY'
  );
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim().length > 0 &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );

  return {
    friends: friendRows,
    stats,
    userStats,
    weeklyAchievement,
    monthlyProgress,
    records,
    dailyMotivation,
    dailyTechNews,
    reminderConfig,
    integrationStatus: {
      tavilyConfigured,
      geminiConfigured,
      twilioConfigured: reminderConfig.twilioConfigured,
    },
    storageInfo: {
      engine: 'Persistent Local & Serverless Store',
      dbPath: config.dbPath,
      isVercelTmp: config.isVercelTmp,
      totalRecords: records.length,
    },
  };
}

export interface UpsertAttendanceInput {
  friendId?: string;
  friendName?: string;
  date: string;
  relapsed: boolean;
  reason?: string;
  triggerCategory?: string;
  emotionState?: string;
  controlNote?: string;
  urgeIntensity?: number;
}

export function upsertAttendanceRecord(
  input: UpsertAttendanceInput
): AttendanceRecord {
  const { store, config } = loadStore();

  const cleanReason = (input.reason ?? '').trim();
  if (input.relapsed && cleanReason.length < 3) {
    throw new Error(
      'A clear reason (at least 3 characters) is mandatory when marking as Masturbated / Relapsed.'
    );
  }

  const triggerCategory = input.relapsed
    ? (input.triggerCategory || 'Impulse / Unspecified').trim()
    : 'None';

  const emotionState = (
    input.emotionState || (input.relapsed ? 'Stressed / Impulsive' : 'Focused')
  ).trim();
  const controlNote = (input.controlNote ?? '').trim();
  const urgeIntensity = Math.min(
    10,
    Math.max(1, Number(input.urgeIntensity ?? (input.relapsed ? 7 : 2)))
  );

  const targetFriendId = (input.friendId || 'user').trim();
  const targetFriendName = (
    input.friendName ||
    (targetFriendId === 'bharath_cd'
      ? 'Bharath CD'
      : targetFriendId === 'bharath_r'
      ? 'Bharath R'
      : 'You')
  ).trim();
  const nowIso = new Date().toISOString();

  const existingIdx = store.attendanceLogs.findIndex(
    (r) =>
      (r.friendId === targetFriendId ||
        (targetFriendId === 'user' && r.friendId === 'bharath_cd')) &&
      r.date === input.date
  );

  let savedRecord: AttendanceRecord;
  if (existingIdx >= 0) {
    savedRecord = {
      ...store.attendanceLogs[existingIdx],
      friendId: targetFriendId,
      friendName: targetFriendName,
      relapsed: input.relapsed,
      reason: cleanReason,
      triggerCategory,
      emotionState,
      controlNote,
      urgeIntensity,
      updatedAt: nowIso,
    };
    store.attendanceLogs[existingIdx] = savedRecord;
  } else {
    savedRecord = {
      id: store.nextAttendanceId++,
      friendId: targetFriendId,
      friendName: targetFriendName,
      date: input.date,
      relapsed: input.relapsed,
      reason: cleanReason,
      triggerCategory,
      emotionState,
      controlNote,
      urgeIntensity,
      updatedAt: nowIso,
    };
    store.attendanceLogs.push(savedRecord);
  }

  persistStore(store, config);
  return savedRecord;
}

export interface UpdateReasonInput {
  id: number;
  reason: string;
  triggerCategory?: string;
  emotionState?: string;
  controlNote?: string;
}

export function updateAttendanceReasonById(
  input: UpdateReasonInput
): AttendanceRecord {
  const { store, config } = loadStore();

  const idx = store.attendanceLogs.findIndex((r) => r.id === input.id);
  if (idx === -1) {
    throw new Error('Attendance record not found.');
  }

  const existing = store.attendanceLogs[idx];
  const trimmedReason = input.reason.trim();
  if (existing.relapsed && trimmedReason.length < 3) {
    throw new Error(
      'Reason cannot be empty for a relapse entry. Please explain why it happened.'
    );
  }

  const updated: AttendanceRecord = {
    ...existing,
    reason: trimmedReason,
    triggerCategory: input.triggerCategory?.trim() || existing.triggerCategory,
    emotionState: input.emotionState?.trim() || existing.emotionState,
    controlNote:
      input.controlNote !== undefined
        ? input.controlNote.trim()
        : existing.controlNote,
    updatedAt: new Date().toISOString(),
  };

  store.attendanceLogs[idx] = updated;
  persistStore(store, config);
  return updated;
}

export function deleteAttendanceById(id: number): void {
  const { store, config } = loadStore();
  store.attendanceLogs = store.attendanceLogs.filter((r) => r.id !== id);
  persistStore(store, config);
}

export function getDailyTechNews(dateStr?: string): DailyTechNewsRecord {
  const { store, config } = loadStore();
  const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');

  const existing = store.dailyTechNews[targetDate];
  if (existing && Array.isArray(existing.items) && existing.items.length > 0) {
    return existing;
  }

  return saveDailyTechNews({
    date: targetDate,
    scheduledTime: '07:00',
    items: DEFAULT_TECH_NEWS_ITEMS,
    searchQuery:
      'top 5 latest artificial intelligence and technology news breakthroughs today',
    generatedBy:
      '7:00 AM Scheduled Briefing (Tap Refresh for Live Tavily Search)',
  });
}

export function saveDailyTechNews(
  record: Omit<DailyTechNewsRecord, 'updatedAt'>
): DailyTechNewsRecord {
  const { store, config } = loadStore();

  const saved: DailyTechNewsRecord = {
    date: record.date,
    scheduledTime: record.scheduledTime || '07:00',
    items: (record.items || DEFAULT_TECH_NEWS_ITEMS).slice(0, 5),
    searchQuery: record.searchQuery,
    generatedBy: record.generatedBy,
    updatedAt: new Date().toISOString(),
  };

  store.dailyTechNews[record.date] = saved;
  persistStore(store, config);
  return saved;
}
