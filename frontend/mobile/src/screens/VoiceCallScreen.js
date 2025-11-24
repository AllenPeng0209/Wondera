import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRoleImage } from '../data/images';

export default function VoiceCallScreen({ route, navigation }) {
  // Extract character context from navigation params
  const { characterId, characterName, characterAvatar } = route.params || {};

  // Local state
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Timer ref for cleanup
  const timerRef = useRef(null);

  // Parameter validation - go back if required params are missing
  useEffect(() => {
    if (!characterId || !characterName) {
      console.error('VoiceCallScreen: Missing required character params');
      navigation.goBack();
      return;
    }

    // Log analytics event
    console.log('Voice call initiated:', { characterId, characterName });

    // Start call timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [characterId, characterName, navigation]);

  // Format call duration as MM:SS or HH:MM:SS
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle mic toggle
  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
    console.log('Mic toggled:', { isMuted: !isMuted, callDuration });
  };

  // Handle speaker toggle
  const handleSpeakerToggle = () => {
    setIsSpeakerOn(prev => !prev);
    console.log('Speaker toggled:', { isSpeakerOn: !isSpeakerOn, callDuration });
  };

  // Handle end call
  const handleEndCall = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Log analytics event
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
          </View>

          {/* Character name */}
          <Text style={styles.characterName}>{characterName}</Text>

          {/* Call duration */}
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
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
              <Ionicons name="videocam-off" size={28} color="rgba(255, 255, 255, 0.4)" />
            </TouchableOpacity>

            {/* Microphone toggle */}
            <TouchableOpacity
              onPress={handleMuteToggle}
              style={styles.controlButton}
              activeOpacity={0.7}
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
              style={styles.controlButton}
              activeOpacity={0.7}
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
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  characterName: {
    marginTop: 32,
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  callDuration: {
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
  endCallButton: {
    backgroundColor: '#E74C3C',
  },
});
