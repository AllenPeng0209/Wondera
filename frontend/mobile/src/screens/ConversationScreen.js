import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addMessage,
  addVocabItem,
  addRoleProgress,
  bumpDailyProgress,
  getConversationDetail,
  getMessages,
  getRoleSettings,
  getRoleProgress,
  getDailyLearningStats,
  getUserSettings,
  saveMessageAudio,
  deleteMessage,
  DAILY_VOCAB_TARGET,
} from '../storage/db';
import { generateAiReply, getWordCard } from '../services/ai';
import { pickEmojiKeyForText } from '../services/emoji';
import { synthesizeQwenTts } from '../services/tts';
import { getRoleImage } from '../data/images';
import { getEmojiSourceByKey } from '../data/emojiAssets';
import { getRelationshipLabelByAffectionLevel } from '../services/relationship';

const NEGATIVE_CUES = ['讨厌', '滚', '闭嘴', '生气', '气死', '别烦', '不理你', 'hate you', 'stupid', 'idiot', 'angry', 'annoying', 'shut up', 'fuck'];
const GIFT_OPTIONS = [
  {
    id: 'gift-rose',
    title: '玫瑰',
    effect: '心动 +3',
    affection: 3,
    icon: 'heart',
    accent: '#f093a4',
    soft: '#ffe9f0',
  },
  {
    id: 'gift-ticket',
    title: '电影票',
    effect: '心动 +8',
    affection: 8,
    icon: 'ticket',
    accent: '#f0a65a',
    soft: '#fff1de',
  },
  {
    id: 'gift-scarf',
    title: '围巾',
    effect: '心动 +15',
    affection: 15,
    icon: 'ribbon',
    accent: '#6fa3e8',
    soft: '#eaf3ff',
  },
  {
    id: 'gift-ring',
    title: '誓言戒',
    effect: '心动 +30',
    affection: 30,
    icon: 'diamond',
    accent: '#9b7ed9',
    soft: '#f0e9ff',
  },
];
const ACTION_TONES = [
  { key: 'tender', label: '轻柔', hint: '温柔不冒犯', accent: '#f093a4', soft: '#ffe9f0' },
  { key: 'playful', label: '俏皮', hint: '甜甜小调皮', accent: '#f0a65a', soft: '#fff1de' },
  { key: 'warm', label: '安抚', hint: '陪你稳稳的', accent: '#6fa3e8', soft: '#eaf3ff' },
  { key: 'spark', label: '心动', hint: '暧昧升温', accent: '#9b7ed9', soft: '#f0e9ff' },
];
const ACTION_COMMANDS = [
  { id: 'hug', label: '轻拥入怀', icon: 'heart-outline' },
  { id: 'headpat', label: '摸摸头发', icon: 'hand-left-outline' },
  { id: 'lean', label: '让我靠在你肩上', icon: 'happy-outline' },
  { id: 'walk', label: '牵手散步', icon: 'walk-outline' },
  { id: 'movie', label: '一起看电影', icon: 'film-outline' },
  { id: 'whisper', label: '贴近耳语', icon: 'chatbubble-ellipses-outline' },
  { id: 'scarf', label: '帮我系围巾', icon: 'ribbon-outline' },
  { id: 'goodnight', label: '送我晚安吻', icon: 'moon-outline' },
];
const POLAROID_INTIMACY = [
  { key: 'soft', label: '微光', hint: '距离刚好', accent: '#f0a65a', soft: '#fff1de' },
  { key: 'close', label: '心动', hint: '靠近一点', accent: '#f093a4', soft: '#ffe9f0' },
  { key: 'tease', label: '暧昧', hint: '呼吸很近', accent: '#9b7ed9', soft: '#f0e9ff' },
];
const POLAROID_POSES = [
  { id: 'gaze', label: '对视偷笑', icon: 'eye-outline' },
  { id: 'touch', label: '指尖相触', icon: 'hand-right-outline' },
  { id: 'whisper', label: '耳边低语', icon: 'chatbubble-ellipses-outline' },
  { id: 'scarf', label: '围巾拉近', icon: 'ribbon-outline' },
  { id: 'walk', label: '并肩漫步', icon: 'walk-outline' },
  { id: 'movie', label: '同看一幕', icon: 'film-outline' },
];

function detectNegativeTone(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const cue of NEGATIVE_CUES) {
    if (lower.includes(cue)) hits += 1;
  }
  return hits;
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
          width: parsed.width || null,
          height: parsed.height || null,
          fileName: parsed.fileName || parsed.file_name || null,
        };
      }
    } catch {
      // ignore malformed
    }
  }
  return { uri: trimmed };
}

function parseGiftMediaKey(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return null;
  const trimmed = mediaKey.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          id: parsed.id || parsed.giftId || null,
          title: parsed.title || null,
          effect: parsed.effect || null,
          affection: typeof parsed.affection === 'number' ? parsed.affection : null,
          icon: parsed.icon || null,
          accent: parsed.accent || null,
          soft: parsed.soft || null,
        };
      }
    } catch {
      // ignore malformed
    }
  }
  return { title: trimmed };
}

function parseActionMediaKey(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return null;
  const trimmed = mediaKey.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          toneKey: parsed.toneKey || null,
          toneLabel: parsed.toneLabel || parsed.tone || null,
          action: parsed.action || parsed.label || null,
        };
      }
    } catch {
      // ignore malformed
    }
  }
  return { action: trimmed };
}

function parsePolaroidMediaKey(mediaKey) {
  if (!mediaKey || typeof mediaKey !== 'string') return null;
  const trimmed = mediaKey.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          roleId: parsed.roleId || null,
          roleName: parsed.roleName || null,
          userName: parsed.userName || null,
          toneKey: parsed.toneKey || null,
          toneLabel: parsed.toneLabel || null,
          intimacyKey: parsed.intimacyKey || null,
          intimacyLabel: parsed.intimacyLabel || null,
          poseLabel: parsed.poseLabel || null,
          caption: parsed.caption || null,
          scene: parsed.scene || null,
          createdAt: parsed.createdAt || null,
        };
      }
    } catch {
      // ignore malformed
    }
  }
  return { caption: trimmed };
}

