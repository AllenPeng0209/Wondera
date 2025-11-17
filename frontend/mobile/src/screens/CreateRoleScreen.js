import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createRoleWithConversation } from '../storage/db';

export default function CreateRoleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('心动新角色');
  const [title, setTitle] = useState('浪漫陪伴');
  const [persona, setPersona] = useState('温柔体贴，擅长聆听与共鸣。');
  const [greeting, setGreeting] = useState('嗨，很高兴遇见你，从现在开始由我陪你。');
  const [mood, setMood] = useState('想你');
  const [scriptLines, setScriptLines] = useState('记得提醒他早点休息\n多夸夸他，给他安全感');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请填写昵称');
      return;
    }
    const scriptArray = scriptLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const result = await createRoleWithConversation({
      name: name.trim(),
      title: title.trim(),
      persona: persona.trim(),
      greeting: greeting.trim(),
      mood: mood.trim(),
      scriptLines: scriptArray,
    });
    navigation.replace('Conversation', { conversationId: result.conversationId });
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新建角色</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          <LabeledInput label="昵称" value={name} onChangeText={setName} placeholder="输入角色昵称" />
          <LabeledInput label="身份标签" value={title} onChangeText={setTitle} placeholder="如：温柔医生" />
          <LabeledInput label="心情状态" value={mood} onChangeText={setMood} placeholder="如：想你" />
        </View>

        <View style={styles.sectionCard}>
          <LabeledTextarea
            label="角色设定"
            value={persona}
            onChangeText={setPersona}
            placeholder="描述角色的性格、背景和行为特征"
          />
          <View style={styles.separator} />
          <LabeledTextarea
            label="开场白"
            value={greeting}
            onChangeText={setGreeting}
            placeholder="Ta见到你时会说什么"
          />
          <View style={styles.separator} />
          <LabeledTextarea
            label="剧本提示"
            value={scriptLines}
            onChangeText={setScriptLines}
            placeholder="每行一句，用于指导 AI 回复的提示"
          />
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>创建并开始聊天</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c9b4bd"
      />
    </View>
  );
}

function LabeledTextarea({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.textarea}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c9b4bd"
        multiline
      />
    </View>
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
    paddingBottom: 40,
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
  inputBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b5f67',
    marginBottom: 6,
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#333',
  },
  textarea: {
    borderRadius: 16,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 90,
    color: '#333',
    textAlignVertical: 'top',
  },
  separator: {
    height: 1,
    backgroundColor: '#f4f4f4',
    marginVertical: 12,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: '#f093a4',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
