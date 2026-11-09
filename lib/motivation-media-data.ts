export interface MotivationalSong {
  id: number;
  title: string;
  artist: string;
  searchQuery: string;
  fallbackQuery: string;
  defaultVideoIds: string[];
  audioSrc: string;
  audioFallbackSrc?: string;
  genre?: string;
}

export interface MotivationalShort {
  id: number;
  title: string;
  tag: string;
  searchQuery: string;
  defaultVideoIds: string[];
}

export interface MotivationalQuoteItem {
  id: number;
  text: string;
}

export const MOTIVATIONAL_SONGS: MotivationalSong[] = [
  {
    id: 1,
    title: 'Lose Yourself',
    artist: 'Eminem',
    genre: 'High-Energy Gym Rock',
    audioSrc: '/audio/take-the-lead.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20the%20Lead.mp3',
    searchQuery: 'Eminem Lose Yourself Official Music Video',
    fallbackQuery: 'Eminem Lose Yourself lyrics',
    defaultVideoIds: ['tR1ECf4sEpw', '_Yhyp-_hX2s', 'xFYQQPAOz7Y'],
  },
  {
    id: 2,
    title: 'Hall of Fame',
    artist: 'The Script ft. will.i.am',
    genre: 'Electronic Cardio Drive',
    audioSrc: '/audio/volatile-reaction.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3',
    searchQuery: 'The Script Hall of Fame Official Music Video',
    fallbackQuery: 'The Script Hall of Fame lyrics',
    defaultVideoIds: ['3Kxf2dHlDpQ', 'mk48xRzuNvA', 'v8xgecy_ivw'],
  },
  {
    id: 3,
    title: 'Unstoppable',
    artist: 'Sia',
    genre: 'Heavy Bass Action Beat',
    audioSrc: '/audio/hitman.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3',
    searchQuery: 'Sia Unstoppable Official Music Video',
    fallbackQuery: 'Sia Unstoppable lyrics',
    defaultVideoIds: ['oS07d8Gr4tw', 'YaEG2aWJnZ8', 'jJvDnYdD8JQ'],
  },
  {
    id: 4,
    title: 'Eye of the Tiger',
    artist: 'Survivor',
    genre: 'Peak Intensity Cardio',
    audioSrc: '/audio/exhilarate.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exhilarate.mp3',
    searchQuery: 'Survivor Eye of the Tiger Official Music Video',
    fallbackQuery: 'Survivor Eye of the Tiger lyrics',
    defaultVideoIds: ['_qDML_BCju8', 'btPJPFnesV4', 'Wwdsf6F60Tg'],
  },
  {
    id: 5,
    title: 'Remember the Name',
    artist: 'Fort Minor',
    genre: 'Industrial Power Synth',
    audioSrc: '/audio/mechanolith.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mechanolith.mp3',
    searchQuery: 'Fort Minor Remember the Name Official',
    fallbackQuery: 'Fort Minor Remember the Name lyrics',
    defaultVideoIds: ['4yB58XHHqO4', 'VDvr08sCPOc', 'FXITAw5nY8I'],
  },
  {
    id: 6,
    title: 'Believer',
    artist: 'Imagine Dragons',
    genre: 'Steady Rhythm Workout Pulse',
    audioSrc: '/audio/decisions.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Decisions.mp3',
    searchQuery: 'Imagine Dragons Believer Official Music Video',
    fallbackQuery: 'Imagine Dragons Believer lyrics',
    defaultVideoIds: ['W0DM5lcj6mw', '7wtfhZwyrcc', 'z3J_MCbwaJ0'],
  },
  {
    id: 7,
    title: 'Till I Collapse',
    artist: 'Eminem',
    genre: 'High-Impact Gym Drive',
    audioSrc: '/audio/take-the-lead.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20the%20Lead.mp3',
    searchQuery: 'Eminem Till I Collapse Official Audio',
    fallbackQuery: 'Eminem Till I Collapse lyrics',
    defaultVideoIds: ['ytQ5CYE1VZw', 'Obim8BYGnOE', 'gY9C0ItyO0k'],
  },
  {
    id: 8,
    title: 'Whatever It Takes',
    artist: 'Imagine Dragons',
    genre: 'Adrenaline Cardio Pulse',
    audioSrc: '/audio/volatile-reaction.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3',
    searchQuery: 'Imagine Dragons Whatever It Takes Official',
    fallbackQuery: 'Imagine Dragons Whatever It Takes lyrics',
    defaultVideoIds: ['M66U_DuMCS8', 'gOsM-DYAEhY', 'v_B3qkp4nO4'],
  },
  {
    id: 9,
    title: 'The Climb',
    artist: 'Miley Cyrus',
    genre: 'Uplifting Motivational Rhythm',
    audioSrc: '/audio/decisions.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Decisions.mp3',
    searchQuery: 'Miley Cyrus The Climb Official',
    fallbackQuery: 'Miley Cyrus The Climb lyrics',
    defaultVideoIds: ['NG2zyeVRcbs', 'wOwblaKmyVw', 'PBZfCmlRIVs'],
  },
  {
    id: 10,
    title: "Stronger (What Doesn't Kill You)",
    artist: 'Kelly Clarkson',
    genre: 'High-Tempo Workout Energy',
    audioSrc: '/audio/exhilarate.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exhilarate.mp3',
    searchQuery: 'Kelly Clarkson Stronger Official',
    fallbackQuery: 'Kelly Clarkson Stronger lyrics',
    defaultVideoIds: ['Xn676-fLq7I', 'cRM70Jw7F4M', 'k2qgadSvNyU'],
  },
  {
    id: 11,
    title: 'Rise Up',
    artist: 'Andra Day',
    genre: 'Epic Dramatic Action Beat',
    audioSrc: '/audio/hitman.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3',
    searchQuery: 'Andra Day Rise Up Official',
    fallbackQuery: 'Andra Day Rise Up lyrics',
    defaultVideoIds: ['lwgr_IMeEgA', 'kNKu1uNBVkU', 'FBuIBaDSOa4'],
  },
  {
    id: 12,
    title: 'Fight Song',
    artist: 'Rachel Platten',
    genre: 'Heavy Synth Power',
    audioSrc: '/audio/mechanolith.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mechanolith.mp3',
    searchQuery: 'Rachel Platten Fight Song Official',
    fallbackQuery: 'Rachel Platten Fight Song lyrics',
    defaultVideoIds: ['xo1VInw-SKc', 'XbxNtPiCBK8', 'mOO5qRjVFLw'],
  },
  {
    id: 13,
    title: "Can't Hold Us",
    artist: 'Macklemore & Ryan Lewis',
    genre: 'Gym Rock Cardio',
    audioSrc: '/audio/take-the-lead.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20the%20Lead.mp3',
    searchQuery: 'Macklemore Cant Hold Us Official',
    fallbackQuery: 'Macklemore Cant Hold Us lyrics',
    defaultVideoIds: ['2zNSgSzhBfM', 'VG3JsmOmDqw', 'xHRkHFxD-xY'],
  },
  {
    id: 14,
    title: "It's My Life",
    artist: 'Bon Jovi',
    genre: 'Fast Paced Rock Rhythm',
    audioSrc: '/audio/volatile-reaction.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3',
    searchQuery: 'Bon Jovi Its My Life Official',
    fallbackQuery: 'Bon Jovi Its My Life lyrics',
    defaultVideoIds: ['vx2u5uUu3DE', 'bY3vXr7fm8k', 'lDK9QqIzhwk'],
  },
  {
    id: 15,
    title: 'On Top of the World',
    artist: 'Imagine Dragons',
    genre: 'Uplifting Victory Drive',
    audioSrc: '/audio/exhilarate.mp3',
    audioFallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exhilarate.mp3',
    searchQuery: 'Imagine Dragons On Top of the World Official',
    fallbackQuery: 'Imagine Dragons On Top of the World lyrics',
    defaultVideoIds: ['w5tWYmIOWGk', 'g8PrTzLaLHc', 'mWRsgZuwf_8'],
  },
];

