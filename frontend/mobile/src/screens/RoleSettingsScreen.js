import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getRoleSettings,
  updateRoleSettings,
  clearConversationMessages,
} from '../storage/db';

export default function RoleSettingsScreen({ navigation, route }) {
  const { roleId, conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getRoleSettings(roleId);
      setSettings({
        nickname: data.nickname_override || '',
        gender: data.gender || '保密',
        chatBackground: data.chat_background || '#ffeef2',
        pinChat: Boolean(data.pin_chat),
        voicePreset: data.voice_preset || '未设置',
        memoryLimit: data.memory_limit || 10,
        autoSummary: Boolean(data.auto_summary),
        allowEmoji: Boolean(data.allow_emoji),
        allowKnock: Boolean(data.allow_knock),
        maxReplies: data.max_replies || 5,
        personaNote: data.persona_note || '',
        expressionStyle: data.expression_style || '',
        catchphrase: data.catchphrase || '',
        userPersonality: data.user_personality || '',
      });
      setLoading(false);
    }
    load();
  }, [roleId]);

  const handleSave = async () => {
    if (!settings) return;
    await updateRoleSettings(roleId, {
      nickname_override: settings.nickname,
      gender: settings.gender,
      chat_background: settings.chatBackground,
      pin_chat: settings.pinChat ? 1 : 0,
      voice_preset: settings.voicePreset,
      memory_limit: settings.memoryLimit,
      auto_summary: settings.autoSummary ? 1 : 0,
      allow_emoji: settings.allowEmoji ? 1 : 0,
      allow_knock: settings.allowKnock ? 1 : 0,
      max_replies: settings.maxReplies,
      persona_note: settings.personaNote,
      expression_style: settings.expressionStyle,
      catchphrase: settings.catchphrase,
      user_personality: settings.userPersonality,
    });
    navigation.goBack();
  };

  const handleClear = () => {
    Alert.alert('清空聊天记录', '确定要删除该角色的全部聊天记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          await clearConversationMessages(conversationId);
          Alert.alert('已清空', '聊天记录已清空');
        },
      },
    ]);
  };

  const handleReport = () => {
    Alert.alert('举报', '已收到你的反馈，我们会尽快处理。');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>聊天设置</Text>
        <TouchableOpacity style={styles.memoryButton}>
          <Text style={styles.memoryText}>Ta的记忆</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Ionicons name="paw-outline" size={30} color="#f093a4" />
          </View>
          <View style={styles.basicFields}>
            <BasicInput
              label="昵称"
              value={settings.nickname}
              placeholder="输入昵称"
              onChangeText={(text) => setSettings((prev) => ({ ...prev, nickname: text }))}
            />
            <SegmentedRow
              label="性别"
              options={['男', '女', '保密']}
              value={settings.gender}
              onChange={(value) => setSettings((prev) => ({ ...prev, gender: value }))}
            />
            <ColorPickerRow
              label="聊天背景"
              options={[ '#ffeef2', '#f3f0ff', '#fff5e6' ]}
              value={settings.chatBackground}
              onChange={(value) => setSettings((prev) => ({ ...prev, chatBackground: value }))}
            />
            <ToggleRow
              label="置顶聊天"
              description="开启后该角色会置顶"
              value={settings.pinChat}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, pinChat: value }))}
            />
            <View style={styles.voiceRow}>
              <Text style={styles.label}>Ta的声音</Text>
              <Text style={styles.voiceValue}>{settings.voicePreset}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>对话记忆设置</Text>
          <CounterRow
            label="对话记忆条数"
            value={settings.memoryLimit}
            onChange={(value) => setSettings((prev) => ({ ...prev, memoryLimit: Math.max(3, Math.min(30, value)) }))}
          />
          <View style={styles.separator} />
          <ToggleRow
            label="自动总结"
            description="开启后自动为角色总结记忆"
            value={settings.autoSummary}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, autoSummary: value }))}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>角色设定</Text>
          <ToggleRow
            label="允许发送表情包"
            value={settings.allowEmoji}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, allowEmoji: value }))}
            description="开启后角色可以发送表情增强趣味性"
          />
          <View style={styles.separator} />
          <ToggleRow
            label="允许拍一拍"
            value={settings.allowKnock}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, allowKnock: value }))}
            description="开启后角色可以发送拍一拍进行亲密互动"
          />
          <View style={styles.separator} />
          <CounterRow
            label="最多回复条数"
            value={settings.maxReplies}
            onChange={(value) => setSettings((prev) => ({ ...prev, maxReplies: Math.max(1, Math.min(20, value)) }))}
          />
          <View style={styles.separator} />
          <TextareaRow
            label="人设定"
            placeholder="设置角色的性格、背景和行为特征，让Ta更像真人"
            value={settings.personaNote}
            onChangeText={(text) => setSettings((prev) => ({ ...prev, personaNote: text }))}
          />
        </View>

        <View style={styles.sectionCard}>
          <TextareaRow
            label="表达风格"
            placeholder="角色的语言节奏和说话方式"
            value={settings.expressionStyle}
            onChangeText={(text) => setSettings((prev) => ({ ...prev, expressionStyle: text }))}
          />
          <View style={styles.separator} />
          <TextareaRow
            label="习惯用语"
            placeholder="设置角色常用的敲敲小句或口头禅"
            value={settings.catchphrase}
            onChangeText={(text) => setSettings((prev) => ({ ...prev, catchphrase: text }))}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>我的人设</Text>
          <TextareaRow
            label="个人性格描述"
            placeholder="描述你自己的性格特点，帮助角色更好地了解你"
            value={settings.userPersonality}
            onChangeText={(text) => setSettings((prev) => ({ ...prev, userPersonality: text }))}
          />
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>清空聊天记录</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
          <Text style={styles.reportButtonText}>举报</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, description, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? '#f093a4' : '#f2f2f2'}
        trackColor={{ false: '#e3e3e3', true: '#ffd9e4' }}
      />
    </View>
  );
}

