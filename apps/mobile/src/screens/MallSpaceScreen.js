import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings } from '../storage/db';
import { getRoleImage } from '../data/images';

const PALETTE = {
  canvasTop: '#fff4ec',
  canvasBottom: '#eef4ff',
  surface: '#ffffff',
  ink: '#2b1f1a',
  muted: '#8f7d77',
  mutedLight: '#b7a7a1',
  line: '#f1e2db',
  accent: '#f07a6a',
  accentDeep: '#e15e52',
  accentSoft: '#ffe2da',
  mint: '#d7f4e6',
  mintDeep: '#2f9a78',
  sky: '#dbe8ff',
  shadow: '#2d2522',
  glowWarm: 'rgba(255, 184, 160, 0.45)',
  glowCool: 'rgba(176, 200, 255, 0.4)',
};

const FONTS = {
  display: Platform.select({ ios: 'Didot', android: 'serif' }),
  body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-condensed' }),
  label: Platform.select({ ios: 'Avenir Next Condensed', android: 'sans-serif-medium' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
};

const CATEGORIES = [
  { id: 'featured', label: '推荐' },
  { id: 'gifts', label: '送礼' },
  { id: 'role', label: '角色卡' },
  { id: 'packs', label: '功能包' },
  { id: 'mystery', label: '盲盒' },
];

const CATEGORY_TITLES = {
  featured: '精选推荐',
  gifts: '送礼商品',
  role: '角色卡',
  packs: '功能包',
  mystery: '盲盒礼遇',
};

const PRODUCTS = [
  {
    id: 'role-card',
    title: '角色卡',
    desc: '解锁新的角色故事线',
    price: 6.66,
    icon: 'person-circle',
    tone: ['#ffe7db', '#f8bda6'],
    badge: '热卖',
    category: 'role',
  },
  {
    id: 'city-card',
    title: '地点卡',
    desc: '开启指定城市剧情',
    price: 8.88,
    icon: 'map',
    tone: ['#e2f0ff', '#b9d4ff'],
    badge: '限定',
    category: 'gifts',
  },
  {
    id: 'function-pack',
    title: '功能包',
    desc: '夜聊模式 + 心动语音',
    price: 20,
    icon: 'sparkles',
    tone: ['#e4f6ee', '#bde8cf'],
    badge: '新',
    category: 'packs',
  },
  {
    id: 'memory-jar',
    title: '回忆罐',
    desc: '把对话收藏成语音日记',
    price: 12.8,
    icon: 'albums',
    tone: ['#fff0d8', '#f5d3a2'],
    badge: '人气',
    category: 'gifts',
  },
  {
    id: 'mystery-box',
    title: '盲盒礼遇',
    desc: '随机获得限定礼物组合',
    price: 16.8,
    icon: 'cube',
    tone: ['#dff7f2', '#b2eadf'],
    badge: '随机',
    category: 'mystery',
  },
  {
    id: 'companion-pass',
    title: '陪伴通行证',
    desc: '解锁专属陪伴任务',
    price: 9.99,
    icon: 'heart',
    tone: ['#ffe7ed', '#ffc0cd'],
    badge: '收藏',
    category: 'featured',
  },
];

const BANNER_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1473959383414-bddf002a13b4?auto=format&fit=crop&w=1400&q=80',
};

const buildRevealStyle = (value, distance = 16) => ({
  opacity: value,
  transform: [
    {
      translateY: value.interpolate({
        inputRange: [0, 1],
        outputRange: [distance, 0],
      }),
    },
  ],
});

const formatAmount = (value = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number.toFixed(2);
};

const formatPrice = (value = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
};

const calcLevel = (balance) => Math.min(9, Math.max(1, Math.floor((balance || 0) / 2000) + 1));

export default function MallSpaceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [activeCategory, setActiveCategory] = useState('featured');
  const [balanceVisible, setBalanceVisible] = useState(true);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const infoAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const funAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      const data = await getUserSettings();
      setSettings(data);
    }
    load();
  }, []);

  useEffect(() => {
    if (!settings) return;
    Animated.stagger(110, [
      Animated.timing(headerAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(infoAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(bannerAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(funAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(listAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [bannerAnim, funAnim, headerAnim, infoAnim, listAnim, settings]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'featured') return PRODUCTS;
    return PRODUCTS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const topPadding = Math.max(insets.top - 6, 10);
  const bottomPadding = Math.max(insets.bottom + 24, 32);

  if (!settings) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={[PALETTE.canvasTop, PALETTE.canvasBottom]} style={styles.backgroundGradient} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={PALETTE.accent} />
          <Text style={styles.loadingText}>正在打开商城空间...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const balance = settings.currency_balance || 0;
  const level = calcLevel(balance);
  const nickname = settings.nickname || '心动旅人';
  const categoryTitle = CATEGORY_TITLES[activeCategory] || '精选商品';
  const avatarImage = getRoleImage('antoine', 'avatar');

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[PALETTE.canvasTop, PALETTE.canvasBottom]} style={styles.backgroundGradient} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.header, buildRevealStyle(headerAnim, 12)]}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color={PALETTE.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>商城空间</Text>
            <TouchableOpacity style={styles.headerButton} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="bag-handle-outline" size={20} color={PALETTE.ink} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.userCard, buildRevealStyle(infoAnim, 18)]}>
            <View style={styles.userLeft}>
              <View style={styles.avatarWrap}>
                <Image source={avatarImage} style={styles.avatar} />
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>LV{level}</Text>
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{nickname}</Text>
                <Text style={styles.userLevel}>用户消费等级：LV{level}</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>心动币：</Text>
                  <Text style={styles.balanceValue}>{balanceVisible ? formatAmount(balance) : '****'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.userRight}>
              <TouchableOpacity
                style={styles.balanceToggle}
                onPress={() => setBalanceVisible((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={styles.balanceToggleText}>余额</Text>
                <Ionicons
                  name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color={PALETTE.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rechargeButton} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.rechargeButtonText}>去充值</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View style={[styles.bannerWrap, buildRevealStyle(bannerAnim, 20)]}>
            <ImageBackground source={BANNER_IMAGE} style={styles.banner} imageStyle={styles.bannerImage}>
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']} style={styles.bannerOverlay} />
              <View style={styles.bannerTopRow}>
                <View style={styles.bannerPill}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text style={styles.bannerPillText}>订阅消费活动</Text>
                </View>
                <View style={styles.bannerTag}>
                  <Text style={styles.bannerTagText}>限时</Text>
                </View>
              </View>
              <View style={styles.bannerBottom}>
                <Text style={styles.bannerTitle}>订阅消费活动 banner</Text>
                <Text style={styles.bannerSubtitle}>心动币可叠加 · 限量福利放送</Text>
              </View>
            </ImageBackground>
            <View style={styles.bannerSideTag}>
              <Text style={styles.bannerSideTagText}>详情 >></Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.funRow, buildRevealStyle(funAnim, 16)]}>
            <TouchableOpacity style={[styles.funCard, styles.funCardWarm]} onPress={() => {}} activeOpacity={0.86}>
              <View style={styles.funIconWrap}>
                <Ionicons name="gift" size={18} color={PALETTE.accentDeep} />
              </View>
              <View>
                <Text style={styles.funTitle}>今日盲盒</Text>
                <Text style={styles.funSubtitle}>随机惊喜礼物</Text>
              </View>
              <View style={styles.funBadge}>
                <Text style={styles.funBadgeText}>抽一次</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.funCard, styles.funCardCool]} onPress={() => {}} activeOpacity={0.86}>
              <View style={styles.funIconWrap}>
                <Ionicons name="calendar" size={18} color={PALETTE.mintDeep} />
              </View>
              <View>
                <Text style={styles.funTitle}>签到福利</Text>
                <Text style={styles.funSubtitle}>连签翻倍奖励</Text>
              </View>
              <View style={[styles.funBadge, styles.funBadgeCool]}>
                <Text style={[styles.funBadgeText, styles.funBadgeTextCool]}>签到</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.categoryRow, buildRevealStyle(listAnim, 12)]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((item) => {
                const isActive = item.id === activeCategory;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveCategory(item.id)}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          <Animated.View style={[styles.sectionHeader, buildRevealStyle(listAnim, 18)]}>
            <Text style={styles.sectionTitle}>商品列表</Text>
            <Text style={styles.sectionSubtitle}>/ {categoryTitle}</Text>
          </Animated.View>

          <Animated.View style={[styles.productList, buildRevealStyle(listAnim, 22)]}>
            {filteredProducts.length ? (
              filteredProducts.map((item) => (
                <View key={item.id} style={styles.productCard}>
                  <LinearGradient colors={item.tone} style={styles.productThumb}>
                    <Ionicons name={item.icon} size={22} color={PALETTE.ink} />
                  </LinearGradient>
                  <View style={styles.productInfo}>
                    <View style={styles.productTitleRow}>
                      <Text style={styles.productTitle}>{item.title}</Text>
                      {item.badge ? (
                        <View style={styles.productBadge}>
                          <Text style={styles.productBadgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.productDesc}>{item.desc}</Text>
                    <Text style={styles.productPrice}>
                      <Text style={styles.productPricePrefix}>X</Text>
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity style={styles.detailButton} onPress={() => {}} activeOpacity={0.85}>
                      <Text style={styles.detailButtonText}>了解详情</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.buyButton}
                      onPress={() => navigation.navigate('Wallet')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.buyButtonText}>点击购买</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="cloud-offline-outline" size={32} color={PALETTE.mutedLight} />
                <Text style={styles.emptyText}>暂无该分类商品</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.canvasTop,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orbOne: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: PALETTE.glowWarm,
  },
  orbTwo: {
    position: 'absolute',
    bottom: 140,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: PALETTE.glowCool,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.display,
  },
  userCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f7e6dd',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: PALETTE.accentSoft,
    borderWidth: 1,
    borderColor: '#fff',
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.accentDeep,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 12,
    color: PALETTE.muted,
    fontFamily: FONTS.label,
  },
  userLevel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  balanceRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: PALETTE.muted,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.mono,
  },
  userRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  balanceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: '#fff',
  },
  balanceToggleText: {
    fontSize: 11,
    color: PALETTE.muted,
    marginRight: 6,
    fontFamily: FONTS.label,
  },
  rechargeButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: PALETTE.accent,
  },
  rechargeButtonText: {
    marginLeft: 6,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.label,
  },
  bannerWrap: {
    marginTop: 16,
  },
  banner: {
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
  },
  bannerImage: {
    borderRadius: 24,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerPillText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#fff',
    fontFamily: FONTS.label,
  },
  bannerTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  bannerTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  bannerBottom: {
    marginTop: 8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.display,
  },
  bannerSubtitle: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.body,
  },
  bannerSideTag: {
    position: 'absolute',
    left: -32,
    top: 60,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fff',
    transform: [{ rotate: '-90deg' }],
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  bannerSideTagText: {
    fontSize: 11,
    color: PALETTE.ink,
    fontFamily: FONTS.label,
  },
  funRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  funCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginRight: 10,
  },
  funCardWarm: {
    backgroundColor: '#fff4ec',
  },
  funCardCool: {
    backgroundColor: '#f0fbf6',
    marginRight: 0,
  },
  funIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  funTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  funSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  funBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: PALETTE.accentSoft,
  },
  funBadgeText: {
    fontSize: 10,
    color: PALETTE.accentDeep,
    fontWeight: '700',
  },
  funBadgeCool: {
    backgroundColor: PALETTE.mint,
  },
  funBadgeTextCool: {
    color: PALETTE.mintDeep,
  },
  categoryRow: {
    marginTop: 18,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: PALETTE.ink,
    borderColor: PALETTE.ink,
  },
  categoryText: {
    fontSize: 12,
    color: PALETTE.muted,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  sectionSubtitle: {
    marginLeft: 6,
    fontSize: 12,
    color: PALETTE.muted,
  },
  productList: {
    marginTop: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginBottom: 12,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    marginRight: 6,
  },
  productBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: PALETTE.accentSoft,
  },
  productBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE.accentDeep,
  },
  productDesc: {
    marginTop: 4,
    fontSize: 11,
    color: PALETTE.muted,
  },
  productPrice: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
    fontFamily: FONTS.mono,
  },
  productPricePrefix: {
    fontSize: 12,
    color: PALETTE.accentDeep,
  },
  productActions: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  detailButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: '#fff',
  },
  detailButtonText: {
    fontSize: 10,
    color: PALETTE.muted,
    fontWeight: '600',
  },
  buyButton: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PALETTE.ink,
  },
  buyButtonText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 12,
    color: PALETTE.muted,
  },
});
