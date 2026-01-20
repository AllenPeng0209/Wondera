import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  addMessage,
  completeDailyTask,
  ensureConversationByRoleId,
  ensureDailyTasksForDay,
  getDailyTasks,
  getUserSettings,
} from '../storage/db';
import { getRoleImage } from '../data/images';

const PALETTE = {
  bgTop: '#fff6f1',
  bgBottom: '#f3f4ff',
  surface: '#ffffff',
  ink: '#2f2622',
  muted: '#8f7f7a',
  mutedLight: '#b09f9a',
  line: '#f1e1de',
  accent: '#d86a83',
  accentDeep: '#c4526b',
  accentSoft: '#fde6ec',
  coin: '#f5b34c',
  coinSoft: '#fff3e0',
  success: '#6fcf97',
  info: '#5a7bd8',
  infoSoft: '#edf2ff',
  shadow: '#221c1e',
  bubblePink: 'rgba(255, 204, 215, 0.35)',
  bubbleBlue: 'rgba(198, 210, 255, 0.3)',
};

const DIFFICULTY_MAP = {
  H: { label: '进阶', color: '#8a5bf6', bg: '#f3ecff' },
  M: { label: '中阶', color: '#f59f65', bg: '#fff1e7' },
  L: { label: '入门', color: '#5a9de0', bg: '#eaf6ff' },
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

const formatDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (dayKey) => {
  if (!dayKey) return '';
  const parts = dayKey.split('-');
  if (parts.length !== 3) return dayKey;
  return `${parts[1]}/${parts[2]}`;
};

const getTaskCoins = (task) => {
  if (!task) return 0;
  const rewardCoinsValue = Number(task.reward_coins);
  if (Number.isFinite(rewardCoinsValue) && rewardCoinsValue > 0) return rewardCoinsValue;
  const rewardPoints = task.reward_points || 5;
  return Math.max(0, Math.round(rewardPoints * 10));
};

export default function DailyTasksScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [todayKey, setTodayKey] = useState(formatDateKey());

  const load = useCallback(async () => {
    setLoading(true);
    const dayKey = formatDateKey();
    setTodayKey(dayKey);
    try {
      await ensureDailyTasksForDay(dayKey);
      const [list, settings] = await Promise.all([getDailyTasks(dayKey), getUserSettings()]);
      setTasks(list || []);
      setBalance(settings?.currency_balance || 0);
    } catch (error) {
      console.warn('[DailyTasks] load failed', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );

  const totalCoins = useMemo(
    () => tasks.reduce((sum, task) => sum + getTaskCoins(task), 0),
    [tasks]
  );

  const earnedCoins = useMemo(
    () => tasks.reduce((sum, task) => sum + (task.completed ? getTaskCoins(task) : 0), 0),
    [tasks]
  );

  const progress = tasks.length ? Math.min(1, completedCount / tasks.length) : 0;

  const handleStartTask = async (task) => {
    if (!task || busyTaskId) return;
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
          await addMessage(conversationId, 'ai', `[任务提示] ${stagePrompt}`);
        }
        await addMessage(conversationId, 'ai', kickoff);
        await completeDailyTask(task.id);
        await load();
      }
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      console.warn('[DailyTasks] complete failed', error);
      Alert.alert('操作失败', error?.message || '完成任务时出错');
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleStartNext = () => {
    const next = tasks.find((item) => !item.completed) || tasks[0];
    if (next) handleStartTask(next);
  };

  const bottomPadding = Math.max(insets.bottom + 18, 24);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgBottom]} style={styles.backgroundGradient} />
      <View style={styles.orbOne} pointerEvents="none" />
      <View style={styles.orbTwo} pointerEvents="none" />

      <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(insets.top - 6, 8) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PALETTE.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>每日任务</Text>
          <TouchableOpacity onPress={load} style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color={PALETTE.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 120 }]}
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.4)']}
              style={styles.heroGlow}
            />
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroLabel}>今日任务 · {formatShortDate(todayKey)}</Text>
                <Text style={styles.heroTitle}>完成任务，领取心动币</Text>
              </View>
              <View style={styles.balanceBadge}>
                <Ionicons name="sparkles" size={14} color={PALETTE.coin} />
                <Text style={styles.balanceText}>{balance}</Text>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{completedCount}/{tasks.length || 0}</Text>
                <Text style={styles.heroStatLabel}>已完成</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{earnedCoins}</Text>
                <Text style={styles.heroStatLabel}>已得心动币</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{totalCoins}</Text>
                <Text style={styles.heroStatLabel}>今日总奖励</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.heroHint}>每日 0 点刷新任务，完成全部更快解锁奖励。</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日任务</Text>
            <Text style={styles.sectionSubtitle}>每个任务都能获得心动币奖励</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={PALETTE.accent} />
              <Text style={styles.loadingText}>正在生成今天的任务...</Text>
            </View>
          ) : tasks.length ? (
            tasks.map((task, index) => {
              const completed = Boolean(task.completed);
              const rewardCoins = getTaskCoins(task);
              const rewardPoints = task.reward_points || 5;
              const words = Array.isArray(task.target_words) ? task.target_words.slice(0, 6) : [];
              const difficultyMeta = DIFFICULTY_MAP[task.difficulty] || DIFFICULTY_MAP.M;
              const hero =
                getRoleImage(task.target_role_id, 'avatar') ||
                getRoleImage(task.target_role_id, 'heroImage');
              const roleName = roleNameMap[task.target_role_id] || '心动角色';

              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskHeaderLeft}>
                      {hero ? (
                        <Image source={hero} style={styles.taskAvatar} />
                      ) : (
                        <View style={styles.taskAvatarPlaceholder} />
                      )}
                      <View style={styles.taskHeaderText}>
                        <Text style={styles.taskTitle}>{task.title || '今日任务'}</Text>
                        <Text style={styles.taskScene}>{task.scene || '恋爱剧场'} · {roleName}</Text>
                      </View>
                    </View>
                    <View style={styles.taskHeaderRight}>
                      <View style={[styles.taskBadge, { backgroundColor: difficultyMeta.bg }]}>
                        <Text style={[styles.taskBadgeText, { color: difficultyMeta.color }]}>
                          {difficultyMeta.label}
                        </Text>
                      </View>
                      <Text style={styles.taskIndex}>DAY {index + 1}</Text>
                    </View>
                  </View>

                  <Text style={styles.taskDescription}>{task.description || '完成目标即可领取奖励。'}</Text>

                  {words.length ? (
                    <View style={styles.wordRow}>
                      <Text style={styles.wordLabel}>目标词汇</Text>
                      <View style={styles.wordChips}>
                        {words.map((word) => (
                          <View key={`${task.id}-${word}`} style={styles.wordChip}>
                            <Text style={styles.wordChipText}>{word}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {task.kickoff_prompt ? (
                    <View style={styles.promptBox}>
                      <Text style={styles.promptLabel}>开场白示例</Text>
                      <Text style={styles.promptText}>{task.kickoff_prompt}</Text>
                    </View>
                  ) : null}

                  <View style={styles.rewardRow}>
                    <View style={styles.rewardGroup}>
                      <View style={styles.coinPill}>
                        <Ionicons name="sparkles" size={14} color={PALETTE.coin} />
                        <Text style={styles.coinText}>+{rewardCoins} 心动币</Text>
                      </View>
                      <View style={styles.affectionPill}>
                        <Ionicons name="heart" size={14} color={PALETTE.accent} />
                        <Text style={styles.affectionText}>好感 +{rewardPoints}</Text>
                      </View>
                    </View>
                    {completed ? (
                      <View style={styles.completedTag}>
                        <Ionicons name="checkmark-circle" size={16} color={PALETTE.success} />
                        <Text style={styles.completedText}>已完成</Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.taskButton,
                      completed && styles.taskButtonDone,
                      busyTaskId && { opacity: 0.7 },
                    ]}
                    onPress={() => handleStartTask(task)}
                    disabled={!!busyTaskId}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.taskButtonText, completed && styles.taskButtonTextDone]}>
                      {completed ? '继续对话' : '开始任务'}
                    </Text>
                    <Ionicons
                      name={completed ? 'chatbubble-ellipses-outline' : 'play'}
                      size={16}
                      color={completed ? PALETTE.accent : '#fff'}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="cloud-offline-outline" size={36} color={PALETTE.accent} />
              <Text style={styles.emptyTitle}>今日暂无任务</Text>
              <Text style={styles.emptySubtitle}>稍后再来看看新的任务吧。</Text>
            </View>
          )}
        </ScrollView>

        {!loading && tasks.length > 0 ? (
          <View style={[styles.bottomBar, { paddingBottom: bottomPadding }]}> 
            <TouchableOpacity
              style={[styles.bottomButton, busyTaskId && { opacity: 0.7 }]}
              onPress={handleStartNext}
              disabled={!!busyTaskId}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.bottomButtonText}>开始今日任务</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.bgBottom,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orbOne: {
    position: 'absolute',
    top: -110,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: PALETTE.bubblePink,
  },
  orbTwo: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: PALETTE.bubbleBlue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surface,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surface,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: PALETTE.surface,
    marginBottom: 22,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 12,
    color: PALETTE.mutedLight,
    letterSpacing: 0.5,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: PALETTE.coinSoft,
  },
  balanceText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.coin,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.muted,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 8,
    backgroundColor: PALETTE.accentSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.accent,
  },
  heroHint: {
    marginTop: 10,
    fontSize: 12,
    color: PALETTE.mutedLight,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.muted,
  },
  loadingBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: PALETTE.surface,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: PALETTE.muted,
  },
  taskCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: PALETTE.surface,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 12,
  },
  taskAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: PALETTE.accentSoft,
  },
  taskHeaderText: {
    flex: 1,
  },
  taskHeaderRight: {
    alignItems: 'flex-end',
  },
  taskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskIndex: {
    marginTop: 6,
    fontSize: 11,
    color: PALETTE.mutedLight,
    letterSpacing: 0.6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  taskScene: {
    marginTop: 2,
    fontSize: 12,
    color: PALETTE.muted,
  },
  taskDescription: {
    marginTop: 10,
    fontSize: 13,
    color: PALETTE.ink,
    lineHeight: 18,
  },
  wordRow: {
    marginTop: 12,
  },
  wordLabel: {
    fontSize: 12,
    color: PALETTE.info,
    fontWeight: '700',
  },
  wordChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  wordChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: PALETTE.infoSoft,
    marginRight: 8,
    marginBottom: 8,
  },
  wordChipText: {
    fontSize: 12,
    color: PALETTE.info,
    fontWeight: '600',
  },
  promptBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff4f7',
  },
  promptLabel: {
    fontSize: 12,
    color: PALETTE.accent,
    fontWeight: '700',
  },
  promptText: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.ink,
    lineHeight: 16,
  },
  rewardRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PALETTE.coinSoft,
    marginRight: 8,
  },
  coinText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.coin,
  },
  affectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PALETTE.accentSoft,
  },
  affectionText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.accent,
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
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.success,
  },
  taskButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: PALETTE.accent,
  },
  taskButtonDone: {
    backgroundColor: '#fff4f8',
    borderWidth: 1,
    borderColor: '#f6cad7',
  },
  taskButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  taskButtonTextDone: {
    color: PALETTE.accent,
  },
  emptyBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: PALETTE.surface,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.muted,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomButton: {
    backgroundColor: PALETTE.accent,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
