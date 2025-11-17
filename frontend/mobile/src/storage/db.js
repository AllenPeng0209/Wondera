import * as SQLite from 'expo-sqlite';
import { roleSeeds } from '../data/seeds';

let databasePromise;
const now = () => Date.now();
const uniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('dreamate.db');
  }
  return databasePromise;
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
      created_at INTEGER,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
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
      wait_to_reply INTEGER DEFAULT 0
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

  await seedInitialData();
}

async function seedInitialData() {
  const user = await getFirst('SELECT COUNT(*) as count FROM user_settings WHERE id = ?;', ['default']);
  if ((user?.count ?? 0) === 0) {
    await run(
      'INSERT INTO user_settings (id, nickname, gender, chat_background, pin_chat, memory_enabled, currency_balance) VALUES (?, ?, ?, ?, ?, ?, ?);',
      ['default', '帅', '男', '#ffeef2', 1, 1, 520]
    );
    await updateUserSettings({
      wallet_recharge_history: JSON.stringify([]),
      api_provider: 'Dreamate Cloud',
      api_mode: 'wallet',
      bubble_style: 'default',
    });
  }

  const existing = await getFirst('SELECT COUNT(*) as count FROM roles;');
  const count = existing?.count ?? 0;
  if (count > 0) return;

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
}

export async function getConversations() {
  const rows = await getAll(`
    SELECT c.id, c.role_id as roleId, r.name, r.avatar, r.mood, r.greeting,
           c.updated_at as updatedAt,
           (
             SELECT body FROM messages m
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

export async function getConversationDetail(conversationId) {
  const record = await getFirst(
    `SELECT c.*, r.name, r.avatar, r.persona, r.mood, r.greeting, r.script
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
    },
  };
}

export async function getMessages(conversationId) {
  const rows = await getAll(
    'SELECT id, sender, body, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;',
    [conversationId]
  );
  return rows;
}

export async function addMessage(conversationId, sender, body, createdAt = now()) {
  const insertResult = await run(
    'INSERT INTO messages (conversation_id, sender, body, created_at) VALUES (?, ?, ?, ?);',
    [conversationId, sender, body, createdAt]
  );
  await run('UPDATE conversations SET updated_at = ? WHERE id = ?;', [createdAt, conversationId]);

  const insertedId = insertResult.lastInsertRowId ?? insertResult.insertId;
  return {
    id: insertedId ?? `${conversationId}-${createdAt}-${sender}`,
    sender,
    body,
    createdAt,
  };
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
  await run(
    'INSERT OR IGNORE INTO role_settings (role_id, allow_emoji, allow_knock, max_replies, persona_note, expression_style, catchphrase, user_personality) VALUES (?, 1, 1, 5, ?, ?, ?, ?);',
    [roleId, '', '', '', '']
  );
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
    await addMessage(conversationId, 'ai', data.greeting, now());
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
