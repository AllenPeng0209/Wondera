import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ensureConversationByRoleId,
  getDailyLearningStats,
  getRoleProgress,
  getRoleSettings,
  getRoles,
  getUserSettings,
  getVocabStats,
  getVocabTimeline,
} from '../storage/db';
import { getRoleImage } from '../data/images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 18;
const GRID_GAP = 12;
const ALBUM_ITEM = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;

const TOP_TABS = [
  { key: 'role', label: '角色空间' },
  { key: 'journey', label: '云游记录' },
  { key: 'vocab', label: '词库记录' },
];

const ROLE_VIEWS = [
  { key: 'profile', label: '档案', icon: 'person-outline' },
  { key: 'moments', label: '动态', icon: 'sparkles-outline' },
  { key: 'album', label: '相册', icon: 'images-outline' },
  { key: 'gifts', label: '礼物', icon: 'gift-outline' },
  { key: 'diary', label: '记录', icon: 'book-outline' },
];

const BOND_TITLES = ['初遇', '微光', '悸动', '心动', '默契', '依恋', '誓约', '相守'];

const GIFT_CATALOG = [
  { id: 'gift-rose', title: '玫瑰', effect: '心动 +3', icon: 'heart' },
  { id: 'gift-ticket', title: '电影票', effect: '心动 +8', icon: 'ticket' },
  { id: 'gift-scarf', title: '围巾', effect: '心动 +15', icon: 'ribbon' },
  { id: 'gift-ring', title: '誓言戒', effect: '心动 +30', icon: 'diamond', locked: true },
];

const MILESTONES = [
  { id: 'milestone-1', title: '第一次对话', requirement: 0, hint: '已解锁' },
  { id: 'milestone-2', title: '第一次心动', requirement: 60, hint: '亲密 Lv2' },
  { id: 'milestone-3', title: '七日陪伴', requirement: 150, hint: '亲密 Lv3' },
  { id: 'milestone-4', title: '专属称呼', requirement: 320, hint: '亲密 Lv4' },
];

