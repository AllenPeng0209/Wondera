import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 18;
const CARD_WIDTH = Math.min(320, SCREEN_WIDTH * 0.78);
const CARD_GAP = 16;
const CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const CARD_SIDE_PADDING = Math.max(0, (CONTENT_WIDTH - CARD_WIDTH) / 2);

const PALETTE = {
  bgTop: '#fff1f4',
  bgBottom: '#f7dbe3',
  surface: '#fff9fb',
  line: '#f3cbd8',
  ink: '#3a1f28',
  muted: '#8a6070',
  soft: '#ffe3ec',
  accent: '#f06f98',
  accentDeep: '#c94a74',
  accentCool: '#b06a88',
};

const FONTS = {
  display: Platform.select({ ios: 'Bodoni 72', android: 'serif' }),
  body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif' }),
};

const ACHIEVEMENTS = [
  {
    id: 'achv-1',
    title: '初遇回声',
    subtitle: '完成一次完整对话',
    badge: '初',
    progress: 1,
    goal: 1,
    unlocked: true,
    claimed: false,
  },
  {
    id: 'achv-2',
    title: '第一次心动',
    subtitle: '亲密值达到 Lv2',
    badge: '心',
    progress: 38,
    goal: 60,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'achv-3',
    title: '七日陪伴',
    subtitle: '连续陪伴 7 天',
    badge: '伴',
    progress: 4,
    goal: 7,
    unlocked: false,
    claimed: false,
  },
  {
    id: 'achv-4',
    title: '专属称呼',
    subtitle: '解锁你们的专属昵称',
    badge: '名',
    progress: 1,
    goal: 1,
    unlocked: true,
    claimed: true,
  },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function AchievementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  const revealStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round((offsetX - CARD_SIDE_PADDING) / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(Math.min(Math.max(index, 0), ACHIEVEMENTS.length - 1));
  };

  const headerStats = useMemo(() => {
    const unlocked = ACHIEVEMENTS.filter((item) => item.unlocked).length;
    return { unlocked, total: ACHIEVEMENTS.length };
  }, []);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgBottom]} style={styles.backgroundGradient} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(insets.top, 10) }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 32, 32) }]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={20} color={PALETTE.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>成就系统</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Animated.View style={[styles.banner, revealStyle]}>
            <LinearGradient
              colors={['rgba(255,249,251,0.96)', 'rgba(255,227,236,0.9)']}
              style={styles.bannerSurface}
            >
              <View style={styles.bannerTopRow}>
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerBadgeText}>本周成就</Text>
                </View>
                <Text style={styles.bannerMeta}>已解锁 {headerStats.unlocked}/{headerStats.total}</Text>
              </View>
              <Text style={styles.bannerTitle}>该成就banner</Text>
              <Text style={styles.bannerSubtitle}>
                成就介绍 · 把重要瞬间归档成章，解锁专属徽章与关系记忆。
              </Text>
              <View style={styles.bannerFooter}>
                <View style={styles.bannerStat}>
                  <Text style={styles.bannerStatValue}>3</Text>
                  <Text style={styles.bannerStatLabel}>本周里程碑</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerStat}>
                  <Text style={styles.bannerStatValue}>12</Text>
                  <Text style={styles.bannerStatLabel}>累计成就</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.wallHeader}>
            <View style={styles.wallDotsGroup}>
              {ACHIEVEMENTS.map((item, index) => (
                <View
                  key={`${item.id}-dot`}
                  style={[styles.wallDot, index === activeIndex && styles.wallDotActive]}
                />
              ))}
            </View>
            <Text style={styles.wallTitle}>成就墙</Text>
            <View style={styles.wallDotsGroup}>
              {ACHIEVEMENTS.map((item, index) => (
                <View
                  key={`${item.id}-dot-right`}
                  style={[styles.wallDot, index === activeIndex && styles.wallDotActive]}
                />
              ))}
            </View>
          </View>

          <Animated.View style={[styles.carousel, revealStyle]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={handleScroll}
              contentContainerStyle={styles.carouselContent}
            >
              {ACHIEVEMENTS.map((item, index) => {
                const progressRatio = clamp(item.progress / item.goal);
                const progressLabel = `${item.progress}/${item.goal}`;
                const progressPercent = `${Math.round(progressRatio * 100)}%`;
                const statusText = item.claimed ? '已领取' : item.unlocked ? '可领取' : '进行中';

                return (
                  <View
                    key={item.id}
                    style={[styles.card, index === ACHIEVEMENTS.length - 1 && styles.cardLast]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardPill}>
                        <Text style={styles.cardPillText}>成就名称</Text>
                      </View>
                      <View style={[styles.cardStatus, item.unlocked && styles.cardStatusActive]}>
                        <Text style={[styles.cardStatusText, item.unlocked && styles.cardStatusTextActive]}>
                          {statusText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.badgeRing}>
                      <View style={styles.badgeInner}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>完成度</Text>
                      <Text style={styles.progressValue}>{progressPercent}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                    </View>
                    <View style={styles.progressMeta}>
                      <Text style={styles.progressMetaText}>当前进度 {progressLabel}</Text>
                      <Text style={styles.progressMetaText}>
                        距离达成 {Math.max(item.goal - item.progress, 0)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.claimButton,
                        (!item.unlocked || item.claimed) && styles.claimButtonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={!item.unlocked || item.claimed}
                    >
                      <Text
                        style={[
                          styles.claimButtonText,
                          (!item.unlocked || item.claimed) && styles.claimButtonTextDisabled,
                        ]}
                      >
                        {item.claimed ? '已领取' : item.unlocked ? '领取' : '努力中'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.bgTop,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(240,111,152,0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 80,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(195,124,150,0.16)',
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
    letterSpacing: 0.4,
  },
  headerSpacer: {
    width: 36,
  },
  banner: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3a1f28',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  bannerSurface: {
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: PALETTE.soft,
  },
  bannerBadgeText: {
    fontSize: 10,
    color: PALETTE.accentDeep,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  bannerMeta: {
    fontSize: 11,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  bannerTitle: {
    marginTop: 14,
    fontSize: 20,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
  },
  bannerSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: PALETTE.muted,
    lineHeight: 18,
    fontFamily: FONTS.body,
  },
  bannerFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerStat: {
    flex: 1,
    alignItems: 'center',
  },
  bannerStatValue: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
  },
  bannerStatLabel: {
    marginTop: 4,
    fontSize: 10,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  bannerDivider: {
    width: 1,
    height: 26,
    backgroundColor: PALETTE.line,
  },
  wallHeader: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wallTitle: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  wallDotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  wallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(240,111,152,0.25)',
    marginHorizontal: 4,
  },
  wallDotActive: {
    width: 16,
    backgroundColor: PALETTE.accent,
  },
  carousel: {
    marginTop: 12,
  },
  carouselContent: {
    paddingVertical: 8,
    paddingHorizontal: CARD_SIDE_PADDING,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    shadowColor: '#3a1f28',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardLast: {
    marginRight: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(240,111,152,0.12)',
  },
  cardPillText: {
    fontSize: 10,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  cardStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(176,106,136,0.16)',
  },
  cardStatusActive: {
    backgroundColor: 'rgba(240,111,152,0.2)',
  },
  cardStatusText: {
    fontSize: 10,
    color: PALETTE.accentCool,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  cardStatusTextActive: {
    color: PALETTE.accentDeep,
  },
  badgeRing: {
    marginTop: 16,
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(240,111,152,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PALETTE.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: PALETTE.accentDeep,
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
    textAlign: 'center',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 11,
    color: PALETTE.muted,
    textAlign: 'center',
    fontFamily: FONTS.body,
  },
  progressRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  progressValue: {
    fontSize: 10,
    color: PALETTE.accentDeep,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(240,111,152,0.2)',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.accent,
  },
  progressMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    fontSize: 10,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  claimButton: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: PALETTE.ink,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(58,31,40,0.2)',
  },
  claimButtonText: {
    fontSize: 12,
    color: PALETTE.surface,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  claimButtonTextDisabled: {
    color: PALETTE.muted,
  },
});
