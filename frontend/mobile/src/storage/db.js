import * as SQLite from 'expo-sqlite';
import { roleSeeds } from '../data/seeds';

let databasePromise;
const now = () => Date.now();
const uniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const BASE_ROLE_LEVEL_EXP = 50;
const ROLE_AFFECTION_THRESHOLDS = [0, 60, 150, 320, 520, 800];
const DAILY_VOCAB_TARGET = 10;

function getDayKey(ts = Date.now()) {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('dreamate.db');
  }
  return databasePromise;
}

function getPrevDayKey(dayKey) {
  if (!dayKey) return null;
  const d = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return getDayKey(d.getTime());
}

async function run(sql, params = []) {
  const db = await getDatabase();
  return db.runAsync(sql, params);
}

async function getAll(sql, params = []) {
  const db = await getDatabase();
  return db.getAllAsync(sql, params);
}

async function getFirst(sql, params = []) {
  const db = await getDatabase();
  return db.getFirstAsync(sql, params);
}

async function ensureColumn(table, column, type) {
  const info = await getAll(`PRAGMA table_info(${table});`);
  if (!info.some((row) => row.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

export async function initDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      persona TEXT,
      mood TEXT,
      greeting TEXT,
      script TEXT,
      title TEXT,
      city TEXT,
      description TEXT,
      tags TEXT,
      hero_image TEXT
    );`);

  // Ensure newer columns exist when upgrading from old schema
  await ensureColumn('roles', 'title', 'TEXT');
  await ensureColumn('roles', 'city', 'TEXT');
  await ensureColumn('roles', 'description', 'TEXT');
  await ensureColumn('roles', 'tags', 'TEXT');
  await ensureColumn('roles', 'hero_image', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      role_id TEXT,
      title TEXT,
      updated_at INTEGER,
      script_cursor INTEGER DEFAULT 0,
      FOREIGN KEY(role_id) REFERENCES roles(id)
    );`);

  await run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      sender TEXT,
      body TEXT,
      kind TEXT DEFAULT 'text',
      media_key TEXT,
      created_at INTEGER,
      audio_url TEXT,
      audio_mime TEXT,
      audio_duration REAL,
      quoted_body TEXT,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    );`);
  await ensureColumn('messages', 'kind', "TEXT DEFAULT 'text'");
  await ensureColumn('messages', 'media_key', 'TEXT');
  await ensureColumn('messages', 'audio_url', 'TEXT');
  await ensureColumn('messages', 'audio_mime', 'TEXT');
  await ensureColumn('messages', 'audio_duration', 'REAL');
  await ensureColumn('messages', 'quoted_body', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS vocab_items (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL,
      definition TEXT,
      phonetic TEXT,
      language TEXT,
      example TEXT,
      example_translation TEXT,
      tags TEXT,
      starred INTEGER DEFAULT 0,
      ease REAL DEFAULT 2.5,
      interval_ms INTEGER DEFAULT 0,
      proficiency INTEGER DEFAULT 0,
      next_review_at INTEGER,
      last_review_at INTEGER,
      mastered INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      source_role_id TEXT,
      source_conversation_id TEXT,
      source_message_id INTEGER,
      audio_url TEXT
    );`);

  await ensureColumn('vocab_items', 'example_translation', 'TEXT');
  await ensureColumn('vocab_items', 'tags', 'TEXT');
  await ensureColumn('vocab_items', 'starred', 'INTEGER DEFAULT 0');
  await ensureColumn('vocab_items', 'ease', 'REAL DEFAULT 2.5');
  await ensureColumn('vocab_items', 'interval_ms', 'INTEGER DEFAULT 0');
  await ensureColumn('vocab_items', 'proficiency', 'INTEGER DEFAULT 0');
  await ensureColumn('vocab_items', 'next_review_at', 'INTEGER');
  await ensureColumn('vocab_items', 'last_review_at', 'INTEGER');
  await ensureColumn('vocab_items', 'mastered', 'INTEGER DEFAULT 0');
  await ensureColumn('vocab_items', 'source_role_id', 'TEXT');
  await ensureColumn('vocab_items', 'source_conversation_id', 'TEXT');
  await ensureColumn('vocab_items', 'source_message_id', 'INTEGER');
  await ensureColumn('vocab_items', 'audio_url', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS vocab_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocab_id TEXT,
      rating TEXT,
      scheduled_interval_ms INTEGER,
      next_review_at INTEGER,
      created_at INTEGER,
      FOREIGN KEY(vocab_id) REFERENCES vocab_items(id)
    );`);

  await run(`CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      nickname TEXT,
      gender TEXT,
      chat_background TEXT,
      pin_chat INTEGER DEFAULT 1,
      memory_enabled INTEGER DEFAULT 1,
      currency_balance INTEGER DEFAULT 520,
      wallet_recharge_history TEXT,
      api_provider TEXT,
      api_key TEXT,
      api_model TEXT,
      api_mode TEXT,
      bubble_style TEXT,
      immersive_mode INTEGER DEFAULT 0,
      swipe_reply INTEGER DEFAULT 0,
      wait_to_reply INTEGER DEFAULT 0,
      affection_points INTEGER DEFAULT 0
    );`);
  await ensureColumn('user_settings', 'wallet_recharge_history', 'TEXT');
  await ensureColumn('user_settings', 'api_provider', 'TEXT');
  await ensureColumn('user_settings', 'api_key', 'TEXT');
  await ensureColumn('user_settings', 'api_model', 'TEXT');
  await ensureColumn('user_settings', 'api_mode', 'TEXT');
  await ensureColumn('user_settings', 'bubble_style', 'TEXT');
  await ensureColumn('user_settings', 'immersive_mode', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'swipe_reply', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'wait_to_reply', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'affection_points', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'streak_current', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'streak_best', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'streak_last_day', 'TEXT');
  await ensureColumn('user_settings', 'mbti', 'TEXT');
  await ensureColumn('user_settings', 'zodiac', 'TEXT');
  await ensureColumn('user_settings', 'birthday', 'TEXT');
  await ensureColumn('user_settings', 'onboarding_done', 'INTEGER DEFAULT 0');
  await ensureColumn('user_settings', 'login_email', 'TEXT');
  await ensureColumn('user_settings', 'login_password', 'TEXT');
  await ensureColumn('user_settings', 'is_logged_in', 'INTEGER DEFAULT 0');

  await run(`CREATE TABLE IF NOT EXISTS ai_knock_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      created_at INTEGER
    );`);

  await run(`CREATE TABLE IF NOT EXISTS liked_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id TEXT,
      created_at INTEGER
    );`);

  await run(`CREATE TABLE IF NOT EXISTS role_settings (
      role_id TEXT PRIMARY KEY,
      allow_emoji INTEGER DEFAULT 1,
      allow_knock INTEGER DEFAULT 1,
      max_replies INTEGER DEFAULT 5,
      persona_note TEXT,
      expression_style TEXT,
      catchphrase TEXT,
      user_personality TEXT,
      nickname_override TEXT,
      gender TEXT,
      chat_background TEXT,
      pin_chat INTEGER DEFAULT 0,
      voice_preset TEXT,
      memory_limit INTEGER DEFAULT 10,
      auto_summary INTEGER DEFAULT 1,
      is_blocked INTEGER DEFAULT 0
    );`);

  await ensureColumn('role_settings', 'nickname_override', 'TEXT');
  await ensureColumn('role_settings', 'gender', 'TEXT');
  await ensureColumn('role_settings', 'chat_background', 'TEXT');
  await ensureColumn('role_settings', 'pin_chat', 'INTEGER DEFAULT 0');
  await ensureColumn('role_settings', 'voice_preset', 'TEXT');
  await ensureColumn('role_settings', 'memory_limit', 'INTEGER DEFAULT 10');
  await ensureColumn('role_settings', 'auto_summary', 'INTEGER DEFAULT 1');
  await ensureColumn('role_settings', 'is_blocked', 'INTEGER DEFAULT 0');
  await ensureColumn('role_settings', 'level', 'INTEGER DEFAULT 1');
  await ensureColumn('role_settings', 'exp', 'INTEGER DEFAULT 0');
  await ensureColumn('role_settings', 'affection', 'INTEGER DEFAULT 0');
  await ensureColumn('role_settings', 'affection_level', 'INTEGER DEFAULT 1');

  await run(`CREATE TABLE IF NOT EXISTS daily_theater_tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      scene TEXT,
      target_role_id TEXT,
      kickoff_prompt TEXT,
      difficulty TEXT,
      target_words TEXT,
      reward_points INTEGER DEFAULT 5,
      completed INTEGER DEFAULT 0,
      day_key TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );`);

  await ensureColumn('daily_theater_tasks', 'target_role_id', 'TEXT');
  await ensureColumn('daily_theater_tasks', 'kickoff_prompt', 'TEXT');
  await ensureColumn('daily_theater_tasks', 'difficulty', 'TEXT');
  await ensureColumn('daily_theater_tasks', 'target_words', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS daily_learning_stats (
      day_key TEXT PRIMARY KEY,
      messages_count INTEGER DEFAULT 0,
      target_hits INTEGER DEFAULT 0,
      vocab_new INTEGER DEFAULT 0,
      vocab_review INTEGER DEFAULT 0,
      tasks_completed INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );`);
  await ensureColumn('daily_learning_stats', 'messages_count', 'INTEGER DEFAULT 0');
  await ensureColumn('daily_learning_stats', 'target_hits', 'INTEGER DEFAULT 0');
  await ensureColumn('daily_learning_stats', 'vocab_new', 'INTEGER DEFAULT 0');
  await ensureColumn('daily_learning_stats', 'vocab_review', 'INTEGER DEFAULT 0');
  await ensureColumn('daily_learning_stats', 'tasks_completed', 'INTEGER DEFAULT 0');
  await ensureColumn('daily_learning_stats', 'completed', 'INTEGER DEFAULT 0');

  await seedInitialData();
}

