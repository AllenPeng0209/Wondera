import { advanceScriptCursor } from '../storage/db';
import { sendBailianMessage } from './bailian';

async function callQwen(messages, systemPrompt) {
  try {
    const text = await sendBailianMessage(messages, {
      system: systemPrompt,
      model: 'qwen-plus',
      temperature: 0.7,
      top_p: 0.8,
    });
    return text?.trim?.() || '';
  } catch (error) {
    const message = error?.message || '';
    if (message.includes('Bailian API key or endpoint not configured')) {
      throw new Error('BAILIAN credentials missing');
    }
    throw error;
  }
}

function prepareSystemPrompt(role) {
  return `请严格扮演“${role.name}”，具备以下设定：${role.persona}`;
}

function buildMessagePayload(history) {
  const MAX_HISTORY = 12;
  const selected = history.slice(-MAX_HISTORY);
  return selected.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.body,
  }));
}

async function fallbackFromScript(conversation, role) {
  const script = role.script || [];
  if (!script.length) {
    return { text: '我在呢，先陪你聊聊，稍后继续深入。', fallback: true, nextCursor: conversation.scriptCursor ?? 0 };
  }
  const cursor = conversation.scriptCursor ?? 0;
  const line = script[cursor % script.length];
  const nextCursor = cursor + 1;
  await advanceScriptCursor(conversation.id, nextCursor);
  return { text: line, fallback: true, nextCursor };
}

export async function generateAiReply({ conversation, role, history }) {
  try {
    const text = await callQwen(buildMessagePayload(history), prepareSystemPrompt(role));
    if (!text) {
      return fallbackFromScript(conversation, role);
    }
    return { text, fallback: false, nextCursor: conversation.scriptCursor };
  } catch (error) {
    console.warn('[AI] qwen 调用失败，回退脚本：', error?.message || error);
    return fallbackFromScript(conversation, role);
  }
}