export const MOTIVATIONAL_SHORTS: MotivationalShort[] = [
  {
    id: 1,
    title: 'Nobody Is Coming to Save You',
    tag: '#SelfReliance',
    searchQuery: 'nobody is coming to save you motivation shorts',
    defaultVideoIds: ['wnHW6o8WMas', 'g-jwWYX7Jlo', 'ZXsQAXx_ao0'],
  },
  {
    id: 2,
    title: 'Believe in Yourself',
    tag: '#Belief',
    searchQuery: 'believe in yourself you can do anything shorts',
    defaultVideoIds: ['mgmVOuLgFB0', 'Tuw8hxrFBH8', 'wnHW6o8WMas'],
  },
  {
    id: 3,
    title: 'Stop Making Excuses',
    tag: '#NoExcuses',
    searchQuery: 'stop making excuses take action motivation shorts',
    defaultVideoIds: ['ZXsQAXx_ao0', 'g-jwWYX7Jlo', 'mgmVOuLgFB0'],
  },
  {
    id: 4,
    title: 'Your Future Self Is Watching You',
    tag: '#FutureSelf',
    searchQuery: 'your future self is watching you motivation shorts',
    defaultVideoIds: ['Tuw8hxrFBH8', 'wnHW6o8WMas', 'mgmVOuLgFB0'],
  },
  {
    id: 5,
    title: 'Discipline Beats Motivation',
    tag: '#Discipline',
    searchQuery: 'discipline beats motivation shorts',
    defaultVideoIds: ['g-jwWYX7Jlo', 'wnHW6o8WMas', 'Tuw8hxrFBH8'],
  },
  {
    id: 6,
    title: 'Prove Them Wrong',
    tag: '#ProveThemWrong',
    searchQuery: 'prove them wrong motivational shorts',
    defaultVideoIds: ['wnHW6o8WMas', 'Tuw8hxrFBH8', 'g-jwWYX7Jlo'],
  },
  {
    id: 7,
    title: 'Never Give Up',
    tag: '#Relentless',
    searchQuery: 'never give up keep fighting motivation shorts',
    defaultVideoIds: ['mgmVOuLgFB0', 'g-jwWYX7Jlo', 'wnHW6o8WMas'],
  },
  {
    id: 8,
    title: 'Your Time Will Come',
    tag: '#Patience',
    searchQuery: 'your time will come motivation shorts',
    defaultVideoIds: ['Tuw8hxrFBH8', 'mgmVOuLgFB0', 'wnHW6o8WMas'],
  },
  {
    id: 9,
    title: 'Work in Silence',
    tag: '#SilentGrind',
    searchQuery: 'work in silence let success make noise shorts',
    defaultVideoIds: ['g-jwWYX7Jlo', 'ZXsQAXx_ao0', 'Tuw8hxrFBH8'],
  },
  {
    id: 10,
    title: 'Stop Overthinking, Start Doing',
    tag: '#TakeAction',
    searchQuery: 'stop overthinking start doing motivation shorts',
    defaultVideoIds: ['ZXsQAXx_ao0', 'wnHW6o8WMas', 'g-jwWYX7Jlo'],
  },
  {
    id: 11,
    title: '1% Better Every Day',
    tag: '#AtomicHabits',
    searchQuery: '1 percent better every day motivation shorts',
    defaultVideoIds: ['wnHW6o8WMas', 'mgmVOuLgFB0', 'Tuw8hxrFBH8'],
  },
  {
    id: 12,
    title: 'Failure Is Part of Success',
    tag: '#Resilience',
    searchQuery: 'failure is part of success motivational shorts',
    defaultVideoIds: ['Tuw8hxrFBH8', 'g-jwWYX7Jlo', 'mgmVOuLgFB0'],
  },
  {
    id: 13,
    title: 'Your Only Competition Is Yourself',
    tag: '#SelfMastery',
    searchQuery: 'your only competition is yourself shorts',
    defaultVideoIds: ['mgmVOuLgFB0', 'wnHW6o8WMas', 'ZXsQAXx_ao0'],
  },
  {
    id: 14,
    title: 'Dream Big, Work Hard',
    tag: '#WorkEthic',
    searchQuery: 'dream big work hard motivational shorts',
    defaultVideoIds: ['g-jwWYX7Jlo', 'Tuw8hxrFBH8', 'wnHW6o8WMas'],
  },
  {
    id: 15,
    title: 'Make Your Parents Proud',
    tag: '#Purpose',
    searchQuery: 'make your parents proud motivation shorts',
    defaultVideoIds: ['wnHW6o8WMas', 'g-jwWYX7Jlo', 'Tuw8hxrFBH8'],
  },
  {
    id: 16,
    title: "Don't Waste Your Potential",
    tag: '#Potential',
    searchQuery: 'dont waste your potential motivation shorts',
    defaultVideoIds: ['Tuw8hxrFBH8', 'ZXsQAXx_ao0', 'wnHW6o8WMas'],
  },
  {
    id: 17,
    title: 'Stay Focused on Your Goals',
    tag: '#LaserFocus',
    searchQuery: 'stay focused on your goals shorts',
    defaultVideoIds: ['g-jwWYX7Jlo', 'mgmVOuLgFB0', 'wnHW6o8WMas'],
  },
  {
    id: 18,
    title: 'Turn Pain Into Power',
    tag: '#Alchemize',
    searchQuery: 'turn pain into power motivation shorts',
    defaultVideoIds: ['wnHW6o8WMas', 'Tuw8hxrFBH8', 'g-jwWYX7Jlo'],
  },
  {
    id: 19,
    title: 'One Day or Day One',
    tag: '#DayOne',
    searchQuery: 'one day or day one motivation shorts',
    defaultVideoIds: ['ZXsQAXx_ao0', 'mgmVOuLgFB0', 'Tuw8hxrFBH8'],
  },
  {
    id: 20,
    title: 'Become the Best Version of Yourself',
    tag: '#BestVersion',
    searchQuery: 'best version of yourself motivational shorts',
    defaultVideoIds: ['mgmVOuLgFB0', 'wnHW6o8WMas', 'g-jwWYX7Jlo'],
  },
];