async function seedInitialData() {
  const user = await getFirst('SELECT COUNT(*) as count FROM user_settings WHERE id = ?;', ['default']);
  if ((user?.count ?? 0) === 0) {
    await run(
      'INSERT INTO user_settings (id, nickname, gender, chat_background, pin_chat, memory_enabled, currency_balance) VALUES (?, ?, ?, ?, ?, ?, ?);',
      ['default', 'MOMOMOMO', '男', '#ffeef2', 1, 1, 520]
    );
    await updateUserSettings({
      wallet_recharge_history: JSON.stringify([]),
      api_provider: 'Dreamate Cloud',
      api_mode: 'wallet',
      bubble_style: 'default',
      mbti: '',
      zodiac: '',
      birthday: '',
      onboarding_done: 0,
      login_email: '',
      login_password: '',
      is_logged_in: 0,
    });
  }

  // Check if we have the new roles (antoine, edward, kieran)
  const newRoleCheck = await getFirst('SELECT COUNT(*) as count FROM roles WHERE id IN (?, ?, ?);', ['antoine', 'edward', 'kieran']);
  const hasNewRoles = (newRoleCheck?.count ?? 0) === 3;

  // Check if avatar data is in the new format (string IDs instead of require objects)
  const avatarCheck = await getFirst('SELECT avatar FROM roles WHERE id = ? LIMIT 1;', ['antoine']);
  const hasCorrectAvatarFormat = avatarCheck?.avatar === 'antoine';

  // If we don't have the new roles OR avatars are in wrong format, clear and re-insert
  if (!hasNewRoles || !hasCorrectAvatarFormat) {
    // Delete old roles, conversations, messages, and role_settings
    await run('DELETE FROM messages;');
    await run('DELETE FROM conversations;');
    await run('DELETE FROM role_settings;');
    await run('DELETE FROM roles;');
    console.log('[DB] Cleared old roles or updating avatar format, inserting new ones...');
  } else {
    // We already have the new roles with correct format, skip
    await seedSampleVocab();
    return;
  }

  for (const role of roleSeeds) {
    await run(
      'INSERT INTO roles (id, name, avatar, persona, mood, greeting, script, title, city, description, tags, hero_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        role.id,
        role.name,
        role.avatar,
        role.persona,
        role.mood,
        role.greeting,
        JSON.stringify(role.script),
        role.title,
        role.city,
        role.description,
        JSON.stringify(role.tags || []),
        role.heroImage,
      ]
    );

    const conversationId = role.conversation.id;
    await run(
      'INSERT INTO conversations (id, role_id, title, updated_at, script_cursor) VALUES (?, ?, ?, ?, 0);',
      [conversationId, role.id, role.name, now()]
    );

    await run(
      `INSERT OR IGNORE INTO role_settings (
        role_id, allow_emoji, allow_knock, max_replies, persona_note, expression_style, catchphrase,
        user_personality, nickname_override, gender, chat_background, pin_chat, voice_preset, memory_limit, auto_summary, is_blocked
      ) VALUES (?, 1, 1, 5, ?, ?, ?, ?, ?, ?, ?, 0, ?, 10, 1, 0);`,
      [role.id, '', '', '', '', '', '', role.name, '保密', '#ffeef2', '默认']
    );

    for (const message of role.conversation.initialMessages) {
      await run(
        'INSERT INTO messages (conversation_id, sender, body, created_at) VALUES (?, ?, ?, ?);',
        [conversationId, message.sender, message.body, message.createdAt]
      );
    }
  }

  await seedSampleVocab();
}

