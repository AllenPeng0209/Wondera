import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserSettings, updateUserSettings } from '../storage/db';

const providers = ['Dreamate Cloud', 'Chatbox AI', '自定义'];

export default function ApiSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getUserSettings();
      setSettings(data);
    }
    load();
  }, []);

  const handleSave = async () => {
    await updateUserSettings({
      api_provider: settings.api_provider,
      api_key: settings.api_key,
      api_model: settings.api_model,
      api_mode: settings.api_mode,
    });
    Alert.alert('已保存', 'API 设置已更新');
    navigation.goBack();
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
        <Text style={styles.headerTitle}>API 设置</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.label}>模型提供方</Text>
          <View style={styles.segmentGroup}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider}
                style={[styles.segmentButton, settings.api_provider === provider && styles.segmentButtonActive]}
                onPress={() => setSettings((prev) => ({ ...prev, api_provider: provider }))}
              >
                <Text style={[styles.segmentText, settings.api_provider === provider && styles.segmentTextActive]}>
                  {provider}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 16 }]}>API Key</Text>
          <TextInput
            style={styles.input}
            value={settings.api_key || ''}
            placeholder="sk-xxxxxxxx"
            onChangeText={(text) => setSettings((prev) => ({ ...prev, api_key: text }))}
          />
          <Text style={[styles.label, { marginTop: 16 }]}>模型</Text>
          <TextInput
            style={styles.input}
            value={settings.api_model || ''}
            placeholder="选择模型"
            onChangeText={(text) => setSettings((prev) => ({ ...prev, api_model: text }))}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.label}>聊天服务调用模式</Text>
          <View style={styles.segmentGroup}>
            {[
              { id: 'wallet', label: '使用学习币额度' },
              { id: 'api', label: '使用自有 API' },
            ].map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.segmentButton, settings.api_mode === mode.id && styles.segmentButtonActive]}
                onPress={() => setSettings((prev) => ({ ...prev, api_mode: mode.id }))}
              >
                <Text style={[styles.segmentText, settings.api_mode === mode.id && styles.segmentTextActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
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
  label: {
    fontSize: 14,
    color: '#6b5f67',
    fontWeight: '500',
    marginBottom: 6,
  },
  segmentGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1cbd4',
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  segmentButtonActive: {
    backgroundColor: '#ffe3ea',
    borderColor: '#f093a4',
  },
  segmentText: {
    color: '#c19aa5',
  },
  segmentTextActive: {
    color: '#f093a4',
    fontWeight: '600',
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#333',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#f093a4',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
