const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function getBaseUrl() {
  if (!SUPABASE_URL) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  return SUPABASE_URL.replace(/\/$/, '');
}

function buildHeaders(extra = {}) {
  if (!SUPABASE_KEY) throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, { method = 'GET', body, headers, signal, prefer } = {}) {
  const base = getBaseUrl();
  const url = `${base}/rest/v1/${path}`;
  const response = await fetch(url, {
    method,
    headers: buildHeaders({
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    }),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message || payload?.error || text || 'Supabase request failed';
    throw new Error(`${response.status}: ${message}`);
  }
  return payload;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function mapRole(row = {}) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar_url || row.avatar,
    heroImage: row.hero_image_url || row.hero_image,
    persona: row.persona || '',
    mood: row.mood || '',
    greeting: row.greeting || '',
    script: safeArray(row.script),
    title: row.title || '',
    city: row.city || '',
    description: row.description || '',
    tags: safeArray(row.tags),
    status: row.status || 'published',
  };
}

function mapSeedMessage(row = {}) {
  return {
    id: row.id,
    roleId: row.role_id,
    conversationId: row.conversation_id || `${row.role_id}-default`,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    position: row.position ?? 0,
  };
}

function mapExploreItem(row = {}) {
  const resolveImage = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return { uri: img };
    if (img.uri) return img;
    return img;
  };
  const images = safeArray(row.images).map(resolveImage).filter(Boolean);
  const author = {
    name: row.author_name,
    label: row.author_label,
    avatar: row.author_avatar_url ? resolveImage(row.author_avatar_url) : null,
  };
  return {
    id: row.id,
    type: row.type,
    worldType: row.world_type,
    postType: row.post_type,
    title: row.title,
    summary: row.summary,
    location: row.location,
    tags: safeArray(row.tags),
    author,
    images,
    coverHeight: row.cover_height,
    stats: row.stats || {},
    content: safeArray(row.content),
    world: row.world || {},
    targetRoleId: row.target_role_id,
    recommendedRoles: safeArray(row.recommended_roles),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}

function mapDailyTemplate(row = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scene: row.scene,
    targetRoleId: row.target_role_id,
    kickoff: row.kickoff_prompt,
    difficulty: row.difficulty || 'M',
    targetWords: safeArray(row.target_words),
    reward: row.reward_points || 5,
  };
}

function mapDailyTask(row = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scene: row.scene,
    target_role_id: row.target_role_id,
    kickoff_prompt: row.kickoff_prompt,
    difficulty: row.difficulty || 'M',
    target_words: safeArray(row.target_words),
    reward_points: row.reward_points || 5,
    reward_coins: row.reward_coins,
    completed: row.completed ? 1 : 0,
    day_key: row.day_key,
    created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export async function fetchRemoteRoles() {
  const rows = await request('roles?select=*');
  return rows.map(mapRole);
}

export async function fetchRoleSeedMessages() {
  const rows = await request('role_seed_messages?select=*');
  return rows.map(mapSeedMessage);
}

export async function fetchExploreItems() {
  const rows = await request('explore_items?select=*');
  return rows.map(mapExploreItem);
}

export async function fetchExploreItemById(id) {
  if (!id) return null;
  const rows = await request(`explore_items?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  if (!rows || !rows.length) return null;
  return mapExploreItem(rows[0]);
}

export async function fetchDailyTemplates() {
  const rows = await request('daily_theater_templates?select=*');
  return rows.map(mapDailyTemplate);
}

export async function fetchDailyTasks(dayKey) {
  const rows = await request(
    `daily_theater_tasks?day_key=eq.${encodeURIComponent(dayKey)}&select=*&order=created_at.asc`
  );
  return rows.map(mapDailyTask);
}

export async function createDailyTasks(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) return [];
  const rows = await request('daily_theater_tasks', {
    method: 'POST',
    body: tasks,
    prefer: 'return=representation',
  });
  return rows.map(mapDailyTask);
}

function pickRandom(arr = [], count = 3) {
  const pool = [...arr];
  const chosen = [];
  while (pool.length && chosen.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen;
}

export async function ensureRemoteDailyTasks(dayKey) {
  if (!dayKey) throw new Error('dayKey required');
  const existing = await fetchDailyTasks(dayKey);
  if (existing && existing.length >= 3) return existing;

  const templates = await fetchDailyTemplates();
  if (!templates.length) return existing;

  const selected = pickRandom(templates, 3);
  const payload = selected.map((item) => ({
    day_key: dayKey,
    template_id: item.id,
    title: item.title,
    description: item.description,
    scene: item.scene,
    target_role_id: item.targetRoleId,
    kickoff_prompt: item.kickoff,
    difficulty: item.difficulty || 'M',
    target_words: item.targetWords || [],
    reward_points: item.reward || 5,
  }));

  await createDailyTasks(payload);
  return fetchDailyTasks(dayKey);
}

let exploreCache = null;

export async function loadExploreCache(force = false) {
  if (!force && Array.isArray(exploreCache) && exploreCache.length) return exploreCache;
  const rows = await fetchExploreItems();
  exploreCache = rows;
  return exploreCache;
}

export function getCachedExploreItems() {
  return exploreCache || [];
}

export function getCachedExploreItemById(id) {
  if (!exploreCache) return null;
  return exploreCache.find((item) => item.id === id) || null;
}
