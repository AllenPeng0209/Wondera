import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserSettings, updateUserSettings } from '../storage/db';

const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
const zodiacOptions = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState('');
  const [mbti, setMbti] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getUserSettings();
      if (settings?.nickname) setNickname(settings.nickname);
      if (settings?.mbti) setMbti(settings.mbti);
      if (settings?.zodiac) setZodiac(settings.zodiac);
      if (settings?.birthday) setBirthday(settings.birthday);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!nickname.trim() || !mbti.trim() || !zodiac.trim() || !birthday.trim()) {
      Alert.alert('请补全信息', '昵称、MBTI、星座、生日都需要填写哦');
      return;
    }

    setLoading(true);
    try {
      await updateUserSettings({
        nickname: nickname.trim(),
        mbti: mbti.trim().toUpperCase(),
        zodiac: zodiac.trim(),
        birthday: birthday.trim(),
        onboarding_done: 1,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      Alert.alert('保存失败', error?.message || '写入本地数据时出错');
    } finally {
      setLoading(false);
    }
  };

  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>先留下一点你的信息</Text>
          <Text style={styles.subtitle}>让 Ta 聊天时更懂你</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>你想被怎么称呼？</Text>
          <TextInput
            style={styles.input}
            placeholder="昵称"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>MBTI</Text>
          <View style={styles.chipRow}>
            {mbtiOptions.map((item) => {
              const active = mbti.toUpperCase() === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setMbti(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="也可以手动输入 MBTI"
            value={mbti}
            onChangeText={setMbti}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>星座</Text>
          <View style={styles.chipRow}>
            {zodiacOptions.map((item) => {
              const active = zodiac === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chipSmall, active && styles.chipActive]}
                  onPress={() => setZodiac(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>生日</Text>
          <TextInput
            style={styles.input}
            placeholder="例如 1998-07-25"
            value={birthday}
            onChangeText={setBirthday}
            autoCapitalize="none"
          />

          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={16} color="#c24d72" />
            <Text style={styles.hintText}>这些资料仅保存在本地，用于让对话更贴近你的个性。</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>开始聊天</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6fa',
  },
  content: {
    paddingHorizontal: 18,
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2f2f2f',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#7a7a7a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#ffe1ec',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c24d72',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f5d7e2',
    backgroundColor: '#fffafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f2d4de',
    backgroundColor: '#fff',
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f2d4de',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#ffe1ec',
    borderColor: '#f093a4',
  },
  chipText: {
    fontSize: 12,
    color: '#6f6f6f',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#c24d72',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#7a7a7a',
    flex: 1,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#f093a4',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
