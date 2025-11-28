import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import {
  useMicrophonePermissions,
  initialize,
  playPCMData,
  toggleRecording,
  useExpoTwoWayAudioEventListener,
} from '@speechmatics/expo-two-way-audio';
import { getRoleImage } from '../data/images';

// WebSocket URL generator for Qwen-Omni Realtime API
// React Native WebSocket doesn't support custom headers in constructor
const getWebSocketURL = () => {
  // ⚠️ 注意：如果你是在海外（或者 Key 是国际站申请的），
  // 请将下方域名改为 'dashscope-intl.aliyuncs.com'
  const isInternational = false; // 如果报错 401 依然存在，尝试改为 true
  
  const host = isInternational 
    ? 'dashscope-intl.aliyuncs.com' 
    : 'dashscope.aliyuncs.com';
    
  return `wss://${host}/api-ws/v1/realtime?model=qwen-omni-turbo`;
};

export default function VoiceCallScreen({ route, navigation }) {
  // Extract character context from navigation params
  const { characterId, characterName, characterAvatar, characterPersona } = route.params || {};

  // Audio permissions
  const [permission, requestPermission] = useMicrophonePermissions();

  // Local state
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [connectionState, setConnectionState] = useState('idle'); // idle, connecting, connected, error
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const socketRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  // Parameter validation - go back if required params are missing
  useEffect(() => {
    if (!characterId || !characterName) {
      console.error('VoiceCallScreen: Missing required character params');
      Alert.alert('Error', 'Missing character information', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }
  }, [characterId, characterName, navigation]);

  // Initialize audio engine and request permissions
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request microphone permission
        if (!permission?.granted) {
          const status = await requestPermission();
          if (!status.granted) {
            Alert.alert(
              'Microphone Permission Required',
              'Please allow microphone access to use voice chat.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }
        }

        // Initialize Speechmatics audio engine (enables AEC)
        await initialize();
        setAudioInitialized(true);
        console.log('✅ Audio Engine Initialized');
      } catch (err) {
        console.error('❌ Audio Init Failed:', err);
        Alert.alert('Error', 'Failed to initialize audio system', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    };

    setupAudio();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [permission, navigation]);

  // Start WebSocket connection and call timer when audio is ready
  useEffect(() => {
    if (audioInitialized && connectionState === 'idle') {
      startCall();
    }
  }, [audioInitialized]);

  // Microphone data listener - forwards PCM audio to Qwen
  useExpoTwoWayAudioEventListener(
    'onMicrophoneData',
    useCallback(
      (event) => {
        // Only send if connected and not muted
        if (
          socketRef.current?.readyState === WebSocket.OPEN &&
          connectionState === 'connected' &&
          !isMuted
        ) {
          try {
            socketRef.current.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: event.data, // Base64 PCM from library
              })
            );
          } catch (err) {
            console.error('Failed to send audio:', err);
          }
        }
      },
      [connectionState, isMuted]
    )
  );

  // Start call - establish WebSocket connection
  const startCall = async () => {
    if (connectionState === 'connected' || connectionState === 'connecting') {
      return;
    }

    setConnectionState('connecting');

    try {
      // Get API key from environment
      const apiKey = process.env.EXPO_PUBLIC_BAILIAN_API_KEY;
      if (!apiKey) throw new Error('API key missing');

      console.log('[VoiceCall] Connecting to Qwen WebSocket...');

      const wsUrl = getWebSocketURL();
      
      // ✅ 修复：React Native 允许在第3个参数传 Headers
      // 官方文档明确要求使用 Authorization: Bearer <Key>
      const ws = new WebSocket(wsUrl, null, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      // Connection opened
      ws.onopen = () => {
        console.log('✅ WebSocket Connected');
        setConnectionState('connected');

        // Configure session with character context
        // Simple prompt: Tell AI who it is
        const systemprompt = characterPersona
          ? `You are ${characterName}, a helpful conversational agent.`
          : `You are ${characterName}. You are having a voice conversation with the user.`;
        
        console.log(systemprompt)

        ws.send(JSON.stringify({
            type: 'session.update',
            session: { 
              modalities: ['audio', 'text'],
              voice: 'Cherry',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
            input: {
              messages: [
                {
                  role: 'system',
                  content: systemprompt
                }
              ]
            }
          }));


        // Start recording
        toggleRecording(true);

        // Start call timer
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);

        console.log('Voice call started:', { characterId, characterName });
      };

      // Receive messages from server
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // AI audio response
          if (msg.type === 'response.audio.delta') {
            setIsAISpeaking(true);

            // Convert Base64 to Uint8Array for playback
            const buffer = Buffer.from(msg.delta, 'base64');
            const pcmData = new Uint8Array(buffer);

            // Play audio through speaker (with AEC)
            if (isSpeakerOn) {
              playPCMData(pcmData);
            }
          }
          // AI finished speaking
          else if (msg.type === 'response.audio.done') {
            setIsAISpeaking(false);
          }
          // User started speaking (interruption detected)
          else if (msg.type === 'input_audio_buffer.speech_started') {
            console.log('User speech detected');
            setIsAISpeaking(false);
          }
          // User stopped speaking
          else if (msg.type === 'input_audio_buffer.speech_stopped') {
            console.log('User speech ended');
          }
          // Session created confirmation
          else if (msg.type === 'session.created') {
            console.log('Session created:', msg.session);
          }
          // Session updated confirmation
          else if (msg.type === 'session.updated') {
            console.log('Session updated');
          }
          // Error handling
          else if (msg.type === 'error') {
            console.error('Qwen API Error:', msg.error);
            Alert.alert('Voice Chat Error', msg.error?.message || 'An error occurred');
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      // Connection error
      ws.onerror = (error) => {
        // Print detailed error (React Native WS error events are often empty)
        console.error('WebSocket Error Raw:', error);
        console.error('WebSocket Error Type:', typeof error);
        console.error('WebSocket Error Keys:', Object.keys(error || {}));
        setConnectionState('error');
        Alert.alert('Connection Error', 'Failed to connect. Check Network/API Key.', [
          { text: 'Retry', onPress: () => startCall() },
          { text: 'Cancel', onPress: () => handleEndCall() },
        ]);
      };

      // Connection closed
      ws.onclose = (e) => {
        console.log('WebSocket Closed:', e.code, e.reason);
        console.log('WebSocket Close Event:', JSON.stringify(e, null, 2));
        if (!isCleaningUpRef.current) {
          setConnectionState('idle');
        }
      };

      socketRef.current = ws;
    } catch (err) {
      console.error('Failed to start call:', err);
      setConnectionState('error');
      Alert.alert('Error', err.message || 'Failed to start voice call', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  // Cleanup resources
  const cleanup = () => {
    isCleaningUpRef.current = true;

    // Stop recording
    try {
      toggleRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }

    // Close WebSocket
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (err) {
        console.error('Error closing WebSocket:', err);
      }
      socketRef.current = null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format call duration as MM:SS or HH:MM:SS
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Handle mic toggle
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      // When muting, stop sending audio but keep recording active
      console.log('Microphone muted');
    } else {
      console.log('Microphone unmuted');
    }
  };

  // Handle speaker toggle
  const handleSpeakerToggle = () => {
    setIsSpeakerOn((prev) => !prev);
    console.log('Speaker toggled:', { isSpeakerOn: !isSpeakerOn });
  };

  // Handle end call
  const handleEndCall = () => {
    cleanup();

    // Log analytics
    console.log('Voice call ended:', { characterId, duration: callDuration });

    // Navigate back to chat
    navigation.goBack();
  };

  return (
    <ImageBackground
      source={getRoleImage(characterId, 'heroImage')}
      style={styles.container}
      imageStyle={{ opacity: 0.7 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleEndCall}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Character avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={getRoleImage(characterId, 'avatar') || require('../../assets/icon.png')}
              style={styles.avatar}
            />

            {/* Connection status indicator */}
            {connectionState === 'connecting' && (
              <View style={styles.statusOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}

            {/* AI speaking indicator */}
            {isAISpeaking && connectionState === 'connected' && (
              <View style={styles.speakingIndicator}>
                <View style={styles.speakingPulse} />
              </View>
            )}
          </View>

          {/* Character name */}
          <Text style={styles.characterName}>{characterName}</Text>

          {/* Call status */}
          <Text style={styles.callStatus}>
            {connectionState === 'idle' && 'Initializing...'}
            {connectionState === 'connecting' && 'Connecting...'}
            {connectionState === 'connected' && formatDuration(callDuration)}
            {connectionState === 'error' && 'Connection Failed'}
          </Text>
        </View>

        {/* Control buttons */}
        <View style={styles.controlsSection}>
          <View style={styles.controlsRow}>
            {/* Camera button (disabled) */}
            <TouchableOpacity
              style={[styles.controlButton, styles.disabledButton]}
              activeOpacity={1}
              disabled
            >
              <Ionicons
                name="videocam-off"
                size={28}
                color="rgba(255, 255, 255, 0.4)"
              />
            </TouchableOpacity>

            {/* Microphone toggle */}
            <TouchableOpacity
              onPress={handleMuteToggle}
              style={[
                styles.controlButton,
                isMuted && styles.mutedButton,
              ]}
              activeOpacity={0.7}
              disabled={connectionState !== 'connected'}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Speaker toggle */}
            <TouchableOpacity
              onPress={handleSpeakerToggle}
              style={[
                styles.controlButton,
                !isSpeakerOn && styles.mutedButton,
              ]}
              activeOpacity={0.7}
              disabled={connectionState !== 'connected'}
            >
              <Ionicons
                name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            {/* End call button */}
            <TouchableOpacity
              onPress={handleEndCall}
              style={[styles.controlButton, styles.endCallButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  avatarContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 108,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  speakingPulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 112,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  characterName: {
    marginTop: 32,
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  callStatus: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  controlsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mutedButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.5)',
  },
  endCallButton: {
    backgroundColor: '#E74C3C',
  },
});
