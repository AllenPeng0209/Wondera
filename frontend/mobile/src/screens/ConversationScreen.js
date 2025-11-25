import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addMessage,
  addVocabItem,
  getConversationDetail,
  getMessages,
  getRoleSettings,
  getUserSettings,
  saveMessageAudio,
  deleteMessage,
} from '../storage/db';
import { generateAiReply, getWordCard } from '../services/ai';
import { synthesizeQwenTts } from '../services/tts';
import { getRoleImage } from '../data/images';

export default function ConversationScreen({ navigation, route }) {
  const { conversationId, shouldResendGreeting } = route.params;
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
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
  const listRef = useRef(null);
  const messagesRef = useRef([]);
  const greetingSentRef = useRef(false);
  const prevIsTypingRef = useRef(false);
  const soundRef = useRef(null);

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
        deliverAiChunks(role.greeting);
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

  const handleSend = async () => {
    if (!inputValue.trim() || !conversation || !role) return;
    if (isBlocked) {
      Alert.alert('已拉黑', '你已拉黑 Ta，无法继续对话。');
      return;
    }
    const content = inputValue.trim();
    setInputValue('');
    const quotedBody = quoteSource || null;
    setQuotePreview(null);
    setQuoteSource(null);
    const createdAt = Date.now();
    const newMessage = await addMessage(conversation.id, 'user', content, createdAt, {
      quotedBody,
    });
    const nextHistory = [...messagesRef.current, newMessage];
    setMessages(nextHistory);
    messagesRef.current = nextHistory;

    setSending(true);
    try {
      const aiResult = await generateAiReply({
        conversation,
        role,
        history: nextHistory,
        userProfile,
      });
      await deliverAiChunks(aiResult.text);
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
    if (!selectedMessage || !selectedMessage.body) return;
    try {
      await Clipboard.setStringAsync(selectedMessage.body);
    } catch (error) {
      console.warn('[Conversation] 复制失败', error);
    } finally {
      closeActionMenu();
    }
  }, [selectedMessage, closeActionMenu]);

  const handleForwardMessage = useCallback(async () => {
    if (!selectedMessage || !selectedMessage.body) return;
    try {
      await Share.share({ message: selectedMessage.body });
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
    if (!selectedMessage || !selectedMessage.body) return;
    const snippet =
      selectedMessage.body.length > 40
        ? `${selectedMessage.body.slice(0, 40)}…`
        : selectedMessage.body;
    setQuotePreview(snippet);
    setQuoteSource(selectedMessage.body);
    closeActionMenu();
  }, [selectedMessage, closeActionMenu]);

  const handlePlayFromMenu = useCallback(() => {
    if (!selectedMessage) return;
    handlePlayTts(selectedMessage);
    closeActionMenu();
  }, [selectedMessage, handlePlayTts, closeActionMenu]);

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
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
  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage} imageStyle={styles.backgroundImageStyle}>
      <SafeAreaView style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>
          <Image source={getRoleImage(role.id, 'avatar')} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{role.name || ''}</Text>
            <View style={styles.moodPill}>
              <Ionicons name="leaf-outline" color="#f093a4" size={12} />
              <Text style={styles.moodText}>{role.mood || '想你'}</Text>
            </View>
          </View>
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

          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={22} color="#b0b0b0" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="输入消息..."
              placeholderTextColor="#b5b5b5"
              value={inputValue}
              onChangeText={setInputValue}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ffeaf0',
    marginTop: 4,
  },
  moodText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#f093a4',
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f093a4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
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
});
