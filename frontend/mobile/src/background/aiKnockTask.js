import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import {
  getKnockableConversations,
  getConversationDetail,
  getMessages,
  addMessage,
} from '../storage/db';
import { generateAiReply } from '../services/ai';
import { sendLocalKnockNotification } from '../services/notifications';

export const AI_KNOCK_TASK = 'dreamate-ai-knock-background-task';

// The task definition must be at module top-level
TaskManager.defineTask(AI_KNOCK_TASK, async () => {
  if (Platform.OS === 'web') {
    return BackgroundFetch.Result.NoData;
  }

  try {
    const didSend = await runAiKnockOnce();
    return didSend ? BackgroundFetch.Result.NewData : BackgroundFetch.Result.NoData;
  } catch (error) {
    console.warn('[AI Knock] Background task failed', error);
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerAiKnockBackgroundTask() {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(AI_KNOCK_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(AI_KNOCK_TASK, {
        minimumInterval: 60 * 60, // ~1 hour, actual cadence由系统决定
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[AI Knock] Registered background fetch task');
    } else {
      console.log('[AI Knock] Background fetch task already registered');
    }
    return true;
  } catch (error) {
    console.warn('[AI Knock] Failed to register background task', error);
    return false;
  }
}

// 单次执行逻辑：挑一个适合“拍一拍”的会话，生成一条 AI 消息并通过本地通知提醒
// sinceMs 可选：用于开发环境强制触发（例如传 0 忽略时间限制）
export async function runAiKnockOnce(sinceMs = 6 * 60 * 60 * 1000) {
  const candidates = await getKnockableConversations(sinceMs);
  if (!Array.isArray(candidates) || !candidates.length) {
    return false;
  }

  const target = candidates[0];
  const detail = await getConversationDetail(target.id);
  if (!detail) return false;

  const { conversation, role } = detail;
  const history = await getMessages(conversation.id);

  const aiResult = await generateAiReply({
    conversation,
    role,
    history,
  });

  const text = (aiResult?.text || '').trim();
  if (!text) {
    return false;
  }

  const createdAt = Date.now();
  await addMessage(conversation.id, 'ai', text, createdAt);

  const preview = text.replace(/\s+/g, ' ').slice(0, 40);

  await sendLocalKnockNotification({
    conversationId: conversation.id,
    title: `${role.name} 想你了`,
    body: preview || '点进来看看 Ta 对你说了什么',
  });

  console.log('[AI Knock] Sent proactive message for conversation', conversation.id);
  return true;
}
