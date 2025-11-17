import * as SQLite from 'expo-sqlite';
import { roleSeeds } from '../data/seeds';

let databasePromise;
const now = () => Date.now();

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
      currency_balance INTEGER DEFAULT 520
    );`);

  await run(`CREATE TABLE IF NOT EXISTS liked_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id TEXT,
      created_at INTEGER
    );`);

  await seedInitialData();
}

async function seedInitialData() {
  const user = await getFirst('SELECT COUNT(*) as count FROM user_settings WHERE id = ?;', ['default']);
  if ((user?.count ?? 0) === 0) {
    await run(
      'INSERT INTO user_settings (id, nickname, gender, chat_background, pin_chat, memory_enabled, currency_balance) VALUES (?, ?, ?, ?, ?, ?, ?);',
      ['default', '帅', '男', '#ffeef2', 1, 1, 520]
    );
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
