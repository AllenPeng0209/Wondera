import { advanceScriptCursor } from '../storage/db';
import { sendBailianMessage } from './bailian';
import { getRelationshipStageByAffectionLevel } from './relationship';

const DEFAULT_TEXT_MODEL = 'qwen-plus';
const DEFAULT_VLM_MODEL = (process.env.EXPO_PUBLIC_BAILIAN_VLM_MODEL || '').trim() || 'qwen-vl-plus';

const isVlmModelName = (model = '') => /(^|[^a-z])vl([^a-z]|$)|vision/i.test(model);

function resolveChatModels(userProfile) {
  const preferred = (userProfile?.api_model || '').trim();
  const textModel = preferred && !isVlmModelName(preferred) ? preferred : DEFAULT_TEXT_MODEL;
  const vlmModel = (process.env.EXPO_PUBLIC_BAILIAN_VLM_MODEL || '').trim()
    || (preferred && isVlmModelName(preferred) ? preferred : DEFAULT_VLM_MODEL);
  return { textModel, vlmModel };
}

async function callQwen(messages, systemPrompt, options = {}) {
  try {
    const text = await sendBailianMessage(messages, {
      system: systemPrompt,
      model: options.model || DEFAULT_TEXT_MODEL,
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

function prepareSystemPrompt(role, userProfile, affectionLevel) {
  const relationshipStage = getRelationshipStageByAffectionLevel(affectionLevel);
  const relationshipContext = relationshipStage
    ? `关系状态：${relationshipStage.label}。亲密度要求：${relationshipStage.promptHint}。`
    : '';
  const userParts = [];
  if (userProfile?.nickname) userParts.push(`对方昵称：${userProfile.nickname}`);
  if (userProfile?.mbti) userParts.push(`MBTI：${userProfile.mbti}`);
  if (userProfile?.zodiac) userParts.push(`星座：${userProfile.zodiac}`);
  if (userProfile?.birthday) userParts.push(`生日：${userProfile.birthday}`);
  const userContext = userParts.length
    ? `用户画像：${userParts.join('，')}。对话时自然地体现和呼应这些特点，根据关系状态调整亲密度，但不要反复背诵或显得刻意。`
    : '';
  const vibeHint = '整体风格：更好玩、更会接话，多给情绪价值；可以轻微吐槽但不攻击用户或第三方。';
  const visionHint =
    '当用户发送图片/截图时：先用一句话说出你看到了什么关键信息（尤其是聊天截图：抓住对方语气/潜台词），再给足情绪价值（共情+肯定/站队+一个可执行的小建议）；语气俏皮一点、像朋友吐槽，可以少量 emoji，但不要油腻或说教。';
  return `请严格扮演“${role.name}”，具备以下设定：${role.persona}。${relationshipContext}${userContext}${vibeHint}${visionHint}回复要求：只用口语化第一人称对话，不写旁白、动作或场景描写；不要使用括号/星号等舞台指令；保持简短，单条回复尽量控制在30-80个汉字。`;
}

function parseImageMediaKey(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return null;
  const trimmed = mediaKey.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          uri: parsed.uri || null,
          base64: parsed.base64 || null,
          mimeType: parsed.mimeType || parsed.mime_type || null,
        };
      }
    } catch {
      // ignore
    }
  }
  return { uri: trimmed, base64: null, mimeType: null };
}

function buildMessagePayload(history) {
  const MAX_HISTORY = 12;
  const MAX_IMAGES = 2;
  const selected = history.slice(-MAX_HISTORY);
  let imageCount = 0;
  let hasImage = false;

  const payloadMessages = selected.map((msg) => {
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    const quotedPrefix = msg.quotedBody ? `【引用】${msg.quotedBody}\n\n` : '';
    const body = (msg.body || '').trim();

    if (msg.kind === 'image') {
      const media = parseImageMediaKey(msg.mediaKey);
      const mimeType = media?.mimeType || 'image/jpeg';
      const dataUrl = media?.base64 ? `data:${mimeType};base64,${media.base64}` : null;
      const textPart = `${quotedPrefix}${body || '（用户发来一张图片）'}`.trim();

      if (!dataUrl || imageCount >= MAX_IMAGES) {
        return {
          role,
          content: `${textPart}${dataUrl ? '' : '（图片未附带，按文字理解）'}`,
        };
      }

      imageCount += 1;
      hasImage = true;
      return {
        role,
        content: [
          { type: 'text', text: textPart },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
        ],
      };
    }

    return {
      role,
      content: `${quotedPrefix}${body}`.trim(),
    };
  });

  if (hasImage) {
    return { messages: payloadMessages, hasImage: true };
  }
  return { messages: payloadMessages, hasImage: false };
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

export async function generateAiReply({ conversation, role, history, userProfile, affectionLevel }) {
  try {
    const { messages, hasImage } = buildMessagePayload(history);
    const { textModel, vlmModel } = resolveChatModels(userProfile);
    const model = hasImage ? vlmModel : textModel;
    const text = await callQwen(messages, prepareSystemPrompt(role, userProfile, affectionLevel), { model });
    if (!text) {
      return fallbackFromScript(conversation, role);
    }
    return { text, fallback: false, nextCursor: conversation.scriptCursor };
  } catch (error) {
    console.warn('[AI] qwen 调用失败，回退脚本：', error?.message || error);
    return fallbackFromScript(conversation, role);
  }
}

export async function getWordCard(word) {
  if (!word || !word.trim()) throw new Error('word is required');
  const system = 'You are a bilingual English-Chinese word helper. Output concise JSON with translation, example, and an imagePrompt for illustration. Keep it short.';
  const prompt = `Word: ${word}\nReturn JSON like {"translation":"简短中文义","example":"Short English example using the word","imagePrompt":"Short image description"}.`;
  const raw = await sendBailianMessage([{ role: 'user', content: prompt }], { system, model: 'qwen-plus' });
  try {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      const imgPrompt = parsed.imagePrompt || parsed.image_prompt || `A simple illustration of ${word}.`;
      const query = encodeURIComponent(imgPrompt || word);
      const imageUrls = [
        `https://source.unsplash.com/featured/800x600/?${query}&sig=${Date.now()}`,
        `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(word)}&sig=${Date.now() + 1}`,
        `https://loremflickr.com/800/600/${encodeURIComponent(word)}`,
        `https://dummyimage.com/800x600/ffe1eb/333&text=${encodeURIComponent(word)}`,
      ];
      return {
        translation: parsed.translation || `示例翻译：${word}`,
        example: parsed.example || `Example: use ${word} in a sentence.`,
        imagePrompt: imgPrompt,
        imageUrl: imageUrls[0],
        imageUrls,
      };
    }
  } catch (e) {
    console.warn('[AI] parse word card failed', e);
  }
  return {
    translation: `示例翻译：${word}`,
    example: `Example: use ${word} in a sentence.`,
    imagePrompt: `A simple illustration of ${word}.`,
    imageUrl: `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(word)}&sig=${Date.now()}`,
    imageUrls: [
      `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(word)}&sig=${Date.now()}`,
      `https://loremflickr.com/800/600/${encodeURIComponent(word)}`,
      `https://dummyimage.com/800x600/ffe1eb/333&text=${encodeURIComponent(word)}`,
    ],
  };
}