function CounterRow({ label, value, onChange }) {
  return (
    <View style={styles.counterRow}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>设置角色一次最多回复几条消息</Text>
      </View>
      <View style={styles.counterControls}>
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() => onChange(Math.max(1, value - 1))}
        >
          <Ionicons name="remove" size={16} color="#f093a4" />
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() => onChange(Math.min(20, value + 1))}
        >
          <Ionicons name="add" size={16} color="#f093a4" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TextareaRow({ label, placeholder, value, onChangeText }) {
  return (
    <View style={styles.textareaRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.textarea}
        placeholder={placeholder}
        placeholderTextColor="#d0a4b1"
        multiline
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function BasicInput({ label, value, placeholder, onChangeText }) {
  return (
    <View style={styles.basicInputRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.basicInput}
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        placeholderTextColor="#c9b4bd"
      />
    </View>
  );
}

function SegmentedRow({ label, options, value, onChange }) {
  return (
    <View style={styles.segmentRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentGroup}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.segmentButton, value === option && styles.segmentButtonActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ColorPickerRow({ label, options, value, onChange }) {
  return (
    <View style={styles.colorRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.colorChips}>
        {options.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.colorChip, { backgroundColor: color }, value === color && styles.colorChipActive]}
            onPress={() => onChange(color)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef6f8',
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
  memoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffdce6',
  },
  memoryText: {
    color: '#f093a4',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffe0ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  basicFields: {
    flex: 1,
  },
  basicInputRow: {
    marginBottom: 12,
  },
  basicInput: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
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
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1b8c4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    width: 32,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#f093a4',
  },
  textareaRow: {
    paddingVertical: 12,
  },
  textarea: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#fff0f4',
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#333',
  },
  segmentRow: {
    marginBottom: 12,
  },
  segmentGroup: {
    flexDirection: 'row',
    marginTop: 8,
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
  colorRow: {
    marginBottom: 12,
  },
  colorChips: {
    flexDirection: 'row',
    marginTop: 8,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipActive: {
    borderColor: '#f093a4',
  },
  voiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  voiceValue: {
    color: '#b0a4af',
  },
  clearButton: {
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#ffb3c1',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reportButton: {
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#ffecef',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportButtonText: {
    color: '#f093a4',
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: '#f093a4',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