export async function getConversations() {
  const rows = await getAll(`
    SELECT c.id, c.role_id as roleId, r.name, r.avatar, r.mood, r.greeting,
           c.updated_at as updatedAt,
           (
             SELECT
               CASE
                 WHEN m.kind = 'emoji' THEN '[表情]'
                 ELSE m.body
               END
             FROM messages m
             WHERE m.conversation_id = c.id
             ORDER BY created_at DESC
             LIMIT 1
           ) as lastMessage
    FROM conversations c
    JOIN roles r ON r.id = c.role_id
    ORDER BY c.updated_at DESC;
  `);
  return rows;
}

// 找出适合“拍一拍”的会话：
// - 对应角色允许 allow_knock
// - 未被拉黑
// - 一段时间没有更新（由 sinceMs 控制）
export async function getKnockableConversations(sinceMs = 6 * 60 * 60 * 1000) {
  const hasTimeLimit = typeof sinceMs === 'number' && sinceMs > 0;
  const cutoff = hasTimeLimit ? now() - sinceMs : 0;

  const timeCondition = hasTimeLimit
    ? 'AND (c.updated_at IS NULL OR c.updated_at < ?)'
    : '';

  const sql = `
      SELECT
        c.id,
        c.role_id as roleId,
        c.updated_at as updatedAt,
        r.name,
        r.greeting
      FROM conversations c
      JOIN roles r ON r.id = c.role_id
      JOIN role_settings s ON s.role_id = c.role_id
      WHERE
        s.allow_knock = 1
        AND (s.is_blocked IS NULL OR s.is_blocked = 0)
        ${timeCondition}
      ORDER BY c.updated_at ASC
      LIMIT 10;
    `;

  const rows = await getAll(sql, hasTimeLimit ? [cutoff] : []);
  return rows;
}

export async function getAiKnockCountSince(durationMs) {
  if (!durationMs || durationMs <= 0) return 0;
  const cutoff = now() - durationMs;
  const row = await getFirst('SELECT COUNT(*) as count FROM ai_knock_log WHERE created_at >= ?;', [cutoff]);
  return row?.count ? Number(row.count) : 0;
}

export async function recordAiKnockSend(conversationId, createdAt = now()) {
  await run('INSERT INTO ai_knock_log (conversation_id, created_at) VALUES (?, ?);', [conversationId, createdAt]);
}

export async function getConversationDetail(conversationId) {
  const record = await getFirst(
    `SELECT c.*, r.name, r.avatar, r.persona, r.mood, r.greeting, r.script, r.hero_image
     FROM conversations c
     JOIN roles r ON r.id = c.role_id
     WHERE c.id = ?
     LIMIT 1;`,
    [conversationId]
  );
  if (!record) return null;
  return {
    conversation: {
      id: record.id,
      roleId: record.role_id,
      title: record.title,
      updatedAt: record.updated_at,
      scriptCursor: record.script_cursor,
    },
    role: {
      id: record.role_id,
      name: record.name,
      avatar: record.avatar,
      persona: record.persona,
      mood: record.mood,
      greeting: record.greeting,
      script: JSON.parse(record.script || '[]'),
      heroImage: record.hero_image,
    },
  };
}

export async function getMessages(conversationId) {
  const rows = await getAll(
    "SELECT id, sender, body, kind, media_key as mediaKey, created_at as createdAt, audio_url as audioUrl, audio_mime as audioMime, audio_duration as audioDuration, quoted_body as quotedBody FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;",
    [conversationId]
  );
  return rows;
}

export async function addMessage(conversationId, sender, body, createdAt = now(), options = {}) {
  const { quotedBody = null, kind = 'text', mediaKey = null } = options || {};
  const insertResult = await run(
    'INSERT INTO messages (conversation_id, sender, body, kind, media_key, created_at, quoted_body) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [conversationId, sender, body, kind, mediaKey, createdAt, quotedBody]
  );
  await run('UPDATE conversations SET updated_at = ? WHERE id = ?;', [createdAt, conversationId]);

  const insertedId = insertResult.lastInsertRowId ?? insertResult.insertId;
  return {
    id: insertedId ?? `${conversationId}-${createdAt}-${sender}`,
    sender,
    body,
    kind,
    mediaKey,
    createdAt,
    audioUrl: null,
    audioMime: null,
    audioDuration: null,
    quotedBody,
  };
}

