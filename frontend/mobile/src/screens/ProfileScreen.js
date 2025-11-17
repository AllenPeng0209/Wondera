import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings, updateUserSettings } from '../storage/db';

const quickLinks = [
  { id: 'wallet', label: '心动币钱包', icon: 'wallet-outline' },
  { id: 'api', label: 'API 设置', icon: 'code-outline' },
  { id: 'bias', label: '聊天偏好设置', icon: 'options-outline' },
  { id: 'backup', label: '聊天记录备份', icon: 'cloud-upload-outline' },
  { id: 'feedback', label: '功能许愿和反馈', icon: 'chatbubble-ellipses-outline' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const record = await getUserSettings();
      setSettings(record);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = async (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value ? 1 : 0 }));
    await updateUserSettings({ [field]: value ? 1 : 0 });
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator color="#f093a4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#ffeef2", "#fff"]} style={styles.heroCard}>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={20} color="#f093a4" />
          </TouchableOpacity>
          <Image
            source={{ uri: 'https://i.pravatar.cc/200?img=65' }}
            style={styles.heroAvatar}
          />
          <Text style={styles.heroName}>{settings.nickname || '心动旅人'}</Text>
          <TouchableOpacity style={styles.statusButton}>
            <Ionicons name="heart-outline" size={14} color="#f093a4" />
            <Text style={styles.statusText}>+ 状态</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.section}>
          {quickLinks.map((item) => (
            <TouchableOpacity key={item.id} style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={18} color="#f093a4" />
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d1d1" />
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient colors={["#fff8ec", "#ffe7d1"]} style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>免费领取心动币！</Text>
            <Text style={styles.bannerDesc}>邀请好友、或发小红书笔记得次数奖励</Text>
            <Text style={styles.bannerBalance}>当前余额：{settings.currency_balance} 枚</Text>
          </View>
          <Ionicons name="gift" size={32} color="#f7a26a" />
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本设置</Text>
          <SettingField label="昵称" value={settings.nickname || '未设置'} />
          <View style={styles.separator} />
          <SettingField label="性别" value={settings.gender || '保密'} />
          <View style={styles.separator} />
          <ToggleField
            label="置顶聊天"
            value={Boolean(settings.pin_chat)}
            onValueChange={(value) => handleToggle('pin_chat', value)}
          />
          <View style={styles.separator} />
          <ToggleField
            label="对话记忆"
            value={Boolean(settings.memory_enabled)}
            onValueChange={(value) => handleToggle('memory_enabled', value)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingField({ label, value }) {
  return (
    <View style={styles.fieldRow}>
      <View>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d1d1" />
    </View>
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
        thumbColor={value ? '#f093a4' : '#f1f1f1'}
        trackColor={{ false: '#e2e2e2', true: '#ffd4e0' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 8,
  },
  heroAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 12,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  statusButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffeaf0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    color: '#f093a4',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  banner: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0854b',
  },
  bannerDesc: {
    fontSize: 13,
    color: '#f0854b',
    marginTop: 4,
  },
  bannerBalance: {
    marginTop: 8,
    fontSize: 14,
    color: '#f0854b',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#595959',
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  fieldValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f3f3',
  },
});
