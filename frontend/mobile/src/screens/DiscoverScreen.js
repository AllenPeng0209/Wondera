import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRoles, getLikedRolesCount, getConversationByRoleId } from '../storage/db';
import { getRoleImage } from '../data/images';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px padding on each side
const CARD_SPACING = 20;

export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 计算卡片高度：屏幕高度 - 顶部安全区域 - 标题区域 - 底部Tab栏 - 底部安全区域 - 底部间距
  const HEADER_HEIGHT = 70; // 标题区域高度
  const TAB_BAR_HEIGHT = 49; // Tab 栏高度
  const CARD_HEIGHT = SCREEN_HEIGHT - insets.top - HEADER_HEIGHT - TAB_BAR_HEIGHT - insets.bottom - 16;

  // Create an extended array for infinite scrolling effect
  const extendedCards = cards.length > 0
    ? [...cards, ...cards, ...cards] // Triple the array
    : [];

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

  const renderCard = ({ item }) => <Card card={item} navigation={navigation} cardHeight={CARD_HEIGHT} />;

  const getItemLayout = (data, index) => ({
    length: CARD_WIDTH + CARD_SPACING,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#f093a4" />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}>
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={52} color="#f093a4" />
          <Text style={styles.emptyTitle}>暂时没有更多推荐</Text>
          <Text style={styles.emptySubtitle}>稍后再来,探索新的语言伙伴。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>外教库</Text>
          <Text style={styles.headerSubtitle}>精选AI外教，助你练习口语</Text>
        </View>
        <TouchableOpacity style={styles.likedCount}>
          <Ionicons name="people-outline" size={18} color="#4A90E2" />
          <Text style={styles.likedText}>{likedCount || 0} 位学员</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={extendedCards}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={getItemLayout}
        initialScrollIndex={cards.length} // Start at the middle set
        onScrollToIndexFailed={() => {}}
      />
    </SafeAreaView>
  );
}

function Card({ card, navigation, cardHeight }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const imageSource = getRoleImage(card.id, 'heroImage') || getRoleImage(card.id, 'avatar');

  const handlePress = async () => {
    // 开始淡出动画
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      // 动画完成后跳转
      try {
        const conversationId = await getConversationByRoleId(card.id);
        if (conversationId) {
          navigation.navigate('Conversation', { conversationId });
        } else {
          console.warn('未找到该角色的对话');
        }
      } catch (error) {
        console.error('跳转失败', error);
      }
      // 重置动画值以便下次使用
      fadeAnim.setValue(1);
    });
  };

  return (
    <View style={[styles.cardContainer, { height: cardHeight }]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={{ width: '100%', height: '100%' }}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />

          {/* Gradient overlay for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />

          <View style={styles.cardOverlay}>
            <Text style={styles.cardName}>{card.name || ''}</Text>
            <Text style={styles.cardTitle}>
              {card.title || ''}
              {card.city ? ` · ${card.city}` : ''}
            </Text>
            <Text style={styles.cardDescription}>{card.description || ''}</Text>

            <View style={styles.tagList}>
              {Array.isArray(card.tags) && card.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
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
    marginBottom: 16,
    paddingHorizontal: 20,
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
    backgroundColor: '#E3F2FD',
  },
  likedText: {
    marginLeft: 4,
    color: '#4A90E2',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
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
});