export async function deleteMessage(messageId) {
  await run('DELETE FROM messages WHERE id = ?;', [messageId]);
}

export async function saveMessageAudio(messageId, { audioUrl, audioMime, audioDuration }) {
  await run(
    'UPDATE messages SET audio_url = ?, audio_mime = ?, audio_duration = ? WHERE id = ?;',
    [audioUrl ?? null, audioMime ?? null, audioDuration ?? null, messageId]
  );
}

export async function advanceScriptCursor(conversationId, nextCursor) {
  await run('UPDATE conversations SET script_cursor = ? WHERE id = ?;', [nextCursor, conversationId]);
}

export async function getRoles() {
  const rows = await getAll(
    'SELECT id, name, avatar, mood, greeting, title, city, description, tags, hero_image as heroImage FROM roles ORDER BY name ASC;'
  );
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }));
}

export async function saveRolePreference(roleId, liked) {
  if (liked) {
    await run('INSERT INTO liked_roles (role_id, created_at) VALUES (?, ?);', [roleId, now()]);
  }
}

export async function getLikedRolesCount() {
  const record = await getFirst('SELECT COUNT(*) as count FROM liked_roles;');
  return record?.count ?? 0;
}

export async function getUserSettings() {
  const record = await getFirst('SELECT * FROM user_settings WHERE id = ? LIMIT 1;', ['default']);
  return record;
}

export async function updateUserSettings(updates) {
  const keys = Object.keys(updates || {});
  if (!keys.length) return;
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => updates[key]);
  values.push('default');
  await run(`UPDATE user_settings SET ${assignments} WHERE id = ?;`, values);
}

async function ensureRoleSettings(roleId) {
  await run('INSERT OR IGNORE INTO role_settings (role_id) VALUES (?);', [roleId]);
}

export async function getRoleSettings(roleId) {
  await ensureRoleSettings(roleId);
  const record = await getFirst('SELECT * FROM role_settings WHERE role_id = ? LIMIT 1;', [roleId]);
  return record;
}

export async function updateRoleSettings(roleId, updates) {
  await ensureRoleSettings(roleId);
  const keys = Object.keys(updates || {});
  if (!keys.length) return;
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => updates[key]);
  values.push(roleId);
  await run(`UPDATE role_settings SET ${assignments} WHERE role_id = ?;`, values);
}

function calculateNextLevelExp(level = 1) {
  const safeLevel = Math.max(1, level);
  return Math.round(BASE_ROLE_LEVEL_EXP * Math.pow(safeLevel, 1.5));
}

