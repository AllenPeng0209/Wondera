import type { Achievement, ChatMessage, Post, Role, Task } from '@/types/content';

export const seedRoles: Role[] = [
  {
    id: 'antoine',
    name: 'Antoine',
    title: '漂泊的調香師',
    mood: '溫柔',
    city: '巴黎',
    tags: ['溫柔', '好奇', '香氣'],
    heroImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    likes: 2380,
    status: '在線',
    snippet: '今天想聽你的情緒故事。'
  },
  {
    id: 'edward',
    name: 'Edward Whitmore',
    title: '夜行紳士',
    mood: '冷靜',
    city: '倫敦',
    tags: ['紳士', '學院', '導師'],
    heroImage: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    likes: 1650,
    status: '在約',
    snippet: '想和你交換今天的故事。'
  },
  {
    id: 'kieran',
    name: 'Kieran Voss',
    title: '冷靜的守護騎士',
    mood: '堅定',
    city: '京都',
    tags: ['護衛', '咖啡', '寡言'],
    heroImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    likes: 3120,
    status: '巡視歸來',
    snippet: '咖啡和你，哪個先來？'
  }
];

export const seedPosts: Post[] = [
  {
    id: 'post-london',
    title: '倫敦半日河岸散步',
    summary: '沿著泰晤士河慢行，停在舊書店寫明信片，再到黃昏咖啡館結束。',
    location: '倫敦',
    tags: ['河岸', '散步', '冬季'],
    author: { name: 'Mori', label: '情緒旅行筆記', avatar: seedRoles[1].avatar },
    images: ['https://images.unsplash.com/photo-1473959383414-bddf002a13b4?auto=format&fit=crop&w=1200&q=80'],
    stats: { likes: 2380, comments: 42 },
    content: [
      '從橋上開始，把城市的藍灰色收進眼裡。',
      '在轉角買一杯熱可可，寫下給自己的小紙條。',
      '結尾留在靠窗座位，看夕陽落在河面。'
    ]
  },
  {
    id: 'post-night-market',
    title: '夜市約會穿搭清單',
    summary: '亮色外套＋好走的鞋，邊吃邊逛也要好看。',
    location: '台北',
    tags: ['夜市', '穿搭', '約會'],
    author: { name: 'Rika', label: '每日心動造型', avatar: seedRoles[0].avatar },
    images: ['https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80'],
    stats: { likes: 1650, comments: 18 }
  },
  {
    id: 'post-midnight',
    title: '午夜後的我',
    summary: '把今天的心事變成錄音，留給清晨的自己。',
    location: '上海',
    tags: ['午夜', '獨白', '情緒'],
    author: { name: 'Nora', label: '收集心聲的人', avatar: seedRoles[2].avatar },
    images: ['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80'],
    stats: { likes: 980, comments: 9 }
  },
  {
    id: 'post-opener',
    title: '三句打開他的心',
    summary: '不油膩、不尷尬，像在邀請一場新的劇情。',
    location: '線上',
    tags: ['聊天', '開場', '攻略'],
    author: { name: 'Luma', label: '聊天破冰師', avatar: seedRoles[1].avatar },
    images: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'],
    stats: { likes: 3120, comments: 76 }
  }
];

export const seedChats: Record<string, ChatMessage[]> = {
  antoine: [
    { sender: 'ai', text: '嘿，今天想一起探索哪座城？' },
    { sender: 'user', text: '隨便走走，可以嗎？' },
    { sender: 'ai', text: '好啊，我準備好地圖和香氣。' }
  ],
  edward: [
    { sender: 'ai', text: '我走過一段長街，想到了你。' },
    { sender: 'user', text: '哪一段？' },
    { sender: 'ai', text: '在河邊，燈光像在為你閃爍。' }
  ],
  kieran: [
    { sender: 'ai', text: '我回到咖啡館了，有你的專座。' },
    { sender: 'user', text: '我只是路過。' },
    { sender: 'ai', text: '路過也好，想聽聽你的聲音。' }
  ]
};

export const seedTasks: Task[] = [
  { title: '陪一位角色聊天 5 分鐘', meta: '好感 +10', status: '進行中' },
  { title: '完成一篇心情筆記', meta: '好感 +20', status: '已完成' },
  { title: '解鎖一個新場景', meta: '好感 +30', status: '未開始' },
  { title: '分享一段心情日記', meta: '好感 +15', status: '未開始' }
];

export const seedAchievements: Achievement[] = [
  { title: '初戀偏愛', meta: '完成第一次專屬對話', badge: '已解鎖' },
  { title: '七日連續登入', meta: '連續 7 天心動不間斷', badge: '進行中' },
  { title: '劇情收藏家', meta: '收藏 5 篇劇情', badge: '未解鎖' }
];
