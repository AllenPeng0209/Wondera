import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings, updateUserSettings } from '../storage/db';

const PALETTE = {
  canvasTop: '#fff6f1',
  canvasBottom: '#f3f4ff',
  card: '#fff',
  ink: '#2f2622',
  muted: '#8f7f7a',
  mutedLight: '#b09f9a',
  line: '#f1e1de',
  chip: '#fff',
  accent: '#d86a83',
  accentDeep: '#c4526b',
  accentSoft: '#fde6ec',
  shadow: '#221c1e',
  bubblePink: 'rgba(255, 204, 215, 0.35)',
  bubbleBlue: 'rgba(198, 210, 255, 0.3)',
};

const FONTS = {
  display: Platform.select({ ios: 'Bodoni 72', android: 'serif' }),
  body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-condensed' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
};

const quickActions = [
  { id: 'profile', label: '个人档案', icon: 'sparkles-outline', action: 'settings' },
  { id: 'wallet', label: '心动币', icon: 'wallet-outline', route: 'Wallet' },
  { id: 'daily', label: '每日任务', icon: 'calendar-outline', route: 'DailyTasks' },
  { id: 'preferences', label: '偏好', icon: 'options-outline', route: 'PreferenceSettings' },
];

const featureTiles = [
  {
    id: 'achievement',
    title: '成就\n系统',
    caption: '徽章墙 · 里程碑',
    icon: 'trophy-outline',
    tone: '#f9ecd8',
    route: 'Achievement',
  },
  {
    id: 'mall',
    title: '商城\n空间',
    caption: '福利兑换 · 送礼',
    icon: 'bag-handle-outline',
    tone: '#fff0e6',
    route: 'MallSpace',
  },
];