function calculateAffectionLevel(affection = 0) {
  let level = 1;
  for (let i = 1; i < ROLE_AFFECTION_THRESHOLDS.length; i += 1) {
    if (affection >= ROLE_AFFECTION_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const cap = ROLE_AFFECTION_THRESHOLDS[ROLE_AFFECTION_THRESHOLDS.length - 1];
  if (affection > cap) {
    const extraLevels = Math.floor((affection - cap) / 300);
    level += extraLevels;
  }

  return level;
}

function getNextAffectionThreshold(level = 1) {
  if (level < ROLE_AFFECTION_THRESHOLDS.length) return ROLE_AFFECTION_THRESHOLDS[level];
  const cap = ROLE_AFFECTION_THRESHOLDS[ROLE_AFFECTION_THRESHOLDS.length - 1];
  const extraLevels = level - ROLE_AFFECTION_THRESHOLDS.length + 1;
  return cap + extraLevels * 300;
}

export async function addRoleProgress(roleId, { expDelta = 0, affectionDelta = 0 } = {}) {
  if (!roleId) return null;
  await ensureRoleSettings(roleId);
  const settings = await getRoleSettings(roleId);

  let level = settings?.level || 1;
  let exp = Math.max(0, (settings?.exp || 0) + expDelta);
  let affection = Math.max(0, (settings?.affection || 0) + affectionDelta);
  let leveledUp = false;
  let upgradedLevels = 0;

  while (exp >= calculateNextLevelExp(level)) {
    exp -= calculateNextLevelExp(level);
    level += 1;
    leveledUp = true;
    upgradedLevels += 1;
  }

  const affection_level = calculateAffectionLevel(affection);
  await updateRoleSettings(roleId, { level, exp, affection, affection_level });

  return {
    level,
    exp,
    affection,
    affection_level,
    leveledUp,
    upgradedLevels,
    next_level_exp: calculateNextLevelExp(level),
    next_affection_threshold: getNextAffectionThreshold(affection_level),
  };
}

export async function getRoleProgress(roleId) {
  if (!roleId) return null;
  await ensureRoleSettings(roleId);
  const settings = await getRoleSettings(roleId);
  const level = settings?.level || 1;
  const exp = settings?.exp || 0;
  const affection = settings?.affection || 0;
  const affection_level = settings?.affection_level || 1;

  return {
    level,
    exp,
    affection,
    affection_level,
    next_level_exp: calculateNextLevelExp(level),
    next_affection_threshold: getNextAffectionThreshold(affection_level),
  };
}

async function getDailyLearningStatsInternal(dayKey = getDayKey()) {
  let row = await getFirst('SELECT * FROM daily_learning_stats WHERE day_key = ? LIMIT 1;', [dayKey]);
  if (!row) {
    const ts = now();
    await run(
      `INSERT OR IGNORE INTO daily_learning_stats (day_key, messages_count, target_hits, vocab_new, vocab_review, tasks_completed, completed, created_at, updated_at)
       VALUES (?, 0, 0, 0, 0, 0, 0, ?, ?);`,
      [dayKey, ts, ts]
    );
    row = await getFirst('SELECT * FROM daily_learning_stats WHERE day_key = ? LIMIT 1;', [dayKey]);
  }
  return row;
}

async function applyStreak(dayKey, stats) {
  if (!dayKey || !stats) return stats;
  const isComplete =
    stats.completed ||
    (stats.tasks_completed && stats.tasks_completed > 0) ||
    (stats.messages_count && stats.messages_count >= 3);
  if (!isComplete) return stats;

  const user = await getUserSettings();
  const lastDay = user?.streak_last_day;
  const prevDay = getPrevDayKey(dayKey);
  if (lastDay === dayKey) return stats;

  let streakCurrent = user?.streak_current || 0;
  if (lastDay === prevDay) {
    streakCurrent += 1;
  } else {
    streakCurrent = 1;
  }
  const streakBest = Math.max(user?.streak_best || 0, streakCurrent);
  await updateUserSettings({ streak_current: streakCurrent, streak_best: streakBest, streak_last_day: dayKey });
  return stats;
}

export async function getDailyLearningStats(dayKey = getDayKey()) {
  const row = await getDailyLearningStatsInternal(dayKey);
  return row;
}

export async function bumpDailyProgress({
  dayKey = getDayKey(),
  messagesDelta = 0,
  targetHitsDelta = 0,
  vocabNewDelta = 0,
  vocabReviewDelta = 0,
  taskCompleted = false,
} = {}) {
  const current = await getDailyLearningStatsInternal(dayKey);

  const messages_count = Math.max(0, (current?.messages_count || 0) + messagesDelta);
  const target_hits = Math.max(0, (current?.target_hits || 0) + targetHitsDelta);
  const vocab_new = Math.max(0, (current?.vocab_new || 0) + vocabNewDelta);
  const vocab_review = Math.max(0, (current?.vocab_review || 0) + vocabReviewDelta);
  const tasks_completed = Math.max(0, (current?.tasks_completed || 0) + (taskCompleted ? 1 : 0));
  const shouldComplete = taskCompleted || tasks_completed > 0 || messages_count >= 3;
  const completed = shouldComplete ? 1 : current?.completed || 0;
  const ts = now();

  await run(
    `UPDATE daily_learning_stats
     SET messages_count = ?, target_hits = ?, vocab_new = ?, vocab_review = ?, tasks_completed = ?, completed = ?, updated_at = ?
     WHERE day_key = ?;`,
    [messages_count, target_hits, vocab_new, vocab_review, tasks_completed, completed, ts, dayKey]
  );

  const updated = {
    ...current,
    messages_count,
    target_hits,
    vocab_new,
    vocab_review,
    tasks_completed,
    completed,
    updated_at: ts,
  };

  await applyStreak(dayKey, updated);
  return updated;
}

export async function clearConversationMessages(conversationId) {
  await run('DELETE FROM messages WHERE conversation_id = ?;', [conversationId]);
  await run('UPDATE conversations SET updated_at = ? WHERE id = ?;', [now(), conversationId]);
}

export async function createRoleWithConversation(data) {
  const roleId = data.id || uniqueId('role');
  const conversationId = uniqueId('conv');
  const scriptLines = data.scriptLines?.length ? data.scriptLines : ['请你保持温柔，陪伴用户。'];

  await run(
    'INSERT INTO roles (id, name, avatar, persona, mood, greeting, script, title, city, description, tags, hero_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [
      roleId,
      data.name || '新的心动角色',
      data.avatar || 'https://i.pravatar.cc/120?img=15',
      data.persona || '一个贴心的AI伙伴',
      data.mood || '心动',
      data.greeting || '从现在开始，由我来守护你。',
      JSON.stringify(scriptLines),
      data.title || '心动嘉宾',
      data.city || '云端',
      data.description || data.persona || '',
      JSON.stringify(data.tags || []),
      data.heroImage || data.avatar || 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80',
    ]
  );

  await run(
    'INSERT INTO conversations (id, role_id, title, updated_at, script_cursor) VALUES (?, ?, ?, ?, 0);',
    [conversationId, roleId, data.name || '新的心动角色', now()]
  );

  await ensureRoleSettings(roleId);
  await updateRoleSettings(roleId, {
    nickname_override: data.name || '新的心动角色',
    persona_note: data.persona || '',
  });

  if (data.greeting) {
    const normalized = (data.greeting || '').replace(/\r/g, '').trim();
    if (normalized) {
      let chunks = [];
      if (normalized.includes('\n')) {
        // 按换行符拆分成多个独立消息
        chunks = normalized.split('\n').filter(line => line.trim());
      } else {
        chunks = [normalized];
      }

      // 为每个片段创建独立消息，时间戳递增以保持顺序
      const baseTime = now();
      for (let i = 0; i < chunks.length; i++) {
        await addMessage(conversationId, 'ai', chunks[i], baseTime + i);
      }
    }
  }

  return { roleId, conversationId };
}

export async function deleteConversation(conversationId) {
  const convo = await getFirst('SELECT role_id FROM conversations WHERE id = ? LIMIT 1;', [conversationId]);
  if (!convo) return;
  const roleId = convo.role_id;
  await run('DELETE FROM messages WHERE conversation_id = ?;', [conversationId]);
  await run('DELETE FROM conversations WHERE id = ?;', [conversationId]);
  await run('DELETE FROM role_settings WHERE role_id = ?;', [roleId]);
  await run('DELETE FROM roles WHERE id = ?;', [roleId]);
}

export async function getConversationByRoleId(roleId) {
  const record = await getFirst(
    'SELECT id FROM conversations WHERE role_id = ? LIMIT 1;',
    [roleId]
  );
  return record?.id || null;
}

export async function ensureConversationByRoleId(roleId) {
  if (!roleId) throw new Error('roleId is required');
  const existing = await getConversationByRoleId(roleId);
  if (existing) return existing;
  const role = await getFirst('SELECT name FROM roles WHERE id = ? LIMIT 1;', [roleId]);
  if (!role) throw new Error('角色不存在');
  const conversationId = uniqueId('conv');
  await run(
    'INSERT INTO conversations (id, role_id, title, updated_at, script_cursor) VALUES (?, ?, ?, ?, 0);',
    [conversationId, roleId, role.name || '心动角色', now()]
  );
  await ensureRoleSettings(roleId);
  return conversationId;
}

// -------------- Vocab & SRS --------------

function calculateNextSchedule(item, rating) {
  const nowTs = now();
  const currentInterval = item.interval_ms || 0;
  const currentEase = typeof item.ease === 'number' ? item.ease : 2.5;
  let nextInterval = currentInterval || DAY_MS;
  let nextEase = currentEase;

  switch (rating) {
    case 'again':
      nextInterval = 5 * 60 * 1000;
      nextEase = Math.max(MIN_EASE, currentEase - 0.2);
      break;
    case 'hard':
      nextInterval = Math.max(12 * 60 * 60 * 1000, currentInterval ? currentInterval * 1.2 : DAY_MS * 0.5);
      nextEase = Math.max(MIN_EASE, currentEase - 0.05);
      break;
    case 'easy':
      nextInterval = currentInterval ? currentInterval * (currentEase + 0.3) : DAY_MS * 2;
      nextEase = Math.min(MAX_EASE, currentEase + 0.15);
      break;
    case 'good':
    default:
      nextInterval = currentInterval ? currentInterval * currentEase : DAY_MS;
      nextEase = currentEase;
      break;
  }

  const nextReviewAt = nowTs + Math.max(nextInterval, 10 * 60 * 1000);
  const proficiencyGain = rating === 'again' ? 0 : 1;
  const nextProficiency = Math.max(0, (item.proficiency || 0) + proficiencyGain);
  const mastered = nextProficiency >= 6 && nextInterval >= 14 * DAY_MS ? 1 : 0;

  return {
    ease: nextEase,
    interval_ms: nextInterval,
    next_review_at: nextReviewAt,
    last_review_at: nowTs,
    proficiency: nextProficiency,
    mastered,
  };
}

async function seedSampleVocab() {
  const existing = await getFirst('SELECT COUNT(*) as count FROM vocab_items;');
  if ((existing?.count ?? 0) > 0) return;
  const sample = [
    {
      term: 'immersive',
      definition: '沉浸式的；让人完全投入的',
      language: 'en',
      phonetic: '/ɪˈmɜːrsɪv/',
      example: 'This game offers an immersive language learning experience.',
      example_translation: '这款游戏提供沉浸式的语言学习体验。',
      tags: ['场景', '形容词'],
    },
    {
      term: 'affection',
      definition: '喜爱，感情；温柔',
      language: 'en',
      phonetic: '/əˈfekʃn/',
      example: 'Her affection for you grows with every honest conversation.',
      example_translation: '每一次真诚的对话都会让她对你的好感提升。',
      tags: ['恋爱', '名词'],
    },
    {
      term: 'pronunciation',
      definition: '发音方式；读音',
      language: 'en',
      phonetic: '/prəˌnʌnsiˈeɪʃn/',
      example: 'Practice pronunciation daily to sound more natural.',
      example_translation: '每天练习发音，让表达更自然。',
      tags: ['口语', '学习'],
    },
  ];
  for (const item of sample) {
    await addVocabItem(item, { schedule: false });
  }
}

export async function addVocabItem(data, options = {}) {
  if (!data || !data.term || !`${data.term}`.trim()) {
    throw new Error('term is required for vocab item');
  }
  const id = data.id || uniqueId('vocab');
  const createdAt = data.createdAt || now();
  const updatedAt = createdAt;
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const shouldSchedule = options.schedule !== false;
  const nextReviewAt = shouldSchedule ? (data.next_review_at || createdAt) : null;

  // 去重：如已存在同名词汇则直接返回旧 id
  const existing = await getFirst('SELECT id FROM vocab_items WHERE term = ? LIMIT 1;', [data.term]);
  const targetId = existing?.id || id;

  await run(
    `INSERT OR REPLACE INTO vocab_items (
      id, term, definition, phonetic, language, example, example_translation, tags,
      starred, ease, interval_ms, proficiency, next_review_at, last_review_at, mastered,
      created_at, updated_at, source_role_id, source_conversation_id, source_message_id, audio_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      targetId,
      data.term,
      data.definition || '',
      data.phonetic || '',
      data.language || 'en',
      data.example || '',
      data.example_translation || '',
      JSON.stringify(tags),
      data.starred ? 1 : 0,
      typeof data.ease === 'number' ? data.ease : 2.5,
      data.interval_ms || 0,
      data.proficiency || 0,
      nextReviewAt,
      data.last_review_at || null,
      data.mastered ? 1 : 0,
      createdAt,
      updatedAt,
      data.source_role_id || null,
      data.source_conversation_id || null,
      data.source_message_id || null,
      data.audio_url || null,
    ]
  );

  return targetId;
}

export async function getDueVocabItems(limit = 50) {
  const ts = now();
  const rows = await getAll(
    `SELECT * FROM vocab_items
     WHERE (next_review_at IS NULL OR next_review_at <= ?)
     ORDER BY COALESCE(next_review_at, 0) ASC
     LIMIT ?;`,
    [ts, limit]
  );

  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }));
}

export async function getVocabTimeline(limit = 200) {
  const rows = await getAll(
    `SELECT id, term, definition, language, example, example_translation, tags, created_at
     FROM vocab_items
     ORDER BY created_at DESC
     LIMIT ?;`,
    [limit]
  );
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }));
}

export async function recordVocabReview(vocabId, rating) {
  const item = await getFirst('SELECT * FROM vocab_items WHERE id = ? LIMIT 1;', [vocabId]);
  if (!item) return null;

  const schedule = calculateNextSchedule(item, rating);

  await run(
    `UPDATE vocab_items
     SET ease = ?, interval_ms = ?, next_review_at = ?, last_review_at = ?, proficiency = ?, mastered = ?, updated_at = ?
     WHERE id = ?;`,
    [
      schedule.ease,
      schedule.interval_ms,
      schedule.next_review_at,
      schedule.last_review_at,
      schedule.proficiency,
      schedule.mastered,
      now(),
      vocabId,
    ]
  );

  await run(
    `INSERT INTO vocab_reviews (vocab_id, rating, scheduled_interval_ms, next_review_at, created_at)
     VALUES (?, ?, ?, ?, ?);`,
    [vocabId, rating, schedule.interval_ms, schedule.next_review_at, now()]
  );

  return { ...item, ...schedule };
}

export async function getVocabStats() {
  const total = await getFirst('SELECT COUNT(*) as count FROM vocab_items;');
  const mastered = await getFirst('SELECT COUNT(*) as count FROM vocab_items WHERE mastered = 1;');
  const due = await getFirst('SELECT COUNT(*) as count FROM vocab_items WHERE next_review_at IS NULL OR next_review_at <= ?;', [now()]);
  return {
    total: total?.count ?? 0,
    mastered: mastered?.count ?? 0,
    due: due?.count ?? 0,
  };
}

export async function getVocabByTerm(term) {
  if (!term) return null;
  const record = await getFirst('SELECT * FROM vocab_items WHERE lower(term) = lower(?) LIMIT 1;', [term]);
  if (!record) return null;
  return {
    ...record,
    tags: record.tags ? JSON.parse(record.tags) : [],
  };
}

export async function deleteVocabItem(id) {
  if (!id) return;
  await run('DELETE FROM vocab_items WHERE id = ?;', [id]);
  await run('DELETE FROM vocab_reviews WHERE vocab_id = ?;', [id]);
}

export async function updateVocabItem(id, updates) {
  if (!id || !updates || !Object.keys(updates).length) return;
  const keys = Object.keys(updates);
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => updates[key]);
  await run(
    `UPDATE vocab_items SET ${assignments}, updated_at = ? WHERE id = ?;`,
    [...values, now(), id]
  );
}

export async function saveVocabAudio(id, audioUrl) {
  if (!id || !audioUrl) return;
  await run('UPDATE vocab_items SET audio_url = ?, updated_at = ? WHERE id = ?;', [audioUrl, now(), id]);
}

export { DAILY_VOCAB_TARGET };

// -------------- Daily Theater --------------

const THEATER_POOL = [
  {
    title: '机场速通登机',
    scene: '国际航站楼',
    description: '用英文搞定值机、安检、入境问询，给出关键说法和礼貌用语。',
    reward: 7,
    difficulty: 'M',
    targetRoleId: 'edward',
    targetWords: ['layover', 'immigration checkpoint', 'baggage carousel', 'overbooked flight', 'customs declaration'],
    kickoff: "Flight's in 90 minutes. Help me check in and clear security without drama.",
  },
  {
    title: '酒店升级谈判',
    scene: '精品酒店前台',
    description: '用英文争取延迟退房或升房，说明理由并保持礼貌。',
    reward: 7,
    difficulty: 'M',
    targetRoleId: 'antoine',
    targetWords: ['late checkout', 'concierge desk', 'amenity kit', 'turndown service', 'non-refundable rate'],
    kickoff: "Front desk looks busy. Coach me to ask for an upgrade politely—English only.",
  },
  {
    title: '商务邮件催办',
    scene: '开放办公区',
    description: '写一封简短催办邮件，明确时间线、可执行事项和升级路径。',
    reward: 6,
    difficulty: 'M',
    targetRoleId: 'kieran',
    targetWords: ['follow-up thread', 'actionable items', 'tentative timeline', 'escalation path', 'sign-off'],
    kickoff: "I owe a follow-up. Draft me a concise nudge with a clear timeline.",
  },
  {
    title: '会议对齐复盘',
    scene: '会议室',
    description: '主持 15 分钟站会，列议题、时间盒、纪要和行动项。',
    reward: 6,
    difficulty: 'M',
    targetRoleId: 'kieran',
    targetWords: ['quorum', 'agenda item', 'minutes', 'parking lot', 'takeaway'],
    kickoff: "We have 15 minutes. Help me run this stand-up and keep it tight.",
  },
  {
    title: '雅思口语高分',
    scene: 'IELTS 模拟考场',
    description: '用高阶词汇回答“科技对社交的影响”，写 2 句示例。',
    reward: 8,
    difficulty: 'H',
    targetRoleId: 'edward',
    targetWords: ['ameliorate', 'ubiquitous', 'ramifications', 'juxtapose', 'paradigm shift'],
    kickoff: "Exam vibe. Give me high-scoring lines on tech and social life—concise, please.",
  },
  {
    title: '高中理科冲刺',
    scene: '理化实验室',
    description: '用英文解释公式或实验步骤，突出核心术语和思路。',
    reward: 6,
    difficulty: 'M',
    targetRoleId: 'edward',
    targetWords: ['photosynthesis', 'hypothesis', 'catalyst', 'momentum', 'resilient'],
    kickoff: "Homework crunch. Walk me through the concept in English—keep it clear.",
  },
  {
    title: '甜品社交攻略',
    scene: '法式甜品吧',
    description: '用英文描述甜品口感与推荐理由，练习外来语发音。',
    reward: 6,
    difficulty: 'M',
    targetRoleId: 'antoine',
    targetWords: ['mille-feuille', 'tiramisu', 'creme brulee', 'ganache', 'souffle'],
    kickoff: "Dessert menu is wild. Help me describe picks in English without sounding awkward.",
  },
  {
    title: '约会开场与边界',
    scene: '周末公园',
    description: '用英文开启对话，表达喜好与边界，避免尴尬冷场。',
    reward: 6,
    difficulty: 'M',
    targetRoleId: 'antoine',
    targetWords: ['blind date', 'hit it off', 'deal-breaker', 'chemistry', 'ghosting'],
    kickoff: "First date jitters. Give me openers and boundary lines in English.",
  },
  {
    title: '人际关系高情商',
    scene: '合租客厅',
    description: '用英文表达共情、互惠和冲突调解，举 2 个情境句。',
    reward: 7,
    difficulty: 'H',
    targetRoleId: 'kieran',
    targetWords: ['empathy', 'boundary-setting', 'reciprocity', 'constructive feedback', 'conflict mediation'],
    kickoff: "Housemates disagree again. Coach me to de-escalate—in English.",
  },
  {
    title: '时尚美妆搭配',
    scene: '彩妆工作室',
    description: '用英文描述穿搭廓形、妆效与显色度，给出搭配建议。',
    reward: 7,
    difficulty: 'H',
    targetRoleId: 'antoine',
    targetWords: ['capsule wardrobe', 'silhouette', 'monochrome look', 'dewy finish', 'contouring', 'statement piece'],
    kickoff: "I need a look for tonight. Explain the choices in English so I sound pro.",
  },
  {
    title: '欧美恋爱文化差异',
    scene: '街角咖啡沙发',
    description: '用英文解释关系定义、慢热、过渡恋情等概念，给例句。',
    reward: 7,
    difficulty: 'H',
    targetRoleId: 'kieran',
    targetWords: ['meet-cute', 'DTR', 'slow burn', 'rebound', 'love bombing', 'situationship'],
    kickoff: "Cultural gap alert. Teach me these dating terms in natural English.",
  },
];

function pickDailyTasks(dayKey, count = 3) {
  const pool = [...THEATER_POOL];
  const selected = [];
  while (pool.length && selected.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return selected.map((item, index) => ({
    id: `${dayKey}-${index}-${uniqueId('theater')}`,
    title: item.title,
    description: item.description,
    scene: item.scene,
    target_role_id: item.targetRoleId,
    kickoff_prompt: item.kickoff,
    difficulty: item.difficulty || 'M',
    target_words: JSON.stringify(item.targetWords || []),
    reward_points: item.reward || 5,
    completed: 0,
    day_key: dayKey,
    created_at: now(),
    updated_at: now(),
  }));
}

export async function ensureDailyTasksForDay(dayKey) {
  const existing = await getAll('SELECT * FROM daily_theater_tasks WHERE day_key = ?;', [dayKey]);
  const isValid =
    existing &&
    existing.length >= 3 &&
    existing.every((t) => t.target_role_id && t.kickoff_prompt && t.target_words);
  if (existing && existing.length >= 1 && !isValid) {
    // 尝试为缺少角色/开场白/难度/目标词的旧任务回填
    for (const task of existing) {
      const poolMeta = THEATER_POOL.find((p) => p.title === task.title);
      const fallbackRole = poolMeta?.targetRoleId || 'antoine';
      const fallbackKickoff = poolMeta?.kickoff || 'Hey, ready to start this task?';
      const fallbackDifficulty = poolMeta?.difficulty || 'M';
      const fallbackWords = JSON.stringify(poolMeta?.targetWords || []);

      if (task.target_role_id && task.kickoff_prompt && task.target_words) continue;
      await run(
        'UPDATE daily_theater_tasks SET target_role_id = ?, kickoff_prompt = ?, difficulty = ?, target_words = ? WHERE id = ?;',
        [
          task.target_role_id || fallbackRole,
          task.kickoff_prompt || fallbackKickoff,
          task.difficulty || fallbackDifficulty,
          task.target_words || fallbackWords,
          task.id,
        ]
      );
    }
    const updated = await getAll('SELECT * FROM daily_theater_tasks WHERE day_key = ?;', [dayKey]);
    if (updated.every((t) => t.target_role_id && t.kickoff_prompt && t.target_words)) return updated;
  }

  // 清理旧日数据（只保留当日，避免无限增长）
  await run('DELETE FROM daily_theater_tasks WHERE day_key = ?;', [dayKey]);
  await run('DELETE FROM daily_theater_tasks WHERE day_key != ?;', [dayKey]);

  const tasks = pickDailyTasks(dayKey, 3);
  for (const task of tasks) {
    await run(
      `INSERT OR REPLACE INTO daily_theater_tasks (
        id, title, description, scene, target_role_id, kickoff_prompt, difficulty, target_words, reward_points, completed, day_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        task.id,
        task.title,
        task.description,
        task.scene,
        task.target_role_id,
        task.kickoff_prompt,
        task.difficulty,
        task.target_words,
        task.reward_points,
        task.completed,
        task.day_key,
        task.created_at,
        task.updated_at,
      ]
    );
  }
  return tasks;
}

