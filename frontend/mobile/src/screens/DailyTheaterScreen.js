import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  addMessage,
  completeDailyTask,
  ensureConversationByRoleId,
  ensureDailyTasksForDay,
  getDailyTasks,
  getUserSettings,
} from '../storage/db';
import { getRoleImage } from '../data/images';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const roleNameMap = {
  antoine: 'Antoine',
  edward: 'Edward',
  kieran: 'Kieran',
};

const defaultRoleByTitle = {
  '餐厅点单': 'antoine',
  '物理作业急救': 'edward',
  '高层咖啡会谈': 'kieran',
  '夜市小吃攻略': 'antoine',
  '法语加一点甜': 'edward',
};

export default function DailyTheaterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [affection, setAffection] = useState(0);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const dayKey = formatDateKey();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDailyTasksForDay(dayKey);
      const [list, settings] = await Promise.all([getDailyTasks(dayKey), getUserSettings()]);
      setTasks(list || []);
      setAffection(settings?.affection_points || 0);
    } catch (error) {
      console.warn('[DailyTheater] load failed', error);
    } finally {
      setLoading(false);
    }
  }, [dayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleComplete = async (task) => {
    if (busyTaskId) return;
    setBusyTaskId(task.id);
    try {
      const targetRoleId = task.target_role_id || defaultRoleByTitle[task.title] || 'antoine';
      const kickoff = task.kickoff_prompt || 'I could use your help. Can you handle this?';
      const sceneLine = task.scene ? `场景：${task.scene}` : '';
      const taskLine = task.description ? `任务：${task.description}` : '';
      const words = Array.isArray(task.target_words) ? task.target_words : [];
      const wordsLine = words.length ? `目标词汇：${words.join(', ')}` : '';
      const stagePrompt = [sceneLine, taskLine, wordsLine].filter(Boolean).join(' ｜ ');

      const conversationId = await ensureConversationByRoleId(targetRoleId);
      if (!task.completed) {
        if (stagePrompt) {
          await addMessage(conversationId, 'ai', `[剧场任务提示] ${stagePrompt}`);
        }
        await addMessage(conversationId, 'ai', kickoff);
        await completeDailyTask(task.id);
        await load();
      }
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      console.warn('[DailyTheater] complete failed', error);
      Alert.alert('操作失败', error?.message || '完成任务时出错');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleStartFirst = () => {
    if (!tasks.length) return;
    const next = tasks.find((t) => !t.completed) || tasks[0];
    handleComplete(next);
  };

  const renderItem = ({ item, index }) => {
    const completed = Boolean(item.completed);
    const hero = getRoleImage(item.target_role_id, 'heroImage') || getRoleImage(item.target_role_id, 'avatar');
    const difficultyLabel = item.difficulty === 'H' ? '进阶' : '中阶';
    const wordsToShow = Array.isArray(item.target_words) ? item.target_words.slice(0, 5) : [];
    return (
      <View style={styles.card}>
        {hero ? (
          <View style={styles.cardHeroWrapper}>
            <Image source={hero} style={styles.cardHero} />
            <View style={styles.cardHeroOverlay} />
            <View style={styles.cardHeroText}>
              <Text style={styles.cardHeroTitle}>{item.scene || '恋爱剧场'}</Text>
              <Text style={styles.cardHeroSubtitle}>{item.title || ''}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.cardHeader}>
          <View style={styles.scenePill}>
            <Ionicons name="heart" size={14} color="#f093a4" />
            <Text style={styles.sceneText}>{`${item.scene || '恋爱剧场'} · ${difficultyLabel}`}</Text>
          </View>
          <Text style={styles.dayLabel}>Day {index + 1}</Text>
        </View>
        <ScrollView
          style={styles.cardBodyScroll}
          contentContainerStyle={styles.cardBody}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          
        >
          <Text style={styles.title}>{item.title || ''}</Text>
          <Text style={styles.description}>{item.description || ''}</Text>

          <View style={styles.roleRow}>
            <Ionicons name="person" size={14} color="#b38aa6" />
            <Text style={styles.roleText}>角色：{roleNameMap[item.target_role_id] || '心动角色'}</Text>
          </View>

          {item.kickoff_prompt ? (
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>开场白示例</Text>
              <Text style={styles.promptText}>{item.kickoff_prompt}</Text>
            </View>
          ) : null}

          {wordsToShow.length ? (
            <View style={styles.vocabBox}>
              <Text style={styles.vocabLabel}>单词学习</Text>
              <View style={styles.vocabChips}>
                {wordsToShow.map((word) => (
                  <View key={word} style={styles.vocabChip}>
                    <Text style={styles.vocabChipText}>{word}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.rewardRow}>
            <View style={styles.rewardPill}>
              <Ionicons name="sparkles" size={14} color="#f7a26a" />
              <Text style={styles.rewardText}>好感 +{item.reward_points || 5}</Text>
            </View>
            {completed ? (
              <View style={styles.completedTag}>
                <Ionicons name="checkmark-circle" size={16} color="#6fcf97" />
                <Text style={styles.completedText}>已完成</Text>
              </View>
            ) : null}
          </View>

   
        </ScrollView>
      </View>
    );
  };

  const topPadding = Math.max(insets.top - 8, 8);
  // Keep enough space for home indicator but avoid pushing cards off-screen
  const bottomPadding = Math.max(insets.bottom + 4, 16);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}> 
      <View style={styles.header}>
        <Text style={styles.headerTitle}>每日剧场</Text>
        <View style={styles.affectionBadge}>
          <Ionicons name="flame" size={16} color="#f093a4" />
          <Text style={styles.affectionText}>{affection}</Text>
        </View>
      </View>

      <Text style={styles.subTitle}>今日 3 个对话任务 · 直达角色聊天并送上开场白</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#f093a4" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 140, 160) },
          ]}
          style={{ flexGrow: 0 }}
        />
      )}

      {!loading && tasks.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
          <TouchableOpacity
            style={[styles.bottomButton, busyTaskId && { opacity: 0.7 }]}
            onPress={handleStartFirst}
            disabled={!!busyTaskId}
            activeOpacity={0.9}
          >
            <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.bottomButtonText}>进入剧场对话</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  affectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fff0f4',
  },
  affectionText: {
    marginLeft: 6,
    color: '#f093a4',
    fontWeight: '700',
  },
  subTitle: {
    paddingHorizontal: 16,
    color: '#8f8f8f',
    fontSize: 13,
    marginBottom: 8,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -20,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: -8,
  
    shadowColor: '#000',
    shadowOpacity: 0.08,

    shadowOffset: { width: 0, height: 0 },
  },
  bottomButton: {
    backgroundColor: '#f093a4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    marginHorizontal: 6,
    padding: 0,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    height: 1000,
  },
  cardHeroWrapper: {
    height: 180,
    position: 'relative',
  },
  cardHero: {
    width: '100%',
    height: '100%',
  },
  cardHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardHeroText: {
    position: 'absolute',
    left: 14,
    bottom: 12,
  },
  cardHeroTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.9,
  },
  cardHeroSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  cardBodyScroll: {
    maxHeight: SCREEN_HEIGHT * 0.62,
  },
  scenePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff0f4',
  },
  sceneText: {
    marginLeft: 6,
    color: '#f093a4',
    fontWeight: '700',
  },
  dayLabel: {
    color: '#b0a4af',
    fontSize: 12,
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  roleText: {
    marginLeft: 6,
    color: '#7a6276',
    fontSize: 13,
    fontWeight: '600',
  },
  promptBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff4f7',
  },
  promptLabel: {
    fontSize: 12,
    color: '#c24d72',
    marginBottom: 4,
    fontWeight: '700',
  },
  promptText: {
    fontSize: 13,
    color: '#4a3b44',
    lineHeight: 18,
  },
  vocabBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f6f9ff',
  },
  vocabLabel: {
    fontSize: 12,
    color: '#3b6bcf',
    marginBottom: 8,
    fontWeight: '700',
  },
  vocabChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vocabChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#e7f0ff',
  },
  vocabChipText: {
    fontSize: 12,
    color: '#3156a3',
    fontWeight: '700',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff6ed',
  },
  rewardText: {
    marginLeft: 6,
    color: '#f7a26a',
    fontWeight: '700',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e8fff2',
  },
  completedText: {
    marginLeft: 6,
    color: '#6fcf97',
    fontWeight: '700',
    fontSize: 12,
  },
  actionButton: {
    marginTop: 18,
    marginHorizontal: 18,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f093a4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButtonDone: {
    backgroundColor: '#fff4f8',
    borderWidth: 1,
    borderColor: '#f6cad7',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  actionTextDone: {
    color: '#f093a4',
  },
});