export const MOTIVATIONAL_QUOTES: MotivationalQuoteItem[] = [
  { id: 1, text: 'Your only limit is the one you refuse to break.' },
  {
    id: 2,
    text: 'Dream so big that your fears become smaller than your ambitions.',
  },
  {
    id: 3,
    text: 'Nobody is coming to save you. Take responsibility for your life.',
  },
  { id: 4, text: 'Work until your idols become your rivals.' },
  {
    id: 5,
    text: 'Discipline is choosing what you want most over what you want now.',
  },
  {
    id: 6,
    text: "Don't stop when you're tired. Stop when the work is done.",
  },
  {
    id: 7,
    text: 'Your future is created by what you do today, not tomorrow.',
  },
  {
    id: 8,
    text: 'Be so focused on your goals that distractions lose their meaning.',
  },
  {
    id: 9,
    text: 'Failure is not the opposite of success. It is part of success.',
  },
  { id: 10, text: 'One day or day one. You decide.' },
  {
    id: 11,
    text: 'Prove to yourself that you can do what you once thought impossible.',
  },
  {
    id: 12,
    text: 'Small progress every day leads to extraordinary results.',
  },
  {
    id: 13,
    text: "Don't compare your journey with others. Build your own legacy.",
  },
  {
    id: 14,
    text: 'The pain of discipline is temporary. The regret of giving up can last forever.',
  },
  { id: 15, text: 'Make your dreams bigger than your excuses.' },
  { id: 16, text: 'Stay hungry. Stay foolish. Never stop learning.' },
  {
    id: 17,
    text: "You don't need to be the best today. You need to be better than yesterday.",
  },
  {
    id: 18,
    text: 'When nobody believes in you, believe in yourself twice as hard.',
  },
  {
    id: 19,
    text: "Your circumstances don't define your destination. Your decisions do.",
  },
  {
    id: 20,
    text: 'Become someone your younger self would be proud of.',
  },
];