function formatDiaryDayKey(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDiaryLabel(dayKey) {
  if (!dayKey) return '';
  const [year, month, day] = dayKey.split('-').map((part) => Number(part));
  if (!year || !month || !day) return dayKey;
  const today = formatDiaryDayKey(Date.now());
  if (dayKey === today) return '今天';
  return `${month}.${day}`;
}

function formatDiaryTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getDiaryEntryText(message) {
  if (!message) return '';
  const body = (message.body || '').trim();
  if (message.kind === 'image') return body ? `【照片】${body}` : '【照片】';
  if (message.kind === 'emoji') return body || '[表情]';
  if (message.kind === 'gift') return body || '送出了礼物';
  if (message.kind === 'action') return body || '动作指令';
  if (message.kind === 'polaroid') return body || '拍立得合影';
  return body;
}

export default function ConversationScreen({ navigation, route }) {
  const { conversationId, shouldResendGreeting } = route.params;
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [ttsLoadingMessageId, setTtsLoadingMessageId] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [roleConfig, setRoleConfig] = useState(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedWord, setSelectedWord] = useState('');
  const [wordSheetVisible, setWordSheetVisible] = useState(false);
  const [wordSheetLoading, setWordSheetLoading] = useState(false);
  const [wordDetails, setWordDetails] = useState(null);
  const [wordImageError, setWordImageError] = useState(false);
  const [wordImageIndex, setWordImageIndex] = useState(0);
  const [wordSaveStatus, setWordSaveStatus] = useState('idle');
  const [quotePreview, setQuotePreview] = useState(null);
  const [quoteSource, setQuoteSource] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [roleProgress, setRoleProgress] = useState(null);
  const [progressVisible, setProgressVisible] = useState(false);
  const [dailyStats, setDailyStats] = useState(null);
  const [quickPanelVisible, setQuickPanelVisible] = useState(false);
  const [giftSheetVisible, setGiftSheetVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionToneKey, setActionToneKey] = useState(ACTION_TONES[0]?.key || 'tender');
  const [actionDraft, setActionDraft] = useState('');
  const [actionSelectedId, setActionSelectedId] = useState(null);
  const [diarySheetVisible, setDiarySheetVisible] = useState(false);
  const [diarySelectedDay, setDiarySelectedDay] = useState('');
  const [diaryShowAll, setDiaryShowAll] = useState(false);
  const [polaroidVisible, setPolaroidVisible] = useState(false);
  const [polaroidToneKey, setPolaroidToneKey] = useState(ACTION_TONES[0]?.key || 'tender');
  const [polaroidIntimacyKey, setPolaroidIntimacyKey] = useState(POLAROID_INTIMACY[1]?.key || 'close');
  const [polaroidPoseId, setPolaroidPoseId] = useState(POLAROID_POSES[0]?.id || null);
  const [polaroidCaption, setPolaroidCaption] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const greetingSentRef = useRef(false);
  const prevIsTypingRef = useRef(false);
  const soundRef = useRef(null);

  const diaryData = useMemo(() => {
    const allGroups = {};
    const aiGroups = {};
    messages.forEach((message) => {
      const ts = message?.createdAt || message?.created_at;
      const dayKey = formatDiaryDayKey(ts);
      if (!dayKey) return;
      if (!allGroups[dayKey]) allGroups[dayKey] = [];
      allGroups[dayKey].push(message);
      if (message?.sender === 'ai') {
        if (!aiGroups[dayKey]) aiGroups[dayKey] = [];
        aiGroups[dayKey].push(message);
      }
    });
    const keys = Object.keys(allGroups).sort((a, b) => (a < b ? 1 : -1));
    return { allGroups, aiGroups, keys };
  }, [messages]);

  const diaryDayKeys = diaryData.keys;
  const latestDiaryDay = diaryDayKeys[0] || formatDiaryDayKey(Date.now());
  const activeDiaryDay = diarySelectedDay || latestDiaryDay;
  const diaryMessages = useMemo(() => {
    if (!activeDiaryDay) return [];
    const groups = diaryShowAll ? diaryData.allGroups : diaryData.aiGroups;
    const list = groups[activeDiaryDay] || [];
    return [...list].sort(
      (a, b) => (a?.createdAt || a?.created_at || 0) - (b?.createdAt || b?.created_at || 0)
    );
  }, [diaryData, diaryShowAll, activeDiaryDay]);

  const diarySummary = useMemo(() => {
    const texts = diaryMessages
      .map((item) => getDiaryEntryText(item))
      .filter(Boolean);
    if (!texts.length) return '';
    return texts.slice(-3).join(' · ');
  }, [diaryMessages]);

  useEffect(() => {
    if (!diarySheetVisible) return;
    if (!activeDiaryDay && latestDiaryDay) {
      setDiarySelectedDay(latestDiaryDay);
      return;
    }
    if (activeDiaryDay && !diaryDayKeys.includes(activeDiaryDay) && latestDiaryDay) {
      setDiarySelectedDay(latestDiaryDay);
    }
  }, [diarySheetVisible, activeDiaryDay, latestDiaryDay, diaryDayKeys.join('|')]);

  const fetchWordDetails = useCallback(async (word) => {
    if (!word) return;
    try {
      setWordSheetLoading(true);
      const result = await getWordCard(word);
      setWordDetails(result);
      await addVocabItem({
        term: word,
        definition: result.translation || '',
        example: result.example || '',
        language: 'en',
        tags: ['from-chat'],
      });
      bumpDailyProgress({ vocabNewDelta: 1 })
        .then((stats) => setDailyStats(stats))
        .catch((error) => console.warn('[Conversation] bumpDailyProgress vocab failed', error));
    } catch (error) {
      console.warn('[WordCard] fetch failed', error?.message || error);
      setWordDetails({
        translation: `示例翻译：${word}`,
        example: `Example: use ${word} in a sentence.`,
        imagePrompt: `A simple illustration of ${word}.`,
      });
    } finally {
      setWordSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getUserSettings();
        setUserProfile(profile || null);

      } catch (error) {
        console.warn('[Conversation] load user settings failed', error);
      }
    })();
  }, []);


  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const detail = await getConversationDetail(conversationId);
      const history = await getMessages(conversationId);
      setRole(detail?.role || null);
      setConversation(detail?.conversation || null);
      setMessages(history);
      setLoading(false);
    }
    loadData();
  }, [conversationId]);

  useEffect(() => {
    async function loadRoleConfig() {
      if (role?.id) {
        const config = await getRoleSettings(role.id);
        setRoleConfig(config);
 
      }
    }
    loadRoleConfig();
  }, [role]);

  useEffect(() => {
    (async () => {
      if (!role?.id) return;
      try {
        const progress = await getRoleProgress(role.id);
        if (progress) setRoleProgress(progress);
      } catch (error) {
        console.warn('[Conversation] load role progress failed', error);
      }
    })();
  }, [role?.id]);

  useEffect(() => {
    // 只在 isTyping 从 false 变为 true 时滚动（显示打字指示器）
    const shouldScroll = isTyping && !prevIsTypingRef.current;

    if (shouldScroll) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }

    // 更新 ref
    prevIsTypingRef.current = isTyping;
  }, [isTyping]);

  // 监听消息变化，自动滚动（用户发送消息时）
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 监听清空聊天记录后重新发送开场白
  useEffect(() => {
    if (shouldResendGreeting && role?.greeting && messages.length === 0 && conversation && !greetingSentRef.current) {
      greetingSentRef.current = true;
      // 重置导航参数，防止重复触发
      navigation.setParams({ shouldResendGreeting: false });
      // 延迟一下再发送，确保页面已经加载完成
      setTimeout(() => {
        (async () => {
          await deliverAiChunks(role.greeting);
          await maybeSendAutoEmoji(role.greeting);
        })();
      }, 300);
    }

    // 重置标记
    if (!shouldResendGreeting) {
      greetingSentRef.current = false;
    }
  }, [shouldResendGreeting, role?.greeting, messages.length, conversation, navigation]);

  const deliverAiChunks = useCallback(
    (text) => {
      if (!conversation) return Promise.resolve();
      const normalized = (text || '').replace(/\r/g, '').trim();
      if (!normalized) return Promise.resolve();

      // 如果文本包含换行符，按换行符拆分成多个气泡
      // 否则按标点符号拆分
      let chunks = [];
      if (normalized.includes('\n')) {
        // 包含换行符，按换行符拆分成多个独立气泡
        chunks = normalized.split('\n').filter(line => line.trim());
      } else {
        // 不包含换行符，按标点符号拆分
        chunks = normalized.match(/[^。！？!\?…]+[。！？!\?…]?/g) || [normalized];
      }
      if (!chunks.length) return Promise.resolve();

      return new Promise((resolve) => {
        const deliver = async (index) => {
          const chunk = chunks[index];

          // 只在第一个消息块时显示打字指示器
          if (index === 0) {
            setIsTyping(true);
            // Wait a bit for DOM to render the typing indicator
            await new Promise(r => setTimeout(r, 50));
          }

          // Wait for typing animation (0.3-1 second)
          const typingDelay = 300 + Math.random() * 700;
          await new Promise(r => setTimeout(r, typingDelay));

          // Add actual message (打字指示器仍然可见)
          const msg = await addMessage(conversation.id, 'ai', chunk, Date.now());
          const updatedHistory = [...messagesRef.current, msg];
          setMessages(updatedHistory);
          messagesRef.current = updatedHistory;

          // 最后一条消息后才隐藏打字指示器
          if (index >= chunks.length - 1) {
            setIsTyping(false);
            resolve();
            return;
          }

          // Short pause before next message (打字指示器继续显示)
          const delay = 200 + Math.random() * 300;
          setTimeout(() => {
            deliver(index + 1);
          }, delay);
        };
        deliver(0);
      });
    },
    [conversation, roleConfig]
  );

  const isBlocked = !!(roleConfig && Number(roleConfig.is_blocked));
  const allowAutoEmoji = !!(roleConfig && Number(roleConfig.allow_emoji));

  const maybeSendAutoEmoji = useCallback(
    async (text) => {
      if (!conversation) return;
      if (!allowAutoEmoji) return;
      const emojiKey = pickEmojiKeyForText(text);
      if (!emojiKey) return;

      const msg = await addMessage(conversation.id, 'ai', '[表情]', Date.now(), {
        kind: 'emoji',
        mediaKey: emojiKey,
      });
      const updatedHistory = [...messagesRef.current, msg];
      setMessages(updatedHistory);
      messagesRef.current = updatedHistory;
    },
    [conversation, allowAutoEmoji]
  );

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相册权限', '请允许访问相册后再发送图片。');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 || null,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width || null,
        height: asset.height || null,
        fileName: asset.fileName || null,
      });
    } catch (error) {
      console.warn('[Conversation] pick image failed', error);
      Alert.alert('选图失败', error?.message || '无法打开相册');
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相机权限', '请允许访问相机后再拍照发送。');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 || null,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width || null,
        height: asset.height || null,
        fileName: asset.fileName || null,
      });
    } catch (error) {
      console.warn('[Conversation] take photo failed', error);
      Alert.alert('拍照失败', error?.message || '无法打开相机');
    }
  }, []);

  const handleSend = async () => {
    if ((!inputValue.trim() && !pendingImage) || !conversation || !role) return;
    if (isBlocked) {
      Alert.alert('已拉黑', '你已拉黑 Ta，无法继续对话。');
      return;
    }
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);
    setActionSheetVisible(false);
    setDiarySheetVisible(false);
    setActionDraft('');
    setActionSelectedId(null);
    const content = inputValue.trim();
    setInputValue('');
    const imageAttachment = pendingImage;
    setPendingImage(null);
    const quotedBody = quoteSource || null;
    setQuotePreview(null);
    setQuoteSource(null);
    const createdAt = Date.now();
    const newMessage = imageAttachment
      ? await addMessage(conversation.id, 'user', content, createdAt, {
          quotedBody,
          kind: 'image',
          mediaKey: JSON.stringify({
            uri: imageAttachment.uri,
            base64: imageAttachment.base64 || null,
            mimeType: imageAttachment.mimeType || 'image/jpeg',
            width: imageAttachment.width || null,
            height: imageAttachment.height || null,
            fileName: imageAttachment.fileName || null,
          }),
        })
      : await addMessage(conversation.id, 'user', content, createdAt, {
          quotedBody,
        });
    const nextHistory = [...messagesRef.current, newMessage];
    setMessages(nextHistory);
    messagesRef.current = nextHistory;

    bumpDailyProgress({ messagesDelta: 1 })
      .then(async (stats) => {
        setDailyStats(stats);
        try {
          const refreshed = await getUserSettings();
          setUserProfile(refreshed || null);
        } catch (e) {
          console.warn('[Conversation] refresh user settings failed', e);
        }
      })
      .catch((error) => console.warn('[Conversation] bumpDailyProgress failed', error));

    let nextAffectionLevel = roleProgress?.affection_level || 1;
    if (role?.id) {
      const expDelta = Math.min(18, 8 + Math.floor(content.length / 30));
      const negativeHits = detectNegativeTone(content);
      // 负向情绪会扣亲密，最多 -4；否则正向加成（最少 +1，最长消息上限 4）
      const affectionDelta = negativeHits
        ? -Math.min(4, 1 + negativeHits)
        : Math.min(4, Math.max(1, Math.floor(content.length / 40)));
      try {
        const progress = await addRoleProgress(role.id, { expDelta, affectionDelta });
        if (progress) {
          setRoleProgress(progress);
          nextAffectionLevel = progress.affection_level || nextAffectionLevel;
        }
      } catch (error) {
        console.warn('[Conversation] addRoleProgress failed', error);
      }
    }

    setSending(true);
    try {
      const aiResult = await generateAiReply({
        conversation,
        role,
        history: nextHistory,
        userProfile,
        affectionLevel: nextAffectionLevel,
      });
      await deliverAiChunks(aiResult.text);
      await maybeSendAutoEmoji(aiResult.text);
      if (typeof aiResult.nextCursor === 'number') {
        setConversation((prev) =>
          prev ? { ...prev, scriptCursor: aiResult.nextCursor } : prev
        );
      }
    } catch (error) {
      console.error('[Conversation] 发送失败', error);
    } finally {
      setSending(false);
    }
  };

  const handleToggleQuickPanel = () => {
    setQuickPanelVisible((prev) => {
      const next = !prev;
      if (next) {
        setGiftSheetVisible(false);
        setActionSheetVisible(false);
        setDiarySheetVisible(false);
        Keyboard.dismiss();
      }
      return next;
    });
  };

  const handleOpenGifts = () => {
    setQuickPanelVisible(false);
    setGiftSheetVisible(true);
    setActionSheetVisible(false);
    setDiarySheetVisible(false);
    Keyboard.dismiss();
  };

  const handleActionCommand = () => {
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);
    setActionSheetVisible(true);
    setActionDraft('');
    setActionSelectedId(null);
    setDiarySheetVisible(false);
    Keyboard.dismiss();
  };

  const handleQuickSendPhoto = async () => {
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);
    setActionSheetVisible(false);
    setDiarySheetVisible(false);
    await handlePickImage();
  };

  const handleOpenDiary = () => {
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);
    setActionSheetVisible(false);
    setDiarySheetVisible(true);
    setDiaryShowAll(false);
    setDiarySelectedDay(latestDiaryDay);
    Keyboard.dismiss();
  };

  const handleSendGift = async (gift) => {
    if (!gift || sending) return;
    if (!conversation || !role) return;
    if (isBlocked) {
      Alert.alert('已拉黑', '你已拉黑 Ta，无法继续对话。');
      return;
    }
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);

    const giftTitle = gift.title || '礼物';
    const giftEffect = gift.effect || (gift.affection ? `心动 +${gift.affection}` : '');
    const giftBody = `我送你${giftTitle}${giftEffect ? `（${giftEffect}）` : ''}`;
    const createdAt = Date.now();
    const mediaKey = JSON.stringify({
      id: gift.id || null,
      title: giftTitle,
      effect: giftEffect || null,
      affection: typeof gift.affection === 'number' ? gift.affection : null,
      icon: gift.icon || null,
      accent: gift.accent || null,
      soft: gift.soft || null,
    });

    let newMessage = null;
    try {
      newMessage = await addMessage(conversation.id, 'user', giftBody, createdAt, {
        kind: 'gift',
        mediaKey,
      });
    } catch (error) {
      console.warn('[Conversation] 送礼失败', error);
      Alert.alert('送礼失败', error?.message || '无法发送礼物');
      return;
    }
    const nextHistory = [...messagesRef.current, newMessage];
    setMessages(nextHistory);
    messagesRef.current = nextHistory;

    bumpDailyProgress({ messagesDelta: 1 })
      .then(async (stats) => {
        setDailyStats(stats);
        try {
          const refreshed = await getUserSettings();
          setUserProfile(refreshed || null);
        } catch (e) {
          console.warn('[Conversation] refresh user settings failed', e);
        }
      })
      .catch((error) => console.warn('[Conversation] bumpDailyProgress failed', error));

    let nextAffectionLevel = roleProgress?.affection_level || 1;
    if (role?.id && typeof gift.affection === 'number' && gift.affection > 0) {
      try {
        const progress = await addRoleProgress(role.id, { expDelta: 0, affectionDelta: gift.affection });
        if (progress) {
          setRoleProgress(progress);
          nextAffectionLevel = progress.affection_level || nextAffectionLevel;
        }
      } catch (error) {
        console.warn('[Conversation] addRoleProgress failed', error);
      }
    }

    setSending(true);
    try {
      const aiResult = await generateAiReply({
        conversation,
        role,
        history: nextHistory,
        userProfile,
        affectionLevel: nextAffectionLevel,
      });
      await deliverAiChunks(aiResult.text);
      await maybeSendAutoEmoji(aiResult.text);
      if (typeof aiResult.nextCursor === 'number') {
        setConversation((prev) =>
          prev ? { ...prev, scriptCursor: aiResult.nextCursor } : prev
        );
      }
    } catch (error) {
      console.error('[Conversation] 送礼回复失败', error);
    } finally {
      setSending(false);
    }
  };

  const getActiveTone = () =>
    ACTION_TONES.find((tone) => tone.key === actionToneKey) || ACTION_TONES[0];

  const resolveActionLabel = () => {
    if (actionDraft.trim()) return actionDraft.trim();
    const selected = ACTION_COMMANDS.find((item) => item.id === actionSelectedId);
    return selected?.label || '';
  };

  const buildActionCommand = () => {
    const actionLabel = resolveActionLabel();
    if (!actionLabel) return '';
    const tone = getActiveTone();
    const tonePrefix = tone?.label ? `${tone.label} · ` : '';
    return `动作指令：${tonePrefix}${actionLabel}`;
  };

  const handleApplyAction = async (sendNow) => {
    const commandText = buildActionCommand();
    if (!commandText) {
      Alert.alert('还没选动作', '先选一个动作或写一句想要的互动吧。');
      return;
    }
    if (sendNow) {
      await handleSendAction(commandText);
      return;
    }
    setInputValue((prev) => (prev.trim() ? `${prev}\n${commandText}` : commandText));
    setActionSheetVisible(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSendAction = async (commandText) => {
    if (!commandText || sending) return;
    if (!conversation || !role) return;
    if (isBlocked) {
      Alert.alert('已拉黑', '你已拉黑 Ta，无法继续对话。');
      return;
    }
    setQuickPanelVisible(false);
    setGiftSheetVisible(false);
    setActionSheetVisible(false);

    const createdAt = Date.now();
    const tone = getActiveTone();
    const actionLabel = resolveActionLabel();
    const mediaKey = JSON.stringify({
      toneKey: tone?.key || null,
      toneLabel: tone?.label || null,
      action: actionLabel || null,
    });

    let newMessage = null;
    try {
      newMessage = await addMessage(conversation.id, 'user', commandText, createdAt, {
        kind: 'action',
        mediaKey,
      });
    } catch (error) {
      console.warn('[Conversation] 动作发送失败', error);
      Alert.alert('发送失败', error?.message || '无法发送动作指令');
      return;
    }
    const nextHistory = [...messagesRef.current, newMessage];
    setMessages(nextHistory);
    messagesRef.current = nextHistory;

    bumpDailyProgress({ messagesDelta: 1 })
      .then(async (stats) => {
        setDailyStats(stats);
        try {
          const refreshed = await getUserSettings();
          setUserProfile(refreshed || null);
        } catch (e) {
          console.warn('[Conversation] refresh user settings failed', e);
        }
      })
      .catch((error) => console.warn('[Conversation] bumpDailyProgress failed', error));

    setSending(true);
    try {
      const aiResult = await generateAiReply({
        conversation,
        role,
        history: nextHistory,
        userProfile,
        affectionLevel: roleProgress?.affection_level || 1,
      });
      await deliverAiChunks(aiResult.text);
      await maybeSendAutoEmoji(aiResult.text);
      if (typeof aiResult.nextCursor === 'number') {
        setConversation((prev) =>
          prev ? { ...prev, scriptCursor: aiResult.nextCursor } : prev
        );
      }
    } catch (error) {
      console.error('[Conversation] 动作回复失败', error);
    } finally {
      setSending(false);
    }
  };

  const handleRandomAction = () => {
    if (!ACTION_COMMANDS.length) return;
    const randomIndex = Math.floor(Math.random() * ACTION_COMMANDS.length);
    const picked = ACTION_COMMANDS[randomIndex];
    setActionSelectedId(picked.id);
    setActionDraft('');
  };

  // Typing indicator bubble component
const TypingBubble = () => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (animValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -6,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1 = createDotAnimation(dot1Anim, 0);
    const dot2 = createDotAnimation(dot2Anim, 150);
    const dot3 = createDotAnimation(dot3Anim, 300);

    dot1.start();
    dot2.start();
    dot3.start();

    return () => {
      dot1.stop();
      dot2.stop();
      dot3.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={styles.messageRow}>
      <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />
      <View style={[styles.bubble, styles.bubbleAI]}>
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]} />
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]} />
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]} />
        </View>
      </View>
    </View>
  );
};

  const handlePlayTts = useCallback(
    async (message) => {
      if (!message || !message.body) return;
      if (message.kind === 'emoji') return;

      try {
        // 如果正在播放同一条消息，则停止播放
        if (playingMessageId === message.id && soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.setPositionAsync(0);
          setPlayingMessageId(null);
          return;
        }

        setTtsLoadingMessageId(message.id);

        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        // 优先使用已缓存的音频 URL，避免重复请求 TTS
        let audioUrl = message.audioUrl;
        let audioMime = message.audioMime || null;
        let audioDuration = message.audioDuration || null;

        if (!audioUrl) {
          const tts = await synthesizeQwenTts({ text: message.body });
          if (!tts || !tts.audioUrl) {
            setTtsLoadingMessageId(null);
            Alert.alert('语音生成失败', '未能从 TTS 接口获取音频。');
            return;
          }

          audioUrl = tts.audioUrl;
          audioMime = tts.mimeType || null;
          audioDuration = tts.durationSeconds || null;

          // 写入本地 DB，后续播放直接复用
          try {
            await saveMessageAudio(message.id, {
              audioUrl,
              audioMime,
              audioDuration,
            });
          } catch (dbError) {
            console.warn('[Conversation] 保存 TTS 音频到本地失败', dbError);
          }

          // 同步更新内存中的消息列表
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? { ...m, audioUrl, audioMime, audioDuration }
                : m
            )
          );
          messagesRef.current = messagesRef.current.map((m) =>
            m.id === message.id
              ? { ...m, audioUrl, audioMime, audioDuration }
              : m
          );
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlayingMessageId(message.id);
        setTtsLoadingMessageId(null);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            return;
          }
          if (!status.isPlaying) {
            setPlayingMessageId((current) =>
              current === message.id ? null : current
            );
          }
        });
      } catch (error) {
        console.error('[Conversation] TTS 播放失败', error);
        setTtsLoadingMessageId(null);
        Alert.alert('语音播放失败', error?.message || '生成或播放语音时出错');
      }
    },
    [playingMessageId]
  );

  const handleMessageLongPress = useCallback((message, event) => {
    if (!message) return;
    const { pageX, pageY } = event?.nativeEvent || {};
    const { width } = Dimensions.get('window');
    const menuWidth = 260;

    let left = pageX ? pageX - menuWidth / 2 : (width - menuWidth) / 2;
    left = Math.max(8, Math.min(left, width - menuWidth - 8));

    // 菜单显示在气泡上方一点
    const top = pageY ? Math.max(80, pageY - 60) : 120;

    setActionMenuPosition({ top, left });
    setSelectedMessage(message);
    setActionMenuVisible(true);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setSelectedMessage(null);
  }, []);

  const handleCopyMessage = useCallback(async () => {
    if (!selectedMessage) return;
    const content =
      selectedMessage.kind === 'image'
        ? selectedMessage.body || '[图片]'
        : selectedMessage.body;
    if (!content) return;
    try {
      await Clipboard.setStringAsync(content);
    } catch (error) {
      console.warn('[Conversation] 复制失败', error);
    } finally {
      closeActionMenu();
    }
  }, [selectedMessage, closeActionMenu]);

  const handleForwardMessage = useCallback(async () => {
    try {
      if (!selectedMessage) return;
      if (selectedMessage.kind === 'image') {
        const media = parseImageMediaKey(selectedMessage.mediaKey);
        const url = media?.uri || undefined;
        const message = selectedMessage.body || '';
        if (!url && !message) return;
        await Share.share(url ? { url, message } : { message });
      } else {
        if (!selectedMessage.body) return;
        await Share.share({ message: selectedMessage.body });
      }
    } catch (error) {
      console.warn('[Conversation] 转发失败', error);
    } finally {
      closeActionMenu();
    }
  }, [selectedMessage, closeActionMenu]);

  const handleDeleteMessage = useCallback(async () => {
    if (!selectedMessage) return;
    try {
      await deleteMessage(selectedMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
      messagesRef.current = messagesRef.current.filter((m) => m.id !== selectedMessage.id);
    } catch (error) {
      console.warn('[Conversation] 删除消息失败', error);
    } finally {
      closeActionMenu();
    }
  }, [selectedMessage, closeActionMenu]);

  const handleQuoteMessage = useCallback(() => {
    if (!selectedMessage) return;
    const baseText =
      selectedMessage.kind === 'image'
        ? selectedMessage.body
          ? `【图片】${selectedMessage.body}`
          : '【图片】'
        : selectedMessage.body;
    if (!baseText) return;
    const snippet =
      baseText.length > 40 ? `${baseText.slice(0, 40)}…` : baseText;
    setQuotePreview(snippet);
    setQuoteSource(baseText);
    closeActionMenu();
  }, [selectedMessage, closeActionMenu]);

  const handlePlayFromMenu = useCallback(() => {
    if (!selectedMessage) return;
    handlePlayTts(selectedMessage);
    closeActionMenu();
  }, [selectedMessage, handlePlayTts, closeActionMenu]);

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isImage = item.kind === 'image';
    const isEmoji = item.kind === 'emoji' && item.mediaKey;
    const isGift = item.kind === 'gift';
    const isAction = item.kind === 'action';

    if (isGift) {
      const gift = parseGiftMediaKey(item.mediaKey);
      const preset = gift?.id ? GIFT_OPTIONS.find((option) => option.id === gift.id) : null;
      const giftTitle = gift?.title || preset?.title || '礼物';
      const giftEffect =
        gift?.effect
        || preset?.effect
        || (typeof gift?.affection === 'number' ? `心动 +${gift.affection}` : '');
      const giftIcon = gift?.icon || preset?.icon || 'gift';
      const giftAccent = gift?.accent || preset?.accent || '#d46b84';
      const giftSoft = gift?.soft || preset?.soft || '#ffe9f0';

      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />}
          {isUser && <View style={styles.messageAvatarPlaceholder} />}
          <View style={styles.messageContent}>
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={(event) => handleMessageLongPress(item, event)}
              delayLongPress={300}
              onPress={() => setSelectedWord('')}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, styles.bubbleGift]}>
                <View style={[styles.giftCard, { backgroundColor: giftSoft }]}>
                  <View style={[styles.giftIconWrap, { borderColor: `${giftAccent}33`, backgroundColor: `${giftAccent}1A` }]}>
                    <Ionicons name={giftIcon} size={20} color={giftAccent} />
                  </View>
                  <View style={styles.giftTextBlock}>
                    <Text style={styles.giftTitleText}>{giftTitle}</Text>
                    {giftEffect ? <Text style={[styles.giftEffectText, { color: giftAccent }]}>{giftEffect}</Text> : null}
                    <Text style={styles.giftNoteText}>{isUser ? '你送出了礼物' : '收到礼物'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isAction) {
      const actionInfo = parseActionMediaKey(item.mediaKey);
      const tone = actionInfo?.toneKey
        ? ACTION_TONES.find((itemTone) => itemTone.key === actionInfo.toneKey)
        : null;
      const toneLabel = actionInfo?.toneLabel || tone?.label || '动作';
      const actionLabel = actionInfo?.action || (item.body || '').replace(/^动作指令：/g, '').trim() || '互动';
      const accent = tone?.accent || '#f093a4';
      const soft = tone?.soft || '#ffe9f0';

      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />}
          {isUser && <View style={styles.messageAvatarPlaceholder} />}
          <View style={styles.messageContent}>
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={(event) => handleMessageLongPress(item, event)}
              delayLongPress={300}
              onPress={() => setSelectedWord('')}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, styles.bubbleAction]}>
                <View style={[styles.actionCardBubble, { backgroundColor: soft }]}>
                  <View style={[styles.actionTag, { borderColor: `${accent}33` }]}>
                    <Ionicons name="sparkles-outline" size={12} color={accent} />
                    <Text style={[styles.actionTagText, { color: accent }]}>{toneLabel}</Text>
                  </View>
                  <Text style={styles.actionBubbleText}>{actionLabel}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isImage) {
      const media = parseImageMediaKey(item.mediaKey);
      const uri = media?.uri || null;
      const captionText = (item.body || '').replace(/\r/g, '').trim();
      const quotedText = (item.quotedBody || '').replace(/\r/g, '').replace(/\n+/g, ' ');
      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />}
          {isUser && <View style={styles.messageAvatarPlaceholder} />}
          <View style={styles.messageContent}>
            <TouchableOpacity
              activeOpacity={0.92}
              onLongPress={(event) => handleMessageLongPress(item, event)}
              delayLongPress={300}
              onPress={() => {
                setSelectedWord('');
                if (uri) setImageViewer({ uri, caption: captionText });
              }}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, styles.bubbleImage]}>
                {quotedText ? (
                  <View style={styles.messageQuoteBubble}>
                    <Text style={styles.messageQuoteText}>{quotedText}</Text>
                  </View>
                ) : null}
                {uri ? (
                  <Image source={{ uri }} style={styles.imageMessage} resizeMode="cover" />
                ) : (
                  <View style={[styles.imageMessage, styles.imageMessagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color="#999" />
                    <Text style={styles.imagePlaceholderText}>图片</Text>
                  </View>
                )}
                {captionText ? (
                  <Text
                    style={
                      isUser
                        ? [styles.bubbleText, styles.bubbleTextUser, styles.imageCaption]
                        : [styles.bubbleText, styles.imageCaption]
                    }
                  >
                    {captionText}
                  </Text>
                ) : null}
                {isUser ? (
                  <Ionicons name="heart" color="#f093a4" size={16} style={styles.bubbleHeart} />
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isEmoji) {
      const emojiSource = getEmojiSourceByKey(item.mediaKey);
      return (
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />}
          {isUser && <View style={styles.messageAvatarPlaceholder} />}
          <View style={styles.messageContent}>
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={(event) => handleMessageLongPress(item, event)}
              delayLongPress={300}
              onPress={() => setSelectedWord('')}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, styles.bubbleEmoji]}>
                {emojiSource ? (
                  <Image source={emojiSource} style={styles.emojiImage} resizeMode="contain" />
                ) : (
                  <Text style={isUser ? [styles.bubbleText, styles.bubbleTextUser] : styles.bubbleText}>
                    {item.body || '[表情]'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const bodyText = (item.body || '').replace(/\r/g, '').replace(/\n+/g, ' ');
    const quotedText = (item.quotedBody || '').replace(/\r/g, '').replace(/\n+/g, ' ');

    const wordTokens = bodyText.split(/(\s+)/).filter((t) => t.length > 0);

    const renderTokenizedText = () => (
      <Text style={isUser ? [styles.bubbleText, styles.bubbleTextUser] : styles.bubbleText}>
        {wordTokens.map((token, idx) => {
          const isSpace = /^\s+$/.test(token);
          if (isSpace) {
            return <Text key={`space-${idx}`}>{token}</Text>;
          }
          const isSelected = selectedWord === token;
          return (
            <Text
              key={`word-${idx}`}
              onPress={() => setSelectedWord(token)}
              onLongPress={() => {
                setSelectedWord(token);
                setWordDetails(null);
                setWordImageError(false);
                setWordImageIndex(0);
                setWordSaveStatus('idle');
                setWordSheetVisible(true);
                fetchWordDetails(token);
              }}
              style={isSelected ? styles.selectedWord : null}
            >
              {token}
            </Text>
          );
        })}
      </Text>
    );

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />
        )}
        {isUser && <View style={styles.messageAvatarPlaceholder} />}
        <View style={styles.messageContent}>
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={(event) => handleMessageLongPress(item, event)}
        delayLongPress={300}
        onPress={() => setSelectedWord('')}
      >
            <View
              style={[
                styles.bubble,
                isUser ? styles.bubbleUser : styles.bubbleAI,
              ]}
            >
              {isUser ? (
                <>
                  {quotedText ? (
                    <View style={styles.messageQuoteBubble}>
                      <Text style={styles.messageQuoteText}>{quotedText}</Text>
                    </View>
                  ) : null}
                  {renderTokenizedText()}
                  <Ionicons name="heart" color="#f093a4" size={16} style={styles.bubbleHeart} />
                </>
              ) : (
                <>
                  {quotedText ? (
                    <View style={styles.messageQuoteBubble}>
                      <Text style={styles.messageQuoteText}>{quotedText}</Text>
                    </View>
                  ) : null}
                  {renderTokenizedText()}
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading || !role) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#f093a4" />
      </View>
    );
  }

  const topPadding = Math.max(insets.top - 8, 8);
  const sheetMaxHeight = Dimensions.get('window').height * 0.75;

  // Use role's hero image as chat background
  const backgroundImage = getRoleImage(role?.id, 'heroImage') || getRoleImage(role?.id, 'avatar');

  // Add typing indicator to message list when typing
  const listData = isTyping ? [...messages, { type: 'typing', id: 'typing-indicator' }] : messages;

  const bottomPadding = Math.max(insets.bottom, 12);
  const activeTone = getActiveTone();
  const actionPreview = buildActionCommand();
  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage} imageStyle={styles.backgroundImageStyle}>
      <SafeAreaView style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerProfile} onPress={() => setProgressVisible(true)} activeOpacity={0.8}>
            <Image source={getRoleImage(role.id, 'avatar')} style={styles.headerAvatar} />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{role.name || ''}</Text>
              <View style={styles.statusRow}>
                <View style={styles.moodPill}>
                  <Ionicons name="leaf-outline" color="#f093a4" size={12} />
                  <Text style={styles.moodText}>{role.mood || '想你'}</Text>
                </View>
                <View style={styles.relationshipPill}>
                  <Ionicons name="heart-outline" color="#f093a4" size={12} />
                  <Text style={styles.relationshipText}>
                    {getRelationshipLabelByAffectionLevel(roleProgress?.affection_level || 1)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              navigation.navigate('RoleSettings', {
                roleId: role.id,
                conversationId: conversation.id,
              })
            }
          >
            <Ionicons name="settings-outline" size={18} color="#f093a4" />
          </TouchableOpacity>
        </View>

        {isBlocked && (
          <View style={styles.blockBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#f093a4" />
            <Text style={styles.blockBannerText}>你已拉黑 Ta，解除后方可继续聊天</Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item) => item.id?.toString() || 'typing-indicator'}
            renderItem={({ item }) => {
              if (item.type === 'typing') {
                return <TypingBubble />;
              }
              return renderMessage({ item });
            }}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
          />

          {pendingImage ? (
            <View style={styles.attachmentPreviewRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setImageViewer({ uri: pendingImage.uri, caption: inputValue.trim() })}
              >
                <Image source={{ uri: pendingImage.uri }} style={styles.attachmentPreviewImage} />
              </TouchableOpacity>
              <Text style={styles.attachmentPreviewText}>已选图片</Text>
              <TouchableOpacity
                style={styles.attachmentRemoveButton}
                onPress={() => setPendingImage(null)}
                accessibilityLabel="移除图片"
              >
                <Ionicons name="close-circle" size={22} color="#f093a4" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.inputIcon}
              onPress={() => {
                setQuickPanelVisible(false);
                setGiftSheetVisible(false);
                setActionSheetVisible(false);
                handlePickImage();
              }}
              onLongPress={handleTakePhoto}
              delayLongPress={250}
            >
              <Ionicons name="image-outline" size={22} color="#b0b0b0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={22} color="#b0b0b0" />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="输入消息..."
              placeholderTextColor="#b5b5b5"
              value={inputValue}
              onChangeText={setInputValue}
              onFocus={() => {
                setQuickPanelVisible(false);
                setGiftSheetVisible(false);
                setActionSheetVisible(false);
              }}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.plusButton, quickPanelVisible && styles.plusButtonActive]}
              onPress={handleToggleQuickPanel}
            >
              <Ionicons name={quickPanelVisible ? 'close' : 'add'} size={20} color={quickPanelVisible ? '#fff' : '#9b9b9b'} />
            </TouchableOpacity>
          </View>
          {quickPanelVisible ? (
            <View style={styles.quickPanel}>
              <Text style={styles.quickPanelTitle}>对话打开</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.quickActionItem} onPress={handleOpenGifts}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="gift-outline" size={22} color="#555" />
                  </View>
                  <Text style={styles.quickActionLabel}>赠送礼物</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem} onPress={handleActionCommand}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="flash-outline" size={22} color="#555" />
                  </View>
                  <Text style={styles.quickActionLabel}>动作指令</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem} onPress={handleQuickSendPhoto}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="image-outline" size={22} color="#555" />
                  </View>
                  <Text style={styles.quickActionLabel}>发送照片</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem} onPress={handleOpenDiary}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="book-outline" size={22} color="#555" />
                  </View>
                  <Text style={styles.quickActionLabel}>TA的日记</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>

        {quotePreview ? (
          <View style={styles.quotePreview}>
            <Text style={styles.quotePreviewLabel}>引用</Text>
            <Text style={styles.quotePreviewText}>{quotePreview}</Text>
          </View>
        ) : null}

        {actionMenuVisible && selectedMessage && actionMenuPosition && (
          <View style={styles.actionMenuOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.actionMenuBackdrop}
              activeOpacity={1}
              onPress={closeActionMenu}
            />
            <View
              style={[
                styles.actionMenuContainer,
                { top: actionMenuPosition.top, left: actionMenuPosition.left, width: 260 },
              ]}
            >
              <View style={styles.actionMenuRow}>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleCopyMessage}>
                  <Ionicons name="copy-outline" size={20} color="#333" />
                  <Text style={styles.actionMenuText}>复制</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleForwardMessage}>
                  <Ionicons name="arrow-redo-outline" size={20} color="#333" />
                  <Text style={styles.actionMenuText}>转发</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleQuoteMessage}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color="#333" />
                  <Text style={styles.actionMenuText}>引用</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handlePlayFromMenu}>
                  <Ionicons name="volume-high-outline" size={20} color="#333" />
                  <Text style={styles.actionMenuText}>播放</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleDeleteMessage}>
                  <Ionicons name="trash-outline" size={20} color="#e55b73" />
                  <Text style={[styles.actionMenuText, { color: '#e55b73' }]}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {giftSheetVisible && (
          <View style={styles.giftSheetOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.giftSheetBackdrop}
              activeOpacity={1}
              onPress={() => setGiftSheetVisible(false)}
            />
            <View style={[styles.giftSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.giftSheetHeader}>
                <Text style={styles.giftSheetTitle}>送给 TA 一份礼物</Text>
                <TouchableOpacity onPress={() => setGiftSheetVisible(false)}>
                  <Ionicons name="close" size={22} color="#555" />
                </TouchableOpacity>
              </View>
              <View style={styles.giftSheetGrid}>
                {GIFT_OPTIONS.map((gift) => (
                  <TouchableOpacity
                    key={gift.id}
                    style={[
                      styles.giftSheetCard,
                      { backgroundColor: gift.soft },
                      sending && styles.giftSheetCardDisabled,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSendGift(gift)}
                    disabled={sending}
                  >
                    <View
                      style={[
                        styles.giftSheetIcon,
                        { borderColor: `${gift.accent}33`, backgroundColor: `${gift.accent}1A` },
                      ]}
                    >
                      <Ionicons name={gift.icon} size={20} color={gift.accent} />
                    </View>
                    <Text style={styles.giftSheetName}>{gift.title}</Text>
                    <Text style={[styles.giftSheetEffect, { color: gift.accent }]}>{gift.effect}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.giftSheetFooter}>
                <Text style={styles.giftSheetHint}>送礼会增加亲密度，并触发 TA 的回复。</Text>
                <TouchableOpacity
                  style={styles.giftSheetLink}
                  activeOpacity={0.8}
                  onPress={() => {
                    setGiftSheetVisible(false);
                    navigation.navigate('MallSpace');
                  }}
                >
                  <Text style={styles.giftSheetLinkText}>去礼物商城</Text>
                  <Ionicons name="chevron-forward" size={14} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {actionSheetVisible && (
          <View style={styles.actionSheetOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.actionSheetBackdrop}
              activeOpacity={1}
              onPress={() => setActionSheetVisible(false)}
            />
            <View style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.actionSheetHeader}>
                <View>
                  <Text style={styles.actionSheetTitle}>动作指令</Text>
                  <Text style={styles.actionSheetSubtitle}>选一个氛围 + 动作，让 TA 立刻回应。</Text>
                </View>
                <TouchableOpacity onPress={() => setActionSheetVisible(false)}>
                  <Ionicons name="close" size={22} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionToneRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ACTION_TONES.map((tone) => {
                    const isActive = tone.key === actionToneKey;
                    return (
                      <TouchableOpacity
                        key={tone.key}
                        style={[
                          styles.actionToneChip,
                          isActive && { backgroundColor: tone.soft, borderColor: tone.accent },
                        ]}
                        onPress={() => setActionToneKey(tone.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.actionToneText, isActive && { color: tone.accent }]}>
                          {tone.label}
                        </Text>
                        <Text style={styles.actionToneHint}>{tone.hint}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.actionRandomButton} onPress={handleRandomAction} activeOpacity={0.85}>
                  <Ionicons name="sparkles-outline" size={14} color="#f093a4" />
                  <Text style={styles.actionRandomText}>随机灵感</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                {ACTION_COMMANDS.map((item) => {
                  const isSelected = actionSelectedId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.actionCard,
                        isSelected && { borderColor: activeTone?.accent || '#f093a4' },
                      ]}
                      onPress={() => {
                        setActionSelectedId(item.id);
                        setActionDraft('');
                      }}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.actionCardIcon,
                          { backgroundColor: activeTone?.soft || '#ffe9f0' },
                        ]}
                      >
                        <Ionicons name={item.icon} size={18} color={activeTone?.accent || '#f093a4'} />
                      </View>
                      <Text style={styles.actionCardText}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionCustomRow}>
                <Ionicons name="create-outline" size={16} color="#9a9a9a" />
                <TextInput
                  style={styles.actionCustomInput}
                  placeholder="自定义动作：比如『抱紧一点』"
                  placeholderTextColor="#b5b5b5"
                  value={actionDraft}
                  onChangeText={setActionDraft}
                />
              </View>

              <View style={styles.actionPreviewBox}>
                <Text style={styles.actionPreviewLabel}>预览</Text>
                <Text style={styles.actionPreviewText}>{actionPreview || '选一个动作或写一句话～'}</Text>
              </View>

              <View style={styles.actionButtonRow}>
                <TouchableOpacity style={styles.actionButtonGhost} onPress={() => handleApplyAction(false)}>
                  <Text style={styles.actionButtonGhostText}>放入输入框</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => handleApplyAction(true)}>
                  <Text style={styles.actionButtonPrimaryText}>一键发送</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {diarySheetVisible && (
          <View style={styles.diarySheetOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.diarySheetBackdrop}
              activeOpacity={1}
              onPress={() => setDiarySheetVisible(false)}
            />
            <View style={[styles.diarySheet, { maxHeight: sheetMaxHeight }]}>
              <View style={styles.diaryHeader}>
                <View>
                  <Text style={styles.diaryTitle}>{role?.name || 'TA'} 的日记</Text>
                  <Text style={styles.diarySubtitle}>记录来自真实对话</Text>
                </View>
                <TouchableOpacity onPress={() => setDiarySheetVisible(false)}>
                  <Ionicons name="close" size={22} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.diaryToggleRow}>
                <TouchableOpacity
                  style={[styles.diaryToggle, !diaryShowAll && styles.diaryToggleActive]}
                  onPress={() => setDiaryShowAll(false)}
                >
                  <Text style={[styles.diaryToggleText, !diaryShowAll && styles.diaryToggleTextActive]}>
                    只看 TA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.diaryToggle, diaryShowAll && styles.diaryToggleActive]}
                  onPress={() => setDiaryShowAll(true)}
                >
                  <Text style={[styles.diaryToggleText, diaryShowAll && styles.diaryToggleTextActive]}>
                    全部对话
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.diaryDateRow}
              >
                {(diaryDayKeys.length ? diaryDayKeys : [latestDiaryDay]).map((key) => {
                  const isActive = key === activeDiaryDay;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.diaryDateChip, isActive && styles.diaryDateChipActive]}
                      onPress={() => setDiarySelectedDay(key)}
                    >
                      <Text style={[styles.diaryDateText, isActive && styles.diaryDateTextActive]}>
                        {formatDiaryLabel(key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.diarySummaryCard}>
                <Text style={styles.diarySummaryLabel}>今日回声</Text>
                <Text style={styles.diarySummaryText}>
                  {diarySummary || '今天还没有留下新的记录。'}
                </Text>
              </View>

              <ScrollView
                style={styles.diaryEntries}
                contentContainerStyle={[
                  styles.diaryEntriesContent,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {diaryMessages.length ? (
                  diaryMessages.map((item) => {
                    const entryText = getDiaryEntryText(item);
                    if (!entryText) return null;
                    const entryTime = item.createdAt || item.created_at;
                    const entryKey = item.id?.toString() || `${entryTime || Math.random()}`;
                    return (
                      <View style={styles.diaryEntry} key={entryKey}>
                        <Text style={styles.diaryEntryTime}>{formatDiaryTime(entryTime)}</Text>
                        <Text style={styles.diaryEntryText}>{entryText}</Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.diaryEmpty}>
                    <Ionicons name="book-outline" size={24} color="#c9c9c9" />
                    <Text style={styles.diaryEmptyText}>今天还没写日记</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {wordSheetVisible && (
          <View style={styles.wordSheetOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.wordSheetBackdrop} activeOpacity={1} onPress={() => setWordSheetVisible(false)} />
            <View style={[styles.wordSheet, { maxHeight: sheetMaxHeight }]}>
              <View style={styles.wordSheetHeader}>
                <Text style={styles.wordSheetTitle}>{selectedWord}</Text>
                <TouchableOpacity onPress={() => setWordSheetVisible(false)}>
                  <Ionicons name="close" size={22} color="#555" />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={[styles.wordSheetContent, { paddingBottom: Math.max(insets.bottom, 12) }]}
              >
                {wordSheetLoading || !wordDetails ? (
                  <View style={styles.wordSheetLoadingRow}>
                    <ActivityIndicator color="#f093a4" />
                    <Text style={styles.wordSheetHint}>AI 正在生成词卡…</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.wordSheetHeaderRow}>
                      <Text style={styles.wordSheetLabel}>翻译</Text>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!selectedWord) return;
                          try {
                            await addVocabItem({
                              term: selectedWord,
                              definition: wordDetails?.translation || '',
                              example: wordDetails?.example || '',
                              language: 'en',
                              tags: ['from-chat'],
                            });
                            setWordSaveStatus('saved');
                          } catch (e) {
                            setWordSaveStatus('error');
                            console.warn('[WordCard] save vocab failed', e);
                            Alert.alert('保存失败', e?.message || '存词库时出错');
                          }
                        }}
                        style={[styles.wordSheetSaveBtn, wordSaveStatus === 'saved' && { backgroundColor: '#e7f8ef' }]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={wordSaveStatus === 'saved' ? 'checkmark-done-outline' : 'bookmark-outline'}
                          size={18}
                          color={wordSaveStatus === 'saved' ? '#2d9f6f' : '#c24d72'}
                        />
                        <Text style={[styles.wordSheetSaveText, wordSaveStatus === 'saved' && { color: '#2d9f6f' }]}>
                          {wordSaveStatus === 'saved' ? '已保存' : '存词库'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.wordSheetBody}>{wordDetails.translation}</Text>
                    <Text style={[styles.wordSheetLabel, { marginTop: 10 }]}>例句</Text>
                    <Text style={styles.wordSheetBody}>{wordDetails.example}</Text>
                    <Text style={[styles.wordSheetLabel, { marginTop: 10 }]}>图像提示</Text>
                    {wordDetails.imageUrls && wordDetails.imageUrls[wordImageIndex] && !wordImageError ? (
                      <Image
                        source={{ uri: wordDetails.imageUrls[wordImageIndex] }}
                        style={styles.wordSheetImage}
                        resizeMode="cover"
                        onError={() => {
                          const nextIndex = wordImageIndex + 1;
                          if (wordDetails.imageUrls[nextIndex]) {
                            setWordImageIndex(nextIndex);
                            setWordImageError(false);
                          } else {
                            setWordImageError(true);
                          }
                        }}
                      />
                    ) : (
                      <View style={[styles.wordSheetImage, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={styles.wordSheetHint}>图片加载失败/暂无图片</Text>
                      </View>
                    )}
                    <Text style={styles.wordSheetBody}>{wordDetails.imagePrompt}</Text>
                    <Text style={styles.wordSheetHint}>长按单词可打开此面板，点空白关闭。</Text>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        <Modal
          visible={!!imageViewer}
          transparent
          animationType="fade"
          onRequestClose={() => setImageViewer(null)}
        >
          <TouchableOpacity
            style={styles.imageViewerOverlay}
            activeOpacity={1}
            onPress={() => setImageViewer(null)}
          >
            {imageViewer?.uri ? (
              <Image source={{ uri: imageViewer.uri }} style={styles.imageViewerImage} resizeMode="contain" />
            ) : null}
            {imageViewer?.caption ? (
              <Text style={styles.imageViewerCaption}>{imageViewer.caption}</Text>
            ) : null}
          </TouchableOpacity>
        </Modal>

        <Modal visible={progressVisible} transparent animationType="fade" onRequestClose={() => setProgressVisible(false)}>
          <TouchableOpacity style={styles.progressOverlay} activeOpacity={1} onPress={() => setProgressVisible(false)}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Image source={getRoleImage(role.id, 'avatar')} style={styles.progressAvatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.progressTitle}>{role.name || '角色'}</Text>
                  <Text style={styles.progressSubtitle}>
                    {`${role.mood || '想你'} · ${getRelationshipLabelByAffectionLevel(roleProgress?.affection_level || 1)}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setProgressVisible(false)}>
                  <Ionicons name="close" size={18} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.progressBlock}>
                <Text style={styles.progressLabel}>
                  {`关系状态 ${getRelationshipLabelByAffectionLevel(roleProgress?.affection_level || 1)} · Lv.${roleProgress?.affection_level || 1}`}
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFillAffection,
                      {
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((roleProgress?.affection || 0) / Math.max(1, roleProgress?.next_affection_threshold || 1)) * 100
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressHint}>{`${roleProgress?.affection || 0}/${roleProgress?.next_affection_threshold || 0}`}</Text>
              </View>

            <View style={styles.progressSummaryRow}>
              <View style={styles.progressSummaryItem}>
                <Ionicons name="flame" size={14} color="#f093a4" />
                <Text style={styles.progressSummaryText}>连击 {userProfile?.streak_current || 0}</Text>
              </View>
              <View style={styles.progressSummaryItem}>
                <Ionicons name="trophy-outline" size={14} color="#f7a26a" />
                <Text style={styles.progressSummaryText}>最佳 {userProfile?.streak_best || 0}</Text>
              </View>
            </View>

            <View style={styles.progressSummaryRow}>
              <View style={styles.progressSummaryItem}>
                <Ionicons name="book-outline" size={14} color="#7a9cff" />
                <Text style={styles.progressSummaryText}>
                  今日词汇 {dailyStats?.vocab_new || 0}/{DAILY_VOCAB_TARGET}
                </Text>
              </View>
              <View style={styles.progressSummaryItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#6fcf97" />
                <Text style={styles.progressSummaryText}>消息 {dailyStats?.messages_count || 0}/3</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ffeaf0',
    marginRight: 8,
  },
  moodText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f093a4',
  },
  relationshipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ffeaf0',
  },
  relationshipText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f093a4',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.82)',
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  messageAvatarPlaceholder: {
    width: 34,
    height: 34,
    marginRight: 10,
    opacity: 0,
  },
  messageContent: {
    flexShrink: 1,
    flexGrow: 0,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '100%',
    flexShrink: 1,
  },
  bubbleAI: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  bubbleUser: {
    backgroundColor: 'rgba(255, 234, 240, 0.9)',
    borderBottomRightRadius: 4,
  },
  bubbleEmoji: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  bubbleImage: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  bubbleGift: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  bubbleAction: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  giftIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftTextBlock: {
    marginLeft: 10,
  },
  giftTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3a2a30',
  },
  giftEffectText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  giftNoteText: {
    marginTop: 4,
    fontSize: 11,
    color: '#8a7d82',
  },
  actionCardBubble: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  actionTagText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  actionBubbleText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3a2a30',
  },
  emojiImage: {
    width: 160,
    height: 160,
    borderRadius: 14,
  },
  imageMessage: {
    width: 220,
    height: 260,
    borderRadius: 14,
    backgroundColor: '#f4f4f4',
  },
  imageMessagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
  imageCaption: {
    marginTop: 8,
  },
  bubbleText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#d46b84',
    fontWeight: '500',
  },
  selectedWord: {
    backgroundColor: '#ffe1eb',
    color: '#c24d72',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bubbleHeart: {
    position: 'absolute',
    right: -18,
    bottom: -6,
  },
  messageQuoteBubble: {
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 244, 244, 0.95)',
  },
  messageQuoteText: {
    fontSize: 12,
    color: '#888',
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8c8c8c',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#f4f4f4',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#f4f4f4',
    marginTop: 8,
  },
  attachmentPreviewImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f4',
  },
  attachmentPreviewText: {
    marginLeft: 10,
    flex: 1,
    color: '#6b5f67',
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentRemoveButton: {
    padding: 6,
  },
  inputIcon: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: '#333',
    textAlignVertical: 'center',
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  plusButtonActive: {
    backgroundColor: '#f093a4',
    borderColor: '#f093a4',
  },
  quickPanel: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  quickPanelTitle: {
    fontSize: 12,
    color: '#9a9a9a',
    marginBottom: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#3a3a3a',
  },
  giftSheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  giftSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  giftSheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  giftSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  giftSheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  giftSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftSheetCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  giftSheetCardDisabled: {
    opacity: 0.5,
  },
  giftSheetIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  giftSheetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  giftSheetEffect: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  giftSheetFooter: {
    marginTop: 2,
  },
  giftSheetHint: {
    fontSize: 12,
    color: '#8a8a8a',
  },
  giftSheetLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  giftSheetLinkText: {
    fontSize: 12,
    color: '#9b9b9b',
    marginRight: 4,
  },
  actionSheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  actionSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  actionSheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSheetSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#8f8f8f',
  },
  actionToneRow: {
    marginTop: 14,
    marginBottom: 12,
  },
  actionToneChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9e9e9',
    backgroundColor: '#fafafa',
    marginRight: 8,
  },
  actionToneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  actionToneHint: {
    marginTop: 2,
    fontSize: 10,
    color: '#a0a0a0',
  },
  actionRandomButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fff3f6',
  },
  actionRandomText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f093a4',
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  actionCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionCardText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  actionCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ededed',
    backgroundColor: '#fafafa',
    marginTop: 4,
  },
  actionCustomInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#333',
    paddingVertical: 4,
  },
  actionPreviewBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f2f2f2',
    backgroundColor: '#fff',
  },
  actionPreviewLabel: {
    fontSize: 11,
    color: '#9a9a9a',
    marginBottom: 4,
  },
  actionPreviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  actionButtonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButtonGhost: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButtonGhostText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  actionButtonPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f093a4',
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  diarySheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  diarySheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  diarySheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  diaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  diarySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#9a9a9a',
  },
  diaryToggleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  diaryToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    marginRight: 8,
  },
  diaryToggleActive: {
    borderColor: '#f093a4',
    backgroundColor: '#ffe9f0',
  },
  diaryToggleText: {
    fontSize: 12,
    color: '#7a7a7a',
  },
  diaryToggleTextActive: {
    color: '#d46b84',
    fontWeight: '600',
  },
  diaryDateRow: {
    paddingBottom: 8,
  },
  diaryDateChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ededed',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  diaryDateChipActive: {
    borderColor: '#f093a4',
    backgroundColor: '#ffe9f0',
  },
  diaryDateText: {
    fontSize: 12,
    color: '#666',
  },
  diaryDateTextActive: {
    color: '#d46b84',
    fontWeight: '600',
  },
  diarySummaryCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f2f2f2',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  diarySummaryLabel: {
    fontSize: 11,
    color: '#9a9a9a',
    marginBottom: 6,
  },
  diarySummaryText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  diaryEntries: {
    maxHeight: 260,
  },
  diaryEntriesContent: {
    paddingBottom: 6,
  },
  diaryEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  diaryEntryTime: {
    fontSize: 11,
    color: '#b0b0b0',
    marginBottom: 4,
  },
  diaryEntryText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  diaryEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  diaryEmptyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b0b0b0',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  imageViewerImage: {
    width: '100%',
    height: '78%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  imageViewerCaption: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f1d7de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBanner: {
    backgroundColor: '#ffeef4',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockBannerText: {
    marginLeft: 6,
    color: '#f093a4',
    fontSize: 12,
  },
  actionMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionMenuContainer: {
    position: 'absolute',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  actionMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  actionMenuText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
  wordSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  wordSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  wordSheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  wordSheetContent: {
    paddingTop: 4,
  },
  wordSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  wordSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  wordSheetLabel: {
    fontSize: 12,
    color: '#c24d72',
    fontWeight: '700',
  },
  wordSheetBody: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
    lineHeight: 20,
  },
  wordSheetSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ffe7ef',
  },
  wordSheetSaveText: {
    marginLeft: 6,
    color: '#c24d72',
    fontWeight: '700',
    fontSize: 12,
  },
  wordSheetHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
  },
  wordSheetLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordSheetImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: '#ffeef4',
  },
  quotePreview: {
    marginHorizontal: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  quotePreviewLabel: {
    fontSize: 11,
    color: '#f093a4',
    marginBottom: 2,
  },
  quotePreviewText: {
    fontSize: 12,
    color: '#555',
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  progressCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  progressBlock: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#7a6276',
    fontWeight: '700',
  },
  progressBarBg: {
    marginTop: 6,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#f2eaf0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f093a4',
  },
  progressBarFillAffection: {
    height: '100%',
    backgroundColor: '#f7a26a',
  },
  progressHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#8f8f8f',
  },
  progressSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressSummaryText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#555',
    fontWeight: '700',
  },
});
