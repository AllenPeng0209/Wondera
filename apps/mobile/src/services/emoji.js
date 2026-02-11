import { emojiGroups } from '../data/emojiAssets';

const EMOTION_CUES = {
  praise: ['太棒', '厉害', '优秀', '牛', '奈斯', '绝了', '鼓掌', 'yyds', 'nice', 'great', 'awesome', 'amazing', 'perfect', '666', 'good job'],
  sad: ['难过', '伤心', '委屈', '想哭', '哭', '心碎', '难受', '不开心', '郁闷', 'emo', 'sad', 'upset', 'depressed'],
  angry: ['生气', '气死', '滚', '讨厌', '烦', '闭嘴', '吵', '别烦', '怒', 'angry', 'mad', 'hate', 'idiot', 'stupid', 'shut up', 'fuck'],
  fear: ['害怕', '怕', '恐怖', '吓', '慌', '紧张', '可怕', 'scared', 'afraid', 'terrified'],
  flirt: ['想你', '想我', '爱你', '爱', '喜欢你', '喜欢', '亲', '亲亲', '抱', '抱抱', '么么', '贴贴', '可爱', '宝贝', '心动', '比心', '晚安', 'kiss', 'love', 'miss you', 'xoxo', 'mwah', '❤️', '💕', '💗'],
  sleepy: ['困', '累', '睡', '晚安', '熬夜', '通宵', '打盹', 'tired', 'sleepy', 'good night'],
  funny: ['哈哈', '哈哈哈', '笑死', '笑哭', '蚌埠住', '离谱', '搞笑', '好笑', 'lol', 'lmao', 'rofl'],
};

function countCueHits(text, cues) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const cue of cues) {
    if (!cue) continue;
    if (lower.includes(cue.toLowerCase())) hits += 1;
  }
  return hits;
}

function softmax(scores) {
  const entries = Object.entries(scores);
  const max = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([k, v]) => [k, Math.exp(v - max)]);
  const sum = exps.reduce((acc, [, v]) => acc + v, 0) || 1;
  return Object.fromEntries(exps.map(([k, v]) => [k, v / sum]));
}

export function getEmotionProbabilities(text) {
  const trimmed = (text || '').trim();
  const exclamations = (trimmed.match(/[!！]+/g) || []).join('').length;
  const questions = (trimmed.match(/[\?？]+/g) || []).join('').length;

  const raw = {
    praise: 0.2,
    sad: 0.2,
    angry: 0.2,
    fear: 0.2,
    flirt: 0.2,
    sleepy: 0.2,
    funny: 0.2,
    neutral: 0.8,
  };

  for (const [emotion, cues] of Object.entries(EMOTION_CUES)) {
    raw[emotion] += countCueHits(trimmed, cues) * 1.2;
  }

  // Punctuation hints
  raw.praise += exclamations * 0.08;
  raw.angry += exclamations * 0.06;
  raw.fear += questions * 0.04;
  raw.neutral += Math.max(0, 1 - trimmed.length / 80) * 0.3;

  // Length hint: longer replies tend to be less "sticker-only"
  raw.neutral += Math.min(1.0, trimmed.length / 120) * 0.2;

  return softmax(raw);
}

function weightedPick(probabilities, rng = Math.random) {
  const entries = Object.entries(probabilities);
  let r = rng();
  for (const [k, p] of entries) {
    r -= p;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1]?.[0] || 'neutral';
}

function getSendChance(emotion, intensity, text) {
  const baseByEmotion = {
    praise: 0.4,
    funny: 0.4,
    flirt: 0.42,
    sad: 0.28,
    fear: 0.26,
    angry: 0.18,
    sleepy: 0.28,
    neutral: 0.14,
  };

  const base = baseByEmotion[emotion] ?? 0.2;
  const len = (text || '').trim().length;
  const lengthFactor = len < 8 ? 0.5 : len > 80 ? 1.1 : 1.0;
  const intensityFactor = 0.75 + Math.min(0.35, Math.max(0, intensity - 0.2));
  return Math.max(0, Math.min(0.85, base * lengthFactor * intensityFactor));
}

export function pickEmojiKeyForText(text, { rng = Math.random } = {}) {
  const probs = getEmotionProbabilities(text);
  const emotion = weightedPick(probs, rng);
  const intensity = probs[emotion] ?? 0;

  const chance = getSendChance(emotion, intensity, text);
  if (rng() > chance) return null;

  const pool = emojiGroups[emotion] || emojiGroups.neutral || [];
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}