const recentFootprints = [
  {
    id: 'footprint-london',
    title: '伦敦 · 雾蓝晨光',
    location: '英国',
    image:
      'https://images.unsplash.com/photo-1473959383414-bddf002a13b4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'footprint-kyoto',
    title: '京都 · 茶庭黄昏',
    location: '日本',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
];

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

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState({ visible: false, field: null, label: '', value: '', type: 'text' });
  const [settingsVisible, setSettingsVisible] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const walletAnim = useRef(new Animated.Value(0)).current;
  const tilesAnim = useRef(new Animated.Value(0)).current;
  const recentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      const record = await getUserSettings();
      setSettings(record);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    Animated.stagger(120, [
      Animated.timing(heroAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(actionsAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(walletAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(tilesAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(recentAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [loading, actionsAnim, heroAnim, recentAnim, tilesAnim, walletAnim]);

  const handleToggle = async (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value ? 1 : 0 }));
    await updateUserSettings({ [field]: value ? 1 : 0 });
  };

  const openEditor = (field, label, value, type = 'text') => {
    setSettingsVisible(false);
    setEditor({ visible: true, field, label, value: value || '', type });
  };

  const closeEditor = () => setEditor({ visible: false, field: null, label: '', value: '', type: 'text' });

  const saveEditor = async () => {
    if (!editor.field) return;
    const payload = { [editor.field]: editor.value };
    await updateUserSettings(payload);
    setSettings((prev) => ({ ...prev, ...payload }));
    closeEditor();
  };

  const handleLogout = async () => {
    await updateUserSettings({ is_logged_in: 0 });
    setSettingsVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={PALETTE.accent} />
      </SafeAreaView>
    );
  }

  const displayName = settings.nickname || '心动旅人';
  const signatureParts = [settings.mbti, settings.zodiac].filter(Boolean);
  const signatureText = signatureParts.length ? signatureParts.join(' · ') : '写一句个性签名';
  const signatureMuted = !signatureParts.length;
  const metaChips = [
    { label: '连续', value: `${settings.streak_current || 0}天` },
    { label: '心动', value: `${settings.affection_points || 0}` },
    { label: 'MBTI', value: settings.mbti || '待定' },
  ];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 6, 8) }]}>
      <LinearGradient
        colors={[PALETTE.canvasTop, PALETTE.canvasBottom]}
        style={styles.backgroundGradient}
        pointerEvents="none"
      />
      <View style={styles.backgroundOrb} pointerEvents="none" />
      <View style={styles.backgroundRing} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.heroCard, buildRevealStyle(heroAnim, 22)]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.2)']}
            style={styles.heroGlow}
            pointerEvents="none"
          />
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: 'https://api.dicebear.com/7.x/lorelei/svg?seed=MOMOMOMO' }}
                style={styles.heroAvatar}
              />
              <View style={styles.avatarRing} />
            </View>
            <View style={styles.heroBody}>
              <View style={styles.heroNameRow}>
                <TouchableOpacity onPress={() => openEditor('nickname', '昵称', settings.nickname)} activeOpacity={0.7}>
                  <Text style={styles.heroName}>{displayName}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBadge}
                  onPress={() => openEditor('nickname', '昵称', settings.nickname)}
                >
                  <Ionicons name="pencil" size={12} color={PALETTE.ink} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.signatureRow} onPress={() => setSettingsVisible(true)} activeOpacity={0.7}>
                <Text style={[styles.heroSignature, signatureMuted && styles.heroSignatureMuted]}>
                  {signatureText}
                </Text>
              </TouchableOpacity>
              <View style={styles.metaRow}>
                {metaChips.map((chip) => (
                  <View key={chip.label} style={styles.metaChip}>
                    <Text style={styles.metaLabel}>{chip.label}</Text>
                    <Text style={styles.metaValue}>{chip.value}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
              <Ionicons name="settings-outline" size={18} color={PALETTE.ink} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[styles.actionsRow, buildRevealStyle(actionsAnim, 18)]}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={() =>
                action.action === 'settings'
                  ? setSettingsVisible(true)
                  : action.route
                    ? navigation.navigate(action.route)
                    : null
              }
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={20} color={PALETTE.accentDeep} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View style={[styles.currencyCard, buildRevealStyle(walletAnim, 18)]}>
          <View>
            <Text style={styles.currencyLabel}>心动币</Text>
            <Text style={styles.currencyValue}>{settings.currency_balance || 0}</Text>
            <Text style={styles.currencyHint}>互动、签到、邀请好友均可获得</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')} activeOpacity={0.9}>
            <LinearGradient colors={['#f8a7bb', '#d86a83']} style={styles.currencyButton}>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={styles.currencyButtonText}>兑换心动币</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.tileRow, buildRevealStyle(tilesAnim, 16)]}>
          {featureTiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tileCard, { backgroundColor: tile.tone }]}
              onPress={() => tile.route && navigation.navigate(tile.route)}
              activeOpacity={0.85}
            >
              <View style={styles.tileHeader}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Ionicons name={tile.icon} size={18} color={PALETTE.muted} />
              </View>
              <Text style={styles.tileCaption}>{tile.caption}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View style={[styles.recentSection, buildRevealStyle(recentAnim, 16)]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近足迹</Text>
            <TouchableOpacity style={styles.sectionLink} onPress={() => navigation.navigate('WorldExplore')}>
              <Text style={styles.sectionLinkText}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={PALETTE.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
            {recentFootprints.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.footprintCard}
                onPress={() => navigation.navigate('WorldExplore')}
                activeOpacity={0.88}
              >
                <ImageBackground source={{ uri: item.image }} style={styles.footprintImage} imageStyle={styles.footprintImg}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.6)']}
                    style={styles.footprintOverlay}
                  >
                    <View style={styles.footprintTag}>
                      <Ionicons name="location-outline" size={12} color="#fff" />
                      <Text style={styles.footprintTagText}>{item.location}</Text>
                    </View>
                    <Text style={styles.footprintTitle}>{item.title}</Text>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onOpenEditor={openEditor}
        onToggle={handleToggle}
        onNavigate={(route) => navigation.navigate(route)}
        onLogout={handleLogout}
        bottomInset={insets.bottom}
      />

      <EditModal
        editor={editor}
        onClose={closeEditor}
        onSave={saveEditor}
        onChangeValue={(value) => setEditor((prev) => ({ ...prev, value }))}
      />
    </SafeAreaView>
  );
}

function SettingsSheet({ visible, onClose, settings, onOpenEditor, onToggle, onNavigate, onLogout, bottomInset }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={styles.sheetOverlay} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>设置</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>快捷入口</Text>
              {quickActions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.sheetRow}
                  onPress={() =>
                    item.action === 'settings'
                      ? onOpenEditor('nickname', '昵称', settings.nickname)
                      : item.route
                        ? onNavigate(item.route)
                        : null
                  }
                  activeOpacity={item.route || item.action === 'settings' ? 0.8 : 1}
                >
                  <View style={styles.sheetRowLeft}>
                    <View style={styles.sheetIcon}>
                      <Ionicons name={item.icon} size={16} color={PALETTE.accentDeep} />
                    </View>
                    <Text style={styles.sheetRowLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={PALETTE.mutedLight} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>个人设置</Text>
              <SettingField
                label="昵称"
                value={settings.nickname || '未设置'}
                onPress={() => onOpenEditor('nickname', '昵称', settings.nickname)}
              />
              <SettingField
                label="性别"
                value={settings.gender || '保密'}
                onPress={() => onOpenEditor('gender', '性别', settings.gender || '保密', 'gender')}
              />
              <ToggleField
                label="置顶聊天"
                value={Boolean(settings.pin_chat)}
                onValueChange={(value) => onToggle('pin_chat', value)}
              />
              <ToggleField
                label="对话记忆"
                value={Boolean(settings.memory_enabled)}
                onValueChange={(value) => onToggle('memory_enabled', value)}
              />
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.9}>
              <Ionicons name="exit-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SettingField({ label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.fieldRow} onPress={onPress} activeOpacity={0.8}>
      <View>
        <Text style={styles.fieldLabel}>{label || ''}</Text>
        <Text style={styles.fieldValue}>{value || ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={PALETTE.mutedLight} />
    </TouchableOpacity>
  );
}

