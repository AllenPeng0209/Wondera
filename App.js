import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ChatListScreen from './src/screens/ChatListScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import { initDatabase } from './src/storage/db';

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Database init failed', error);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#f093a4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={ChatListScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
