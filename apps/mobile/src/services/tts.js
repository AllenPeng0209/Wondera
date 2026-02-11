function getQwenBaseUrl() {
  const raw =
    process.env.EXPO_PUBLIC_QWEN_TTS_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
  let base = raw.trim().replace(/\/+$/, '');
  // 如果没有显式带上 /api/v1，则补上，避免配置成 https://dashscope.aliyuncs.com 导致 404
  if (!/\/api\/v\d+$/.test(base)) {
    base = `${base}/api/v1`;
  }
  return base;
}

const DASH_SCOPE_BASE_URL = getQwenBaseUrl();
const BAILIAN_API_KEY = process.env.EXPO_PUBLIC_BAILIAN_API_KEY || '';
const BAILIAN_ENDPOINT_RAW =
  (process.env.EXPO_PUBLIC_BAILIAN_ENDPOINT || 'https://dashscope.aliyuncs.com').trim().replace(/\/+$/, '');

const DEFAULT_TTS_MODEL = 'qwen3-tts-flash';
const DEFAULT_FORMAT = 'mp3';
const DEFAULT_SAMPLE_RATE = 24000;

function ensureCredentials() {
  if (!BAILIAN_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_BAILIAN_API_KEY for Qwen TTS');
  }
}

function buildHeaders(extra = {}) {
  ensureCredentials();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BAILIAN_API_KEY}`,
    ...extra,
  };
}

async function handleResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || parsed?.error?.message || text;
    } catch {
      // ignore
    }
    throw new Error(`Qwen TTS error: ${res.status} - ${message}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse Qwen TTS response');
  }
}

/**
 * 直接调用 Qwen TTS HTTP 接口，将文本转换为语音。
 * 返回包含音频 URL（推荐前端直接播放）。
 */
export async function synthesizeQwenTts({
  text,
  voiceId,
  format,
  sampleRate,
  pitch,
  rate,
  enableSubtitle,
} = {}) {
  const normalizedText = (text || '').trim();
  if (!normalizedText) {
    throw new Error('TTS text is empty');
  }

  const finalFormat = format || DEFAULT_FORMAT;
  const finalSampleRate = sampleRate || DEFAULT_SAMPLE_RATE;

  const body = {
    model: DEFAULT_TTS_MODEL,
    input: {
      text: normalizedText,
      // 若需要自定义音色，可将 voiceId 传入 voice 字段
      ...(voiceId ? { voice: voiceId } : {}),
      // 默认按中文处理；如需英文可改成 English
      language_type: 'Chinese',
    },
    // 一些租户的文档将音频配置放在 parameters/audio_config 下；
    // 这里尽量兼容常见写法，若不支持服务端会忽略。
    parameters: {
      audio_config: {
        format: finalFormat,
        sample_rate: finalSampleRate,
      },
    },
  };

  if (typeof pitch === 'number') {
    body.parameters.audio_config.pitch = pitch;
  }
  if (typeof rate === 'number') {
    body.parameters.audio_config.rate = rate;
  }
  if (enableSubtitle) {
    body.parameters.enable_subtitle = true;
  }

  const primaryEndpoint =
    process.env.EXPO_PUBLIC_QWEN_TTS_ENDPOINT ||
    `${BAILIAN_ENDPOINT_RAW}/api/v1/services/aigc/multimodal-generation/generation`;
  console.log('[TTS] synthesizeQwenTts', {
    endpoint: primaryEndpoint,
    textLength: normalizedText.length,
    hasApiKey: Boolean(BAILIAN_API_KEY),
  });

  let res = await fetch(primaryEndpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    // 若新多模态端点不可用，尝试旧版 /tts/speech
    const legacyEndpoint = `${DASH_SCOPE_BASE_URL}/tts/speech`;
    console.warn('[TTS] primary endpoint 404, trying legacy endpoint', legacyEndpoint);
    res = await fetch(legacyEndpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        model: 'qwen-tts-realtime',
        input: {
          text: normalizedText,
          format: finalFormat,
          sample_rate: finalSampleRate,
        },
      }),
    });

    // 旧版 /tts/speech 仍然 404，则尝试兼容模式音频接口
    if (res.status === 404) {
      const compatEndpoint = `${BAILIAN_ENDPOINT_RAW}/compatible-mode/v1/audio/speech`;
      console.warn('[TTS] legacy endpoint 404, trying compat endpoint', compatEndpoint);
      res = await fetch(compatEndpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          model: DEFAULT_TTS_MODEL,
          input: {
            text: normalizedText,
          },
          audio_format: finalFormat,
          sample_rate: finalSampleRate,
        }),
      });
    }
  }

  const data = await handleResponse(res);
  const output = data?.output || {};

  const audioUrl =
    output.audio_url ||
    (output.audio && output.audio.url) ||
    data.audio_url ||
    null;

  const durationMs =
    output.duration_ms ||
    (output.audio && output.audio.duration_ms) ||
    data.duration_ms ||
    null;

  const durationSeconds =
    typeof durationMs === 'number' ? durationMs / 1000 : null;
  const requestId = data.request_id || output.request_id || null;
  const mimeType = finalFormat ? `audio/${finalFormat}` : null;

  return {
    audioUrl,
    durationSeconds,
    requestId,
    format: finalFormat,
    mimeType,
    raw: data,
  };
}
