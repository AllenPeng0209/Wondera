import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ChatListScreen from './src/screens/ChatListScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RoleSettingsScreen from './src/screens/RoleSettingsScreen';
import CreateRoleScreen from './src/screens/CreateRoleScreen';
import WalletScreen from './src/screens/WalletScreen';
import ApiSettingsScreen from './src/screens/ApiSettingsScreen';
import PreferenceSettingsScreen from './src/screens/PreferenceSettingsScreen';
import VoiceCallScreen from './src/screens/VoiceCallScreen';
import VocabScreen from './src/screens/VocabScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import LoginEmailScreen from './src/screens/LoginEmailScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DailyTheaterScreen from './src/screens/DailyTheaterScreen';
import { initDatabase, getUserSettings } from './src/storage/db';
import { requestNotificationPermissions } from './src/services/notifications';
import { registerAiKnockBackgroundTask, runAiKnockOnce } from './src/background/aiKnockTask';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#fff',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#f093a4',
        tabBarInactiveTintColor: '#b5b5b5',
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#f0f0f0',
          paddingVertical: 6,
          height: 70,
          backgroundColor: '#fff',
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            Messages: 'chatbubble-ellipses-outline',
            Theater: 'film-outline',
            Vocab: 'book-outline',
            Profile: 'person-circle-outline',
          };
          return <Ionicons name={iconMap[route.name]} color={color} size={size} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Messages" component={ChatListScreen} options={{ title: '消息' }} />
      <Tab.Screen name="Theater" component={DailyTheaterScreen} options={{ title: '剧场' }} />
      <Tab.Screen name="Vocab" component={VocabScreen} options={{ title: '词库' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const settings = await getUserSettings();
        const missingProfile = !settings?.onboarding_done || !settings?.nickname || !settings?.mbti || !settings?.zodiac || !settings?.birthday;
        const needsLogin = settings?.is_logged_in === 0;
        const route = needsLogin ? 'Login' : missingProfile ? 'Onboarding' : 'Home';
        setInitialRoute(route);
        // 初始化本地通知 & 后台任务，让 AI 能在后台“拍一拍”
        const granted = await requestNotificationPermissions();
        if (!granted) {
          console.log('[App] Notification permission not granted');
        }
        await registerAiKnockBackgroundTask();

        // 开发环境下，为了方便在模拟器上验证“AI 主动发消息”，
        // 启动后 5 秒自动触发一次后台拍一拍逻辑（传 0 忽略时间窗口）
        if (__DEV__) {
          setTimeout(() => {
            runAiKnockOnce(0);
          }, 5000);
        }
      } catch (error) {
        console.error('Database init failed', error);
        if (!initialRoute) {
          setInitialRoute('Home');
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#f093a4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="LoginEmail" component={LoginEmailScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home" component={MainTabs} />
            <Stack.Screen name="Discover" component={DiscoverScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="RoleSettings" component={RoleSettingsScreen} />
            <Stack.Screen name="CreateRole" component={CreateRoleScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="ApiSettings" component={ApiSettingsScreen} />
            <Stack.Screen name="PreferenceSettings" component={PreferenceSettingsScreen} />
            <Stack.Screen
              name="VoiceCall"
              component={VoiceCallScreen}
              options={{
                headerShown: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
