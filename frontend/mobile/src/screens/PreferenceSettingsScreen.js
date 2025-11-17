import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserSettings, updateUserSettings } from '../storage/db';

export default function PreferenceSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getUserSettings();
      setSettings(data);
    }
    load();
  }, []);

  const handleToggle = async (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value ? 1 : 0 }));
    await updateUserSettings({ [field]: value ? 1 : 0 });
  };

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text>加载中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>聊天偏好设置</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <PreferenceToggle
            label="聊天气泡设置"
            description="自定义聊天界面气泡样式"
            value={settings.bubble_style === 'custom'}
            onToggle={(val) => {
              setSettings((prev) => ({ ...prev, bubble_style: val ? 'custom' : 'default' }));
              updateUserSettings({ bubble_style: val ? 'custom' : 'default' });
            }}
          />
          <View style={styles.separator} />
          <PreferenceToggle
            label="沉浸式角色互动"
            description="角色在主界面发起互动，也可主动联系好友传递心动"
            value={Boolean(settings.immersive_mode)}
            onToggle={(val) => handleToggle('immersive_mode', val)}
          />
          <View style={styles.separator} />
          <PreferenceToggle
            label="向上滚动触发回复"
            description="开启后，向上滚动聊天会自动发送回复"
            value={Boolean(settings.swipe_reply)}
            onToggle={(val) => handleToggle('swipe_reply', val)}
          />
          <View style={styles.separator} />
          <PreferenceToggle
            label="等我说完再回复"
            description="AI 会在你停止输入后等待数秒再回复"
            value={Boolean(settings.wait_to_reply)}
            onToggle={(val) => handleToggle('wait_to_reply', val)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceToggle({ label, description, value, onToggle }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onToggle(!value)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={[styles.toggleButton, value && styles.toggleButtonActive]}>
        <View style={[styles.toggleCircle, value && styles.toggleCircleActive]} />
      </View>
    </TouchableOpacity>
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
    marginBottom: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f1d7de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    color: '#b0a4af',
  },
  separator: {
    height: 1,
    backgroundColor: '#f4f4f4',
  },
  toggleButton: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eee',
    padding: 3,
  },
  toggleButtonActive: {
    backgroundColor: '#ffd5e3',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#f093a4',
  },
});
