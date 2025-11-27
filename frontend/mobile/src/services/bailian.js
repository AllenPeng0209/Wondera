const BAILIAN_API_KEY = process.env.EXPO_PUBLIC_BAILIAN_API_KEY || '';
const BAILIAN_ENDPOINT =
  (process.env.EXPO_PUBLIC_BAILIAN_ENDPOINT || 'https://dashscope.aliyuncs.com').replace(/\/$/, '');
const BAILIAN_WORKSPACE_ID = process.env.EXPO_PUBLIC_BAILIAN_WORKSPACE_ID || '';
const BAILIAN_USE_WORKSPACE = (process.env.EXPO_PUBLIC_BAILIAN_USE_WORKSPACE || '').toLowerCase() === '1';
const COMPLETIONS_PATH = '/compatible-mode/v1/chat/completions';

const DEFAULT_OPTIONS = {
  model: 'qwen-turbo',
  temperature: 0.7,
  top_p: 0.8,
};

const ensureCredentials = () => {
  if (!BAILIAN_API_KEY || !BAILIAN_ENDPOINT) {
    throw new Error('Bailian API key or endpoint not configured');
  }
};

const getCommonHeaders = (includeWorkspaceHeader) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BAILIAN_API_KEY}`,
  };
  if (includeWorkspaceHeader && BAILIAN_USE_WORKSPACE && BAILIAN_WORKSPACE_ID) {
    headers['X-DashScope-Workspace'] = BAILIAN_WORKSPACE_ID;
  }
  return headers;
};

const isInvalidWorkspaceHeader = (text = '') =>
  /invalid header\s+"x-dashscope-?workspace"/i.test(text) ||
  /Invalid header "X-DashScope-WorkSpace"/i.test(text);

const buildPayload = (messages, options) => {
  const payload = {
    model: options.model || DEFAULT_OPTIONS.model,
    stream: Boolean(options.stream),
    messages: [
      ...(options.system ? [{ role: 'system', content: options.system }] : []),
      ...messages,
    ],
    temperature:
      typeof options.temperature === 'number' ? options.temperature : DEFAULT_OPTIONS.temperature,
    top_p: typeof options.top_p === 'number' ? options.top_p : DEFAULT_OPTIONS.top_p,
  };
  if (options.max_tokens) {
    payload.max_tokens = options.max_tokens;
  }
  return payload;
};

export async function sendBailianMessage(messages, options = {}) {
  ensureCredentials();
  const endpoint = `${BAILIAN_ENDPOINT}${COMPLETIONS_PATH}`;
  const payload = buildPayload(messages, options);

  const doRequest = (withWorkspaceHeader) =>
    fetch(endpoint, {
      method: 'POST',
      headers: getCommonHeaders(withWorkspaceHeader),
      body: JSON.stringify(payload),
    });

  try {
    let response = await doRequest(true);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 400 && isInvalidWorkspaceHeader(errorText)) {
        response = await doRequest(false);
      }
      if (!response.ok) {
        throw new Error(`Bailian API error: ${response.status} - ${errorText}`);
      }
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error('Bailian API error:', error);
    throw error;
  }
}

export async function sendBailianMessageStream(
  messages,
  onMessage,
  onComplete,
  onError,
  options = {}
) {
  ensureCredentials();
  const endpoint = `${BAILIAN_ENDPOINT}${COMPLETIONS_PATH}`;
  const payload = buildPayload(messages, { ...options, stream: true });

  const tryFetchStreaming = async () => {
    const doRequest = (withWorkspaceHeader) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { ...getCommonHeaders(withWorkspaceHeader), Accept: 'text/event-stream' },
        body: JSON.stringify(payload),
      });

    let response = await doRequest(true);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 400 && isInvalidWorkspaceHeader(errorText)) {
        response = await doRequest(false);
      }
      if (!response.ok) {
        throw new Error(`Bailian API error: ${response.status} - ${errorText}`);
      }
    }

    const reader = response.body?.getReader?.();
    if (!reader) {
      throw new Error('ReadableStream not available');
    }
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          onComplete();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) onMessage(delta);
        } catch {
          // ignore malformed payloads
        }
      }
    }
    onComplete();
  };

  const tryXHRStreaming = async () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    const headers = getCommonHeaders(true);
    Object.entries({ ...headers, Accept: 'text/event-stream' }).forEach(([k, v]) =>
      xhr.setRequestHeader(k, v)
    );
    let lastPos = 0;

    xhr.onprogress = () => {
      const chunk = xhr.responseText.substring(lastPos);
      lastPos = xhr.responseText.length;
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          onComplete();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) onMessage(delta);
        } catch {
          // ignore malformed payloads
        }
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          onComplete();
        } else {
          const text = xhr.responseText || '';
          if (xhr.status === 400 && isInvalidWorkspaceHeader(text)) {
            const xhr2 = new XMLHttpRequest();
            xhr2.open('POST', endpoint, true);
            const hdrs = getCommonHeaders(false);
            Object.entries({ ...hdrs, Accept: 'text/event-stream' }).forEach(([k, v]) =>
              xhr2.setRequestHeader(k, v)
            );
            let last2 = 0;
            xhr2.onprogress = () => {
              const chunk2 = xhr2.responseText.substring(last2);
              last2 = xhr2.responseText.length;
              const lines2 = chunk2.split('\n');
              for (const line of lines2) {
                if (!line || !line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data || data === '[DONE]') {
                  onComplete();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content ?? '';
                  if (delta) onMessage(delta);
                } catch {
                  // ignore malformed payloads
                }
              }
            };
            xhr2.onreadystatechange = () => {
              if (xhr2.readyState === 4 && !(xhr2.status >= 200 && xhr2.status < 300)) {
                onError(new Error(`Bailian stream error: ${xhr2.status} - ${xhr2.responseText}`));
              }
            };
            xhr2.onerror = () => onError(new Error('Bailian stream network error (retry)'));
            xhr2.send(JSON.stringify(payload));
            return;
          }
          onError(new Error(`Bailian stream error: ${xhr.status} - ${text}`));
        }
      }
    };

    xhr.onerror = () => onError(new Error('Bailian stream network error'));
    xhr.send(JSON.stringify(payload));
  };

  try {
    await tryFetchStreaming();
  } catch (error) {
    try {
      await tryXHRStreaming();
    } catch (fallbackError) {
      onError(fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
    }
  }
}