function ToggleField({ label, value, onValueChange }) {
  return (
    <View style={styles.fieldRow}>
      <View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? PALETTE.accent : '#f2f2f2'}
        trackColor={{ false: '#ece2e4', true: '#fde6ec' }}
      />
    </View>
  );
}

function EditModal({ editor, onClose, onSave, onChangeValue }) {
  if (!editor.visible) return null;

  return (
    <Modal transparent animationType="fade" visible={editor.visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>编辑{editor.label}</Text>
          {editor.type === 'gender' ? (
            <View style={styles.genderRow}>
              {['男', '女', '保密'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.genderChip, editor.value === option && styles.genderChipActive]}
                  onPress={() => onChangeValue(option)}
                >
                  <Text style={[styles.genderText, editor.value === option && styles.genderTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              autoFocus
              style={styles.modalInput}
              value={editor.value}
              placeholder={`请输入${editor.label}`}
              placeholderTextColor={PALETTE.mutedLight}
              onChangeText={onChangeValue}
            />
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}>
              <Text style={styles.modalButtonTextSecondary}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={onSave}>
              <Text style={styles.modalButtonTextPrimary}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.canvasBottom,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOrb: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: PALETTE.bubblePink,
  },
  backgroundRing: {
    position: 'absolute',
    bottom: 120,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(198, 210, 255, 0.55)',
    opacity: 0.85,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 96,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.line,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: '#fff4f6',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarRing: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f5b0c2',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroBody: {
    flex: 1,
    marginLeft: 14,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 20,
    color: PALETTE.ink,
    fontFamily: FONTS.display,
  },
  editBadge: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.chip,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  signatureRow: {
    marginTop: 6,
  },
  heroSignature: {
    fontSize: 13,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  heroSignatureMuted: {
    color: PALETTE.mutedLight,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PALETTE.chip,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  metaLabel: {
    fontSize: 10,
    color: PALETTE.mutedLight,
    fontFamily: FONTS.body,
  },
  metaValue: {
    fontSize: 12,
    color: PALETTE.ink,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.chip,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.line,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 12,
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  currencyCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyLabel: {
    fontSize: 12,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  currencyValue: {
    fontSize: 26,
    color: PALETTE.ink,
    fontFamily: FONTS.display,
    marginTop: 4,
  },
  currencyHint: {
    fontSize: 10,
    color: PALETTE.mutedLight,
    fontFamily: FONTS.body,
    marginTop: 4,
  },
  currencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  tileRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  tileCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tileTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: PALETTE.ink,
    fontFamily: FONTS.display,
  },
  tileCaption: {
    fontSize: 12,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  recentSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: PALETTE.ink,
    fontFamily: FONTS.display,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLinkText: {
    fontSize: 12,
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  recentScroll: {
    paddingRight: 8,
  },
  footprintCard: {
    width: 220,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  footprintImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  footprintImg: {
    borderRadius: 20,
  },
  footprintOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  footprintTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  footprintTagText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONTS.body,
  },
  footprintTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.display,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(52, 41, 54, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#e7d8de',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    color: PALETTE.ink,
    fontFamily: FONTS.display,
    marginBottom: 12,
  },
  sheetSection: {
    marginBottom: 18,
  },
  sheetSectionTitle: {
    fontSize: 12,
    color: PALETTE.mutedLight,
    fontFamily: FONTS.body,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  sheetRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.chip,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  sheetRowLabel: {
    fontSize: 14,
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  fieldLabel: {
    fontSize: 12,
    color: PALETTE.mutedLight,
    fontFamily: FONTS.body,
  },
  fieldValue: {
    marginTop: 4,
    fontSize: 15,
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  logoutButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: PALETTE.ink,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: FONTS.body,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: PALETTE.ink,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: PALETTE.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 18,
    color: PALETTE.ink,
    fontFamily: FONTS.body,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    marginRight: 10,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PALETTE.ink,
    alignItems: 'center',
    marginLeft: 10,
  },
  modalButtonTextSecondary: {
    color: PALETTE.muted,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.line,
    alignItems: 'center',
    backgroundColor: PALETTE.chip,
  },
  genderChipActive: {
    backgroundColor: PALETTE.accentSoft,
    borderColor: PALETTE.accent,
  },
  genderText: {
    color: PALETTE.muted,
    fontFamily: FONTS.body,
  },
  genderTextActive: {
    color: PALETTE.accentDeep,
    fontWeight: '600',
    fontFamily: FONTS.body,
  },
});
