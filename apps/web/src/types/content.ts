export type Role = {
  id: string;
  name: string;
  title: string;
  mood: string;
  city: string;
  tags: string[];
  heroImage: string;
  avatar: string;
  likes?: number;
  status?: string;
  snippet?: string;
  persona?: string;
  greeting?: string;
  prompt?: string;
  assets?: string[];
  travelNote?: string;
  version?: string;
};

export type Post = {
  id: string;
  title: string;
  summary: string;
  location: string;
  tags: string[];
  author?: { name: string; label?: string; avatar?: string };
  images: string[];
  stats: { likes: number; comments?: number };
  content?: string[];
};

export type ChatMessage = {
  sender: 'ai' | 'user';
  text: string;
};

export type Task = {
  title: string;
  meta: string;
  status: '已完成' | '進行中' | '未開始';
};

export type Achievement = {
  title: string;
  meta: string;
  badge: string;
};

export type MemoryRecord = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tag?: string;
  mood?: string;
  delta?: string;
};
