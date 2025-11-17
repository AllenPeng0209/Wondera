import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRoles, getLikedRolesCount, saveRolePreference } from '../storage/db';

const SWIPE_THRESHOLD = 120;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const position = useRef(new Animated.ValueXY()).current;

  const currentCard = cards.length ? cards[cardIndex % cards.length] : null;
  const nextCard = cards.length ? cards[(cardIndex + 1) % cards.length] : null;

  useEffect(() => {
    async function load() {
      const data = await getRoles();
      setCards(data);
      const count = await getLikedRolesCount();
      setLikedCount(count);
      setLoading(false);
    }
    load();
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            handleSwipe('like');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            handleSwipe('pass');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [cardIndex]
  );

  const handleSwipe = (type) => {
    if (!currentCard) return;
    Animated.timing(position, {
      toValue: { x: type === 'like' ? 400 : -400, y: 50 },
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (type === 'like') {
        saveRolePreference(currentCard.id, true);
        setLikedCount((prev) => prev + 1);
      }
      position.setValue({ x: 0, y: 0 });
      setCardIndex((prev) => prev + 1);
    });
  };

  const cardStyle = {
    transform: [
      ...position.getTranslateTransform(),
      {
        rotate: position.x.interpolate({
          inputRange: [-250, 0, 250],
          outputRange: ['-12deg', '0deg', '12deg'],
        }),
      },
    ],
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator color="#f093a4" />
      </SafeAreaView>
    );
  }

  if (!currentCard) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={52} color="#f093a4" />
          <Text style={styles.emptyTitle}>暂时没有更多推荐</Text>
          <Text style={styles.emptySubtitle}>稍后再来，新的心动角色正在登场。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>发现</Text>
          <Text style={styles.headerSubtitle}>这些人，想和你分享秘密</Text>
        </View>
        <TouchableOpacity style={styles.likedCount}>
          <Ionicons name="sparkles-outline" size={18} color="#f093a4" />
          <Text style={styles.likedText}>{likedCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deckArea}>
        {nextCard && (
          <Card key={nextCard.id} card={nextCard} style={styles.nextCard} dimmed />
        )}
        {currentCard && (
          <Animated.View style={[styles.cardWrapper, cardStyle]} {...panResponder.panHandlers}>
            <Card card={currentCard} />
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.circleButton, styles.skipButton]} onPress={() => handleSwipe('pass')}>
          <Ionicons name="close" size={24} color="#f093a4" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleButton, styles.likeButton]} onPress={() => handleSwipe('like')}>
          <Ionicons name="heart" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Card({ card, style, dimmed }) {
  return (
    <Animated.View style={[styles.card, style, dimmed && { opacity: 0.5, transform: [{ scale: 0.96 }] }]}> 
      <LinearGradient
        colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <Image source={{ uri: card.heroImage || card.avatar }} style={styles.cardImage} />
      <View style={styles.cardOverlay}>
        <Text style={styles.cardName}>{card.name}</Text>
        <Text style={styles.cardTitle}>{card.title}{card.city ? ` · ${card.city}` : ''}</Text>
        <Text style={styles.cardDescription}>{card.description}</Text>

        <View style={styles.tagList}>
          {card.tags?.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3a3a3a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9a9a9a',
    marginTop: 4,
  },
  likedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#ffe0ea',
  },
  likedText: {
    marginLeft: 4,
    color: '#f093a4',
    fontWeight: '600',
  },
  deckArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  nextCard: {
    position: 'absolute',
    width: '94%',
    height: '94%',
    bottom: -10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  cardName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  cardTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginVertical: 4,
  },
  cardDescription: {
    fontSize: 16,
    color: '#fff',
    marginTop: 6,
    lineHeight: 22,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  skipButton: {
    backgroundColor: '#fff',
  },
  likeButton: {
    backgroundColor: '#f093a4',
  },
});
