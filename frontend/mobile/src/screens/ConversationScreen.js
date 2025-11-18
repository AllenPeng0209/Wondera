import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMessage, getConversationDetail, getMessages, getRoleSettings } from '../storage/db';
import { generateAiReply } from '../services/ai';
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
  const [roleConfig, setRoleConfig] = useState(null);
  const listRef = useRef(null);
  const messagesRef = useRef([]);
  const greetingSentRef = useRef(false);
  const prevIsTypingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    const createdAt = Date.now();
    const newMessage = await addMessage(conversation.id, 'user', content, createdAt);
    const nextHistory = [...messagesRef.current, newMessage];
    setMessages(nextHistory);
    messagesRef.current = nextHistory;

    setSending(true);
    try {
      const aiResult = await generateAiReply({
        conversation,
        role,
        history: nextHistory,
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

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <Image source={getRoleImage(role?.id, 'avatar')} style={styles.messageAvatar} />
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAI,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.body || ''}
          </Text>
          {isUser && (
            <Ionicons name="heart" color="#f093a4" size={16} style={styles.bubbleHeart} />
          )}
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

  // Use role's hero image as chat background
  const backgroundImage = getRoleImage(role?.id, 'heroImage') || getRoleImage(role?.id, 'avatar');

  // Add typing indicator to message list when typing
  const listData = isTyping ? [...messages, { type: 'typing', id: 'typing-indicator' }] : messages;

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
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
          keyboardVerticalOffset={80}
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
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '75%',
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
  bubbleHeart: {
    position: 'absolute',
    right: -18,
    bottom: -6,
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
    marginBottom: 20,
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
});
