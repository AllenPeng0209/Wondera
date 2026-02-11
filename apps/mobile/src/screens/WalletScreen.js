import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings, updateUserSettings } from '../storage/db';

const PALETTE = {
  bgTop: '#fff6f1',
  bgBottom: '#f3f4ff',
  canvas: '#f6f1ec',
  surface: '#fff',
  ink: '#2f2622',
  muted: '#8f7f7a',
  mutedLight: '#b09f9a',
  line: '#f1e1de',
  accent: '#d86a83',
  accentDeep: '#c4526b',
  accentSoft: '#fde6ec',
  shadow: '#221c1e',
  bubblePink: 'rgba(255, 204, 215, 0.35)',
  bubbleBlue: 'rgba(198, 210, 255, 0.3)',
};

const packages = [
  { id: '600', amount: 600, price: 6 },
  { id: '2000', amount: 2000, price: 18 },
  { id: '3500', amount: 3500, price: 30 },
  { id: '12000', amount: 12000, price: 98 },
];

const TABS = [
  { key: 'earn', label: '积分记录' },
  { key: 'recharge', label: '充值明细' },
];

const fallbackEarnRecords = [
  {
    id: 'earn-signin',
    title: '完成任务：连续签到奖励',
    detail: '完成签到',
    amount: 30,
  },
  {
    id: 'earn-first',
    title: '完成任务：首充奖励',
    detail: '新手任务',
    amount: 200,
  },
];

const parseHistory = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const formatAmount = (amount = 0) => (amount >= 0 ? `+${amount}` : `${amount}`);

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [earnHistory, setEarnHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('earn');

  useEffect(() => {
    async function load() {
      const data = await getUserSettings();
      setSettings(data);
      setHistory(parseHistory(data?.wallet_recharge_history));
      setEarnHistory(parseHistory(data?.wallet_earn_history));
    }
    load();
  }, []);

  const rechargeRecords = useMemo(
    () =>
      history.map((item) => ({
        id: item.id,
        title: '充值心动币',
        detail: item.price ? `充值 ¥${item.price}` : '余额充值',
        amount: item.amount || 0,
        time: formatDate(item.createdAt),
      })),
    [history]
  );

  const earnRecords = useMemo(() => {
    const records = earnHistory.map((item, index) => ({
      id: item.id || `earn-${index}`,
      title: item.title || '任务奖励',
      detail: item.detail || '每日任务',
      amount: item.amount || 0,
      time: formatDate(item.createdAt),
    }));
    return records.length ? records : fallbackEarnRecords;
  }, [earnHistory]);

  const applyRecharge = async (pkg) => {
    if (!settings) return;
    const entry = {
      id: `recharge-${Date.now()}`,
      amount: pkg.amount,
      price: pkg.price,
      createdAt: Date.now(),
    };
    const nextHistory = [entry, ...history].slice(0, 20);
    const newBalance = (settings.currency_balance || 0) + pkg.amount;
    await updateUserSettings({
      currency_balance: newBalance,
      wallet_recharge_history: JSON.stringify(nextHistory),
    });
    setSettings((prev) => ({
      ...prev,
      currency_balance: newBalance,
      wallet_recharge_history: JSON.stringify(nextHistory),
    }));
    setHistory(nextHistory);
    Alert.alert('充值成功', `获得 ${pkg.amount} 心动币`);
  };

  const handleRecharge = () => {
    Alert.alert(
      '选择充值金额',
      '心动币会立即到账',
      [
        ...packages.map((pkg) => ({
          text: `${pkg.amount} 心动币`,
          onPress: () => applyRecharge(pkg),
        })),
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  if (!settings) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>加载中...</Text>
      </SafeAreaView>
    );
  }

  const balance = settings.currency_balance || 0;
  const bottomPadding = Math.max(insets.bottom + 24, 32);
  const currentRecords = activeTab === 'earn' ? earnRecords : rechargeRecords;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgBottom]} style={styles.backgroundGradient} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(insets.top - 6, 8) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PALETTE.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的心动币</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceValue}>{balance}</Text>
            <Text style={styles.balanceLabel}>余额（心动币）</Text>
            <TouchableOpacity style={styles.rechargeButton} onPress={handleRecharge} activeOpacity={0.85}>
              <Text style={styles.rechargeText}>充值心动币</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
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

          <View style={styles.recordCard}>
            {currentRecords.length ? (
              currentRecords.map((item, index) => (
                <RecordRow key={item.id} item={item} isLast={index === currentRecords.length - 1} />
              ))
            ) : (
              <Text style={styles.emptyText}>暂无记录</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RecordRow({ item, isLast }) {
  const subtitle = item.time ? `${item.detail} · ${item.time}` : item.detail;
  return (
    <View style={[styles.recordRow, isLast && styles.recordRowLast]}>
      <View style={styles.recordLeft}>
        <Text style={styles.recordTitle}>{item.title}</Text>
        <Text style={styles.recordSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.recordAmount}>{formatAmount(item.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.canvas,
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
    backgroundColor: PALETTE.bubblePink,
  },
  orbTwo: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: PALETTE.bubbleBlue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.ink,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  balanceBlock: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  balanceLabel: {
    marginTop: 6,
    fontSize: 12,
    color: PALETTE.muted,
  },
  rechargeButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.accent,
    backgroundColor: '#fff',
  },
  rechargeText: {
    fontSize: 13,
    color: PALETTE.accentDeep,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#eee5e9',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    color: PALETTE.muted,
  },
  tabTextActive: {
    color: PALETTE.ink,
    fontWeight: '600',
  },
  recordCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    overflow: 'hidden',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0e5e2',
  },
  recordRowLast: {
    borderBottomWidth: 0,
  },
  recordLeft: {
    flex: 1,
    paddingRight: 12,
  },
  recordTitle: {
    fontSize: 12,
    color: PALETTE.ink,
    fontWeight: '600',
  },
  recordSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: PALETTE.muted,
  },
  recordAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.accent,
  },
  emptyText: {
    paddingVertical: 18,
    fontSize: 11,
    color: PALETTE.muted,
    textAlign: 'center',
  },
});
