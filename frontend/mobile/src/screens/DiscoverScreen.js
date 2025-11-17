import React, { useMemo, useRef, useState } from 'react';
import {
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

const heroCards = [
  {
    id: 'hero-1',
    name: '陆沉',
    title: '温柔系建筑师',
    age: 27,
    city: '上海',
    description: '“慢慢喜欢你，直到愿意把每一次日出都讲给你听。”',
    interests: ['晨跑', '建筑模型', '慢热告白'],
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'hero-2',
    name: '季如晏',
    title: '占星师 & 心理咨询师',
    age: 26,
    city: '成都',
    description: '“你不说话我也懂，星星会告诉我你在想什么。”',
    interests: ['星盘', '茶饮', '梦境记录'],
    image: 'https://images.unsplash.com/photo-1528763380143-65b3ac35c4fd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'hero-3',
    name: '沈归',
    title: '摇滚主唱',
    age: 25,
    city: '北京',
    description: '“我为你写了一首歌，它只会在你出现的时候播放。”',
    interests: ['黑胶收藏', '深夜排练', '甜言蜜语'],
    image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80',
  },
];

const SWIPE_THRESHOLD = 120;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [cardIndex, setCardIndex] = useState(0);
  const [likedList, setLikedList] = useState([]);
  const position = useRef(new Animated.ValueXY()).current;

  const currentCard = heroCards[cardIndex % heroCards.length];
  const nextCard = heroCards[(cardIndex + 1) % heroCards.length];

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
    Animated.timing(position, {
      toValue: { x: type === 'like' ? 400 : -400, y: 50 },
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (type === 'like') {
        setLikedList((prev) => [...prev, currentCard]);
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>发现</Text>
          <Text style={styles.headerSubtitle}>这些人，想和你分享秘密</Text>
        </View>
        <TouchableOpacity style={styles.likedCount}>
          <Ionicons name="sparkles-outline" size={18} color="#f093a4" />
          <Text style={styles.likedText}>{likedList.length}</Text>
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
      <Image source={{ uri: card.image }} style={styles.cardImage} />
      <View style={styles.cardOverlay}>
        <Text style={styles.cardName}>{card.name}</Text>
        <Text style={styles.cardTitle}>{card.title} · {card.age} · {card.city}</Text>
        <Text style={styles.cardDescription}>{card.description}</Text>

        <View style={styles.tagList}>
          {card.interests.map((tag) => (
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
