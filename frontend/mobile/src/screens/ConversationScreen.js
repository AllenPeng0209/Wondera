import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMessage, getConversationDetail, getMessages } from '../storage/db';
import { generateAiReply } from '../services/ai';

export default function ConversationScreen({ navigation, route }) {
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const messagesRef = useRef([]);

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
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !conversation || !role) return;
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
      const aiMessage = await addMessage(conversation.id, 'ai', aiResult.text, Date.now());
      const updatedHistory = [...messagesRef.current, aiMessage];
      setMessages(updatedHistory);
      messagesRef.current = updatedHistory;
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

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <Image source={{ uri: role?.avatar }} style={styles.messageAvatar} />
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAI,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.body}
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
  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Image source={{ uri: role.avatar }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{role.name}</Text>
          <View style={styles.moodPill}>
            <Ionicons name="leaf-outline" color="#f093a4" size={12} />
            <Text style={styles.moodText}>{role.mood || '想你'}</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
        {sending && (
          <View style={styles.typingRow}>
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={styles.typingText}>...</Text>
            </View>
          </View>
        )}

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
          <TouchableOpacity style={styles.heartAction}>
            <Ionicons name="heart" size={20} color="#f093a4" />
          </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  bubbleUser: {
    backgroundColor: '#ffeaf0',
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
  typingRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#8c8c8c',
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
    backgroundColor: '#fff',
  },
  inputIcon: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: '#333',
  },
  heartAction: {
    padding: 6,
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
});