export async function getDailyTasks(dayKey) {
  const rows = await getAll('SELECT * FROM daily_theater_tasks WHERE day_key = ? ORDER BY created_at ASC;', [dayKey]);
  return rows.map((row) => ({
    ...row,
    target_words: row.target_words ? JSON.parse(row.target_words) : [],
    difficulty: row.difficulty || 'M',
  }));
}

export async function completeDailyTask(taskId) {
  if (!taskId) return;
  const task = await getFirst('SELECT * FROM daily_theater_tasks WHERE id = ? LIMIT 1;', [taskId]);
  if (!task) return;
  if (task.completed) return task;

  await run('UPDATE daily_theater_tasks SET completed = 1, updated_at = ? WHERE id = ?;', [now(), taskId]);
  const current = await getUserSettings();
  const nextAffection = (current?.affection_points || 0) + (task.reward_points || 5);
  await updateUserSettings({ affection_points: nextAffection });

  if (task.target_role_id) {
    const expDelta = (task.difficulty === 'H' ? 30 : 20) + Math.max(0, task.reward_points || 0);
    const affectionDelta = task.reward_points || 5;
    try {
      await addRoleProgress(task.target_role_id, { expDelta, affectionDelta });
    } catch (error) {
      console.warn('[DailyTheater] addRoleProgress failed', error);
    }
  }
  return { ...task, completed: 1, affection_points: nextAffection };
}
