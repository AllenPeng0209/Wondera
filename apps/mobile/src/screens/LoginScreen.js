import React from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateUserSettings } from '../storage/db';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const goEmailLogin = () => navigation.navigate('LoginEmail');
  const goRegister = () => navigation.navigate('Register');

  const handleGuest = async () => {
    await updateUserSettings({ is_logged_in: 1 });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/icon.png')}
        style={styles.bgPattern}
        imageStyle={styles.bgImage}
        resizeMode="contain"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>欢迎回来</Text>
            <Text style={styles.subtitle}>登录后同步你的心动聊天与词库</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.primaryBtn} onPress={goEmailLogin}>
              <Ionicons name="mail-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryText}>使用邮箱登录</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={goRegister}>
              <Ionicons name="person-add-outline" size={18} color="#c24d72" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryText}>注册新账号</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={handleGuest}>
              <Text style={styles.linkText}>先随便逛逛（游客模式）</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff6fa',
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
  },
  bgImage: {
    width: 360,
    height: 360,
    alignSelf: 'center',
    tintColor: '#f7c9d7',
    transform: [{ rotate: '-12deg' }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    marginTop: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2f2f2f',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#7a7a7a',
  },
  card: {
    marginTop: 48,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: '#ffe1ec',
  },
  primaryBtn: {
    backgroundColor: '#f093a4',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f2d4de',
  },
  secondaryText: {
    color: '#c24d72',
    fontWeight: '700',
    fontSize: 15,
  },
  linkBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#7a7a7a',
    fontSize: 13,
  },
});