const formatDate = (ts) => {
  if (!ts) return '--';
  const date = new Date(ts);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}/${day}`;
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const getBondTitle = (level) => {
  if (!level) return '初遇';
  if (level <= BOND_TITLES.length) return BOND_TITLES[level - 1];
  return `眷恋 Lv${level}`;
};

export default function GrowthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('role');
  const [activeView, setActiveView] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [role, setRole] = useState(null);
  const [roleProgress, setRoleProgress] = useState(null);
  const [roleSettings, setRoleSettings] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [vocabStats, setVocabStats] = useState({ total: 0, mastered: 0, due: 0 });
  const [vocabTimeline, setVocabTimeline] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesList, settings, daily, vocab, timeline] = await Promise.all([
        getRoles(),
        getUserSettings(),
        getDailyLearningStats(),
        getVocabStats(),
        getVocabTimeline(6),
      ]);
      setRoles(rolesList || []);
      setUserSettings(settings || null);
      setDailyStats(daily || null);
      setVocabStats(vocab || { total: 0, mastered: 0, due: 0 });
      setVocabTimeline(timeline || []);

      const selectedRole =
        rolesList?.find((item) => item.id === activeRoleId) || rolesList?.[0] || null;
      setRole(selectedRole);
      if (selectedRole?.id && selectedRole.id !== activeRoleId) {
        setActiveRoleId(selectedRole.id);
      }
      if (selectedRole?.id) {
        const [progress, prefs] = await Promise.all([
          getRoleProgress(selectedRole.id),
          getRoleSettings(selectedRole.id),
        ]);
        setRoleProgress(progress || null);
        setRoleSettings(prefs || null);
      } else {
        setRoleProgress(null);
        setRoleSettings(null);
      }
    } catch (error) {
      console.warn('[Growth] load failed', error);
    } finally {
      setLoading(false);
    }
  }, [activeRoleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSelectRole = async (roleId) => {
    if (!roleId || roleId === activeRoleId) return;
    const selected = roles.find((item) => item.id === roleId) || null;
    setActiveRoleId(roleId);
    setRole(selected);
    setRoleLoading(true);
    try {
      const [progress, prefs] = await Promise.all([
        getRoleProgress(roleId),
        getRoleSettings(roleId),
      ]);
      setRoleProgress(progress || null);
      setRoleSettings(prefs || null);
    } catch (error) {
      console.warn('[Growth] switch role failed', error);
    } finally {
      setRoleLoading(false);
    }
  };

  const handleEnterRoleSpace = async () => {
    if (!role?.id) return;
    try {
      const conversationId = await ensureConversationByRoleId(role.id);
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      console.warn('[Growth] enter role failed', error);
    }
  };

  const roleName = role?.name || '角色姓名';
  const roleTitle = role?.title || '角色标题';
  const roleStatus = role?.mood || '在线';
  const roleLocation = role?.city ? `${role.city} · 同步时区` : '角色所在国家 · 城市 · 时区';
  const customName = roleSettings?.nickname_override || roleName;
  const avatarImage = getRoleImage(role?.id, 'avatar') || getRoleImage('antoine', 'avatar');
  const heroImage = getRoleImage(role?.id, 'heroImage') || getRoleImage('antoine', 'heroImage');

  const affection = roleProgress?.affection || 0;
  const affectionLevel = roleProgress?.affection_level || 1;
  const bondTitle = getBondTitle(affectionLevel);
  const nextAffection = roleProgress?.next_affection_threshold || 120;
  const bondProgress = clamp(nextAffection ? affection / nextAffection : 0);

  const exp = roleProgress?.exp || 0;
  const nextExp = roleProgress?.next_level_exp || 120;
  const expProgress = clamp(nextExp ? exp / nextExp : 0);

  const streakCurrent = userSettings?.streak_current || 0;
  const streakBest = userSettings?.streak_best || 0;

  const roleTags = useMemo(() => {
    const tags = [];
    if (roleTitle) tags.push(roleTitle);
    if (role?.city) tags.push(role.city);
    if (Array.isArray(role?.tags) && role.tags.length) tags.push(role.tags[0]);
    if (userSettings?.mbti) tags.push(`MBTI ${userSettings.mbti}`);
    while (tags.length < 3) tags.push('专属标签');
    return tags.slice(0, 3);
  }, [role, roleTitle, userSettings]);

  const momentItems = useMemo(() => {
    if (!role) return [];
    const greeting = role?.greeting ? role.greeting.replace(/\n/g, ' ') : '';
    return [
      {
        id: `${role.id}-moment-1`,
        title: '今天的心情',
        body: role.description || '想把今天的情绪写进你的日记里。',
        time: '今天 18:40',
        image: heroImage,
      },
      {
        id: `${role.id}-moment-2`,
        title: '不经意的想念',
        body: greeting || '别让我的话只停在对话框里。',
        time: '昨天 21:10',
        image: heroImage,
      },
      {
        id: `${role.id}-moment-3`,
        title: '关于你的小秘密',
        body: role?.city ? `路过${role.city}的时候，又想起你。` : '路过熟悉的街道，又想起你。',
        time: '3天前',
        image: heroImage,
      },
    ];
  }, [heroImage, role]);

  const albumItems = useMemo(() => {
    const unlockCount = Math.min(2 + Math.floor(affectionLevel / 2), 6);
    return Array.from({ length: 6 }).map((_, index) => ({
      id: `${role?.id || 'role'}-album-${index}`,
      locked: index >= unlockCount,
      image: heroImage,
    }));
  }, [affectionLevel, heroImage, role?.id]);

  const diaryText = useMemo(() => {
    const parts = [];
    if (role?.description) parts.push(role.description);
    if (role?.greeting) parts.push(role.greeting.replace(/\n/g, ' '));
    if (role?.city) parts.push(`今天聊到了 ${role.city} 的天气，也聊到了你。`);
    if (roleSettings?.catchphrase) parts.push(roleSettings.catchphrase);
    return parts.filter(Boolean).join(' ');
  }, [role, roleSettings]);

  const milestoneItems = useMemo(
    () =>
      MILESTONES.map((item) => ({
        ...item,
        unlocked: affection >= item.requirement,
      })),
    [affection]
  );

  const journeyItems = useMemo(() => {
    const messages = dailyStats?.messages_count || 0;
    const tasks = dailyStats?.tasks_completed || 0;
    return [
      {
        id: 'journey-1',
        title: '今日聊天记录',
        meta: `对话 ${messages} · 任务 ${tasks}`,
        body: '把今天的回应存进旅程，感情才会有回声。',
        status: dailyStats?.completed ? '已记录' : '待续',
      },
      {
        id: 'journey-2',
        title: '心动里程碑',
        meta: `亲密 Lv${affectionLevel}`,
        body: '每一次升级，都会解锁新的相处方式。',
        status: affectionLevel >= 3 ? '已解锁' : '正在积累',
        locked: affectionLevel < 3,
      },
      {
        id: 'journey-3',
        title: '同城心动',
        meta: role?.city ? role.city : '未知城市',
        body: '把你们的共同地点写进记忆地图。',
        status: role?.city ? '已解锁' : '待解锁',
        locked: !role?.city,
      },
    ];
  }, [affectionLevel, dailyStats, role]);

  const topPadding = Math.max(insets.top - 6, 10);
  const bottomPadding = Math.max(insets.bottom + 24, 28);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>成长历程</Text>
          <Text style={styles.pageSubtitle}>把关系写成日记</Text>
        </View>

        <View style={styles.tabRow}>
          {TOP_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#d86a83" />
            <Text style={styles.loadingText}>正在整理你们的成长记录...</Text>
          </View>
        ) : roles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={44} color="#d86a83" />
            <Text style={styles.emptyTitle}>暂时没有可用角色</Text>
            <Text style={styles.emptySubtitle}>先去探索，认识一个心动的他。</Text>
          </View>
        ) : activeTab === 'role' ? (
          <>
            <View style={styles.roleStrip}>
              <Text style={styles.stripLabel}>角色名单</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {roles.map((item) => {
                  const selected = item.id === activeRoleId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.roleChip}
                      onPress={() => handleSelectRole(item.id)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={getRoleImage(item.id, 'avatar') || avatarImage}
                        style={[styles.roleAvatar, selected && styles.roleAvatarActive]}
                      />
                      <Text style={[styles.roleName, selected && styles.roleNameActive]} numberOfLines={1}>
                        {item.name || '角色'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.heroCard}>
              <ImageBackground source={heroImage} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
                  style={styles.heroOverlay}
                />
                <View style={styles.heroTopRow}>
                  <View style={styles.heroStatusPill}>
                    <Text style={styles.heroStatusText}>{roleStatus}</Text>
                  </View>
                  <View style={styles.heroLevelPill}>
                    <Ionicons name="flame" size={14} color="#d86a83" />
                    <Text style={styles.heroLevelText}>亲密 Lv{affectionLevel}</Text>
                  </View>
                </View>
                <View style={styles.heroBottom}>
                  <Text style={styles.heroName}>{customName}</Text>
                  <Text style={styles.heroMeta}>{roleName} · {roleTitle}</Text>
                  <Text style={styles.heroLocation}>{roleLocation}</Text>
                </View>
              </ImageBackground>
              {roleLoading ? (
                <View style={styles.heroLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>

            <View style={styles.heroDock}>
              {ROLE_VIEWS.map((item) => {
                const isActive = activeView === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.heroDockItem, isActive && styles.heroDockItemActive]}
                    onPress={() => setActiveView(item.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isActive ? '#fff' : '#7f6f6a'}
                      style={styles.heroDockIcon}
                    />
                    <Text style={[styles.heroDockText, isActive && styles.heroDockTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.bondCard}>
              <View style={styles.bondHeader}>
                <View>
                  <Text style={styles.bondTitle}>亲密进度 · {bondTitle}</Text>
                  <Text style={styles.bondSubtitle}>下一阶段 {nextAffection} 心动值</Text>
                </View>
                <View style={styles.bondBadge}>
                  <Text style={styles.bondBadgeText}>Lv {affectionLevel}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${bondProgress * 100}%` }]} />
              </View>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{affection}</Text>
                  <Text style={styles.statLabel}>心动值</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{streakCurrent}</Text>
                  <Text style={styles.statLabel}>连续陪伴</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{streakBest}</Text>
                  <Text style={styles.statLabel}>最长记录</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{exp}</Text>
                  <Text style={styles.statLabel}>熟悉度</Text>
                </View>
              </View>
              <View style={styles.expTrack}>
                <View style={[styles.expFill, { width: `${expProgress * 100}%` }]} />
              </View>
              <Text style={styles.expText}>熟悉度进度 {exp}/{nextExp}</Text>
            </View>

            <View style={styles.promiseCard}>
              <Text style={styles.promiseLabel}>专属约定</Text>
              <Text style={styles.promiseText}>
                {roleSettings?.catchphrase || '把每天的聊天当作秘密仪式，把你的故事只告诉我。'}
              </Text>
              <TouchableOpacity style={styles.promiseAction} activeOpacity={0.85} onPress={handleEnterRoleSpace}>
                <Text style={styles.promiseActionText}>进入角色空间</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>关系里程碑</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {milestoneItems.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.milestoneCard, !item.unlocked && styles.milestoneCardLocked]}
                  >
                    <Text style={styles.milestoneTitle}>{item.title}</Text>
                    <Text style={styles.milestoneHint}>{item.unlocked ? '已达成' : item.hint}</Text>
                    <View style={[styles.milestoneBadge, item.unlocked && styles.milestoneBadgeActive]}>
                      <Text style={[styles.milestoneBadgeText, item.unlocked && styles.milestoneBadgeTextActive]}>
                        {item.unlocked ? '已解锁' : '锁定'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {activeView === 'profile' ? (
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <Image source={avatarImage} style={styles.profileAvatar} />
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{customName}</Text>
                    <Text style={styles.profileMeta}>{roleName} · {roleTitle}</Text>
                    <Text style={styles.profileLocation}>{roleLocation}</Text>
                    <View style={styles.profileTagRow}>
                      {roleTags.map((tag, index) => (
                        <View key={`${tag}-${index}`} style={styles.profileTag}>
                          <Text style={styles.profileTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.profileFoot}>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>Lv {affectionLevel}</Text>
                    <Text style={styles.profileStatLabel}>亲密等级</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>{bondTitle}</Text>
                    <Text style={styles.profileStatLabel}>关系阶段</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>{streakCurrent} 天</Text>
                    <Text style={styles.profileStatLabel}>连续陪伴</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {activeView === 'moments' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>动态记录</Text>
                {momentItems.map((item) => (
                  <View key={item.id} style={styles.momentCard}>
                    <Image source={item.image} style={styles.momentImage} />
                    <View style={styles.momentBody}>
                      <Text style={styles.momentTitle}>{item.title}</Text>
                      <Text style={styles.momentText} numberOfLines={2}>{item.body}</Text>
                      <View style={styles.momentFooter}>
                        <Text style={styles.momentTime}>{item.time}</Text>
                        <View style={styles.momentPill}>
                          <Ionicons name="heart" size={12} color="#d86a83" />
                          <Text style={styles.momentPillText}>心动记录</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {activeView === 'album' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>角色相册</Text>
                <View style={styles.albumGrid}>
                  {albumItems.map((item) => (
                    <View key={item.id} style={styles.albumItem}>
                      {item.locked ? (
                        <View style={styles.albumLocked}>
                          <Ionicons name="lock-closed" size={18} color="#9e8f8a" />
                          <Text style={styles.albumLockedText}>未解锁</Text>
                        </View>
                      ) : (
                        <Image source={item.image} style={styles.albumImage} />
                      )}
                    </View>
                  ))}
                </View>
                <Text style={styles.albumHint}>亲密度越高，可解锁的相册越多。</Text>
              </View>
            ) : null}

            {activeView === 'gifts' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>礼物组件</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {GIFT_CATALOG.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.giftCard, item.locked && styles.giftCardLocked]}
                    >
                      <View style={styles.giftIcon}>
                        <Ionicons name={item.icon} size={18} color="#d86a83" />
                      </View>
                      <Text style={styles.giftTitle}>{item.title}</Text>
                      <Text style={styles.giftEffect}>{item.effect}</Text>
                      {item.locked ? <Text style={styles.giftLocked}>解锁后可送</Text> : null}
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.giftInfoCard}>
                  <Text style={styles.giftInfoTitle}>送礼规则</Text>
                  <Text style={styles.giftInfoText}>
                    送礼会触发独家回应，并记录进成长日记。高阶礼物解锁专属回忆片段。
                  </Text>
                </View>
              </View>
            ) : null}

            {activeView === 'diary' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>当日聊天记录</Text>
                <View style={styles.diaryCard}>
                  <Text style={styles.diaryDate}>记录日期 · {formatDate(Date.now())}</Text>
                  <Text style={styles.diaryTitle}>今天的心动回声</Text>
                  <Text style={styles.diaryText}>{diaryText || '今天的故事仍在继续。'}</Text>
                  <View style={styles.diaryActions}>
                    <TouchableOpacity style={styles.diaryButton} activeOpacity={0.85}>
                      <Text style={styles.diaryButtonText}>收藏到回忆</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.diaryGhost} activeOpacity={0.85}>
                      <Text style={styles.diaryGhostText}>写下备注</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        ) : activeTab === 'journey' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>云游记录</Text>
              <Text style={styles.sectionSubtitle}>把每一次互动变成可回看的旅程</Text>
            </View>
            <View style={styles.journeySummary}>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{dailyStats?.messages_count || 0}</Text>
                <Text style={styles.journeyStatLabel}>今日对话</Text>
              </View>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{dailyStats?.vocab_new || 0}</Text>
                <Text style={styles.journeyStatLabel}>新词汇</Text>
              </View>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{dailyStats?.tasks_completed || 0}</Text>
                <Text style={styles.journeyStatLabel}>已完成任务</Text>
              </View>
            </View>
            <View style={styles.timeline}>
              {journeyItems.map((item) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, item.locked && styles.timelineDotLocked]} />
                  <View style={[styles.timelineCard, item.locked && styles.timelineCardLocked]}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text style={styles.timelineStatus}>{item.status}</Text>
                    </View>
                    <Text style={styles.timelineMeta}>{item.meta}</Text>
                    <Text style={styles.timelineBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>词库成长</Text>
              <Text style={styles.sectionSubtitle}>语言记忆会成为关系里最温柔的回响</Text>
            </View>
            <View style={styles.vocabStats}>
              <View style={styles.vocabStatCard}>
                <Text style={styles.vocabStatValue}>{vocabStats.total}</Text>
                <Text style={styles.vocabStatLabel}>总词汇</Text>
              </View>
              <View style={styles.vocabStatCard}>
                <Text style={styles.vocabStatValue}>{vocabStats.mastered}</Text>
                <Text style={styles.vocabStatLabel}>已掌握</Text>
              </View>
              <View style={[styles.vocabStatCard, styles.vocabStatCardLast]}>
                <Text style={styles.vocabStatValue}>{vocabStats.due}</Text>
                <Text style={styles.vocabStatLabel}>待复习</Text>
              </View>
            </View>
            <View style={styles.vocabTimeline}>
              {vocabTimeline.map((item) => (
                <View key={item.id} style={styles.vocabItem}>
                  <View>
                    <Text style={styles.vocabTerm}>{item.term}</Text>
                    <Text style={styles.vocabDefinition} numberOfLines={1}>
                      {item.definition || '单词记录'}
                    </Text>
                  </View>
                  <Text style={styles.vocabDate}>{formatDate(item.created_at)}</Text>
                </View>
              ))}
              {!vocabTimeline.length ? (
                <Text style={styles.vocabEmpty}>还没有添加单词，去建立你们的专属词库。</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.vocabButton} onPress={() => navigation.navigate('Vocab')} activeOpacity={0.85}>
              <Text style={styles.vocabButtonText}>进入词库练习</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6efe9',
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  pageHeader: {
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2f2422',
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#8d7c76',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f1e1de',
    marginTop: 12,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabPillActive: {
    backgroundColor: '#2f2422',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8d7c76',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingBox: {
    marginTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#8d7c76',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#3f3330',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#9a8a85',
  },
  roleStrip: {
    marginTop: 14,
  },
  stripLabel: {
    fontSize: 12,
    color: '#9a8a85',
    marginBottom: 8,
  },
  roleChip: {
    alignItems: 'center',
    marginRight: 14,
  },
  roleAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#fff',
  },
  roleAvatarActive: {
    borderColor: '#d86a83',
    shadowColor: '#d86a83',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  roleName: {
    marginTop: 6,
    fontSize: 11,
    color: '#7f6f6a',
    maxWidth: 70,
  },
  roleNameActive: {
    color: '#d86a83',
    fontWeight: '600',
  },
  heroCard: {
    marginTop: 12,
    borderRadius: 26,
    overflow: 'hidden',
  },
  heroImage: {
    height: 240,
    justifyContent: 'space-between',
  },
  heroImageStyle: {
    borderRadius: 26,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  heroStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  heroStatusText: {
    fontSize: 11,
    color: '#2f2422',
    fontWeight: '600',
  },
  heroLevelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  heroLevelText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#5b4b47',
    fontWeight: '600',
  },
  heroBottom: {
    padding: 16,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  heroLocation: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  heroLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroDock: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 8,
    marginHorizontal: 8,
    marginTop: -18,
    shadowColor: '#b8a6a0',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroDockItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
  },
  heroDockItemActive: {
    backgroundColor: '#2f2422',
  },
  heroDockIcon: {
    marginBottom: 4,
  },
  heroDockText: {
    fontSize: 10,
    color: '#7f6f6a',
    fontWeight: '600',
  },
  heroDockTextActive: {
    color: '#fff',
  },
  bondCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#b8a6a0',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  bondHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bondTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2f2422',
  },
  bondSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: '#8d7c76',
  },
  bondBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fde6ec',
  },
  bondBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d86a83',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f3e1e1',
    marginTop: 12,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d86a83',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2422',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#9a8a85',
  },
  expTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f5eee9',
    marginTop: 12,
  },
  expFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2f2422',
  },
  expText: {
    marginTop: 6,
    fontSize: 10,
    color: '#8d7c76',
  },
  promiseCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  promiseLabel: {
    fontSize: 11,
    color: '#d86a83',
    fontWeight: '600',
  },
  promiseText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#3a2f2c',
  },
  promiseAction: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#2f2422',
  },
  promiseActionText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2422',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#8d7c76',
  },
  milestoneCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  milestoneCardLocked: {
    backgroundColor: '#f3efed',
    borderColor: '#e4d6d2',
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3a2f2c',
  },
  milestoneHint: {
    marginTop: 4,
    fontSize: 10,
    color: '#9a8a85',
  },
  milestoneBadge: {
    marginTop: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f4ebe7',
  },
  milestoneBadgeActive: {
    backgroundColor: '#2f2422',
  },
  milestoneBadgeText: {
    fontSize: 10,
    color: '#8d7c76',
  },
  milestoneBadgeTextActive: {
    color: '#fff',
  },
  profileCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#b8a6a0',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2422',
  },
  profileMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#8d7c76',
  },
  profileLocation: {
    marginTop: 2,
    fontSize: 11,
    color: '#9a8a85',
  },
  profileTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  profileTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f6efeb',
    marginRight: 8,
    marginBottom: 6,
  },
  profileTagText: {
    fontSize: 10,
    color: '#7f6f6a',
    fontWeight: '600',
  },
  profileFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  profileStat: {
    alignItems: 'center',
    flex: 1,
  },
  profileStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2422',
  },
  profileStatLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#9a8a85',
  },
  momentCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f2e4e2',
  },
  momentImage: {
    width: '100%',
    height: 140,
  },
  momentBody: {
    padding: 12,
  },
  momentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2422',
  },
  momentText: {
    marginTop: 4,
    fontSize: 12,
    color: '#7f6f6a',
    lineHeight: 18,
  },
  momentFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  momentTime: {
    fontSize: 10,
    color: '#9a8a85',
  },
  momentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fde6ec',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  momentPillText: {
    marginLeft: 4,
    fontSize: 10,
    color: '#d86a83',
    fontWeight: '600',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  albumItem: {
    width: ALBUM_ITEM,
    height: ALBUM_ITEM * 1.2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
    backgroundColor: '#efe7e4',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumLocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efe7e4',
  },
  albumLockedText: {
    marginTop: 6,
    fontSize: 11,
    color: '#9a8a85',
  },
  albumHint: {
    fontSize: 11,
    color: '#9a8a85',
  },
  giftCard: {
    width: 120,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  giftCardLocked: {
    opacity: 0.6,
  },
  giftIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fde6ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  giftTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2422',
  },
  giftEffect: {
    marginTop: 4,
    fontSize: 11,
    color: '#8d7c76',
  },
  giftLocked: {
    marginTop: 6,
    fontSize: 10,
    color: '#b29d98',
  },
  giftInfoCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  giftInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2f2422',
  },
  giftInfoText: {
    marginTop: 6,
    fontSize: 11,
    color: '#7f6f6a',
    lineHeight: 18,
  },
  diaryCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  diaryDate: {
    fontSize: 10,
    color: '#9a8a85',
  },
  diaryTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#2f2422',
  },
  diaryText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#7f6f6a',
  },
  diaryActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  diaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#2f2422',
    marginRight: 10,
  },
  diaryButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  diaryGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0d2ce',
  },
  diaryGhostText: {
    fontSize: 11,
    color: '#8d7c76',
    fontWeight: '600',
  },
  journeySummary: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  journeyStat: {
    flex: 1,
    alignItems: 'center',
  },
  journeyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2422',
  },
  journeyStatLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#9a8a85',
  },
  timeline: {
    marginTop: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d86a83',
    marginTop: 8,
  },
  timelineDotLocked: {
    backgroundColor: '#cbbab4',
  },
  timelineCard: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  timelineCardLocked: {
    backgroundColor: '#f4efed',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2422',
  },
  timelineStatus: {
    fontSize: 10,
    color: '#9a8a85',
  },
  timelineMeta: {
    marginTop: 4,
    fontSize: 10,
    color: '#b09f9a',
  },
  timelineBody: {
    marginTop: 6,
    fontSize: 11,
    color: '#7f6f6a',
    lineHeight: 16,
  },
  vocabStats: {
    marginTop: 12,
    flexDirection: 'row',
  },
  vocabStatCard: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  vocabStatCardLast: {
    marginRight: 0,
  },
  vocabStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2422',
  },
  vocabStatLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#9a8a85',
  },
  vocabTimeline: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  vocabItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0e5e2',
  },
  vocabTerm: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2422',
  },
  vocabDefinition: {
    marginTop: 2,
    fontSize: 11,
    color: '#7f6f6a',
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  vocabDate: {
    fontSize: 10,
    color: '#9a8a85',
  },
  vocabEmpty: {
    fontSize: 11,
    color: '#9a8a85',
    textAlign: 'center',
    paddingVertical: 10,
  },
  vocabButton: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#2f2422',
    alignItems: 'center',
  },
  vocabButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
