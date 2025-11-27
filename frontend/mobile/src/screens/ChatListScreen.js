import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversations, deleteConversation } from '../storage/db';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { getRoleImage } from '../data/images';

export default function ChatListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);

  const loadConversations = useCallback(async () => {
    const data = await getConversations();
    setConversations(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const confirmDelete = (conversationId, name) => {
    Alert.alert('删除对话', `确认删除与 ${name} 的全部聊天吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(conversationId);
          loadConversations();
        },
      },
    ]);
  };

  const renderRightActions = (item) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(item.id, item.name)}>
      <Text style={styles.deleteText}>删除</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrapper}>
          <Image source={getRoleImage(item.roleId, 'avatar')} style={styles.avatar} />
          <View style={[styles.onlineDot, { opacity: 0.6 }]} />
        </View>
        <View style={styles.chatBody}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.name || ''}</Text>
            <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <Text style={styles.chatSnippet} numberOfLines={1}>
            {item.lastMessage || item.greeting || ''}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderListHeader = () => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.discoverCard}
      onPress={() => navigation.navigate('Discover')}
    >
      <View style={styles.discoverTextBlock}>
        <Text style={styles.discoverLabel}>发现 · 心动推荐</Text>
        <Text style={styles.discoverTitle}>去看看新角色</Text>
        <Text style={styles.discoverSubtitle}>Tap to explore</Text>
      </View>
      <View style={styles.discoverIconWrapper}>
        <Feather name="arrow-right" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  const topPadding = Math.max(insets.top - 8, 8);
  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}> 
      <View style={styles.header}>
        <Text style={styles.headerTitle}>消息</Text>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CreateRole')}
        >
          <Feather name="plus" size={20} color="#8f8f8f" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#404040',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  discoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffe9f1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffd4e4',
  },
  discoverTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  discoverLabel: {
    fontSize: 12,
    color: '#c24d72',
    marginBottom: 6,
    fontWeight: '600',
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3f3f3f',
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  discoverIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f093a4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f093a4',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0f0f0',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7ed321',
    borderWidth: 2,
    borderColor: '#fdfdfd',
  },
  chatBody: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3f3f3f',
  },
  chatTime: {
    fontSize: 12,
    color: '#b0b0b0',
  },
  chatSnippet: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  deleteAction: {
    width: 80,
    backgroundColor: '#ff5b6b',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 8,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
