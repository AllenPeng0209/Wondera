import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRoles, getConversationByRoleId } from '../storage/db';
import { getRoleImage } from '../data/images';
import { explorePosts } from '../data/explorePosts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 14;
const COLUMN_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;
const FILTERS = ['角色', '地点', '热门', '新加入'];
const CARD_HEIGHTS = [170, 210, 230, 190, 250, 200, 240];
const CARD_BODY_ESTIMATE = 110;
const FEED_BASE_TIME = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getCardHeight(item) {
  if (item?.coverHeight) return item.coverHeight;
  const safeId = item?.id || '';
  const index = Math.abs(hashString(safeId)) % CARD_HEIGHTS.length;
  return CARD_HEIGHTS[index];
}

function getPseudoCount(id, min = 200, max = 3200) {
  const safeId = id || '';
  const seed = Math.abs(hashString(safeId));
  return min + (seed % Math.max(max - min, 1));
}

function mixFeed(primary, secondary) {
  const result = [];
  const max = Math.max(primary.length, secondary.length);
  for (let i = 0; i < max; i += 1) {
    if (primary[i]) result.push(primary[i]);
    if (secondary[i]) result.push(secondary[i]);
  }
  return result;
}

function getPopularity(item) {
  if (!item) return 0;
  if (item.type === 'world') return item.stats?.views || item.stats?.likes || item.likes || 0;
  if (item.type === 'post') return item.stats?.likes || item.likes || 0;
  return item.likes || 0;
}

function getCreatedAt(item) {
  return item?.createdAt || 0;
}

function buildMasonryColumns(items) {
  const columns = [[], []];
  const heights = [0, 0];

  items.forEach((item) => {
    const cardHeight = getCardHeight(item);
    const columnIndex = heights[0] <= heights[1] ? 0 : 1;
    columns[columnIndex].push({ ...item, cardHeight });
    heights[columnIndex] += cardHeight + CARD_BODY_ESTIMATE;
  });

  return columns;
}

export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  useEffect(() => {
    async function load() {
      const data = await getRoles();
      setRoles(data);
      setLoading(false);
    }
    load();
  }, []);

  const roleCards = useMemo(() => {
    return (roles || []).map((role) => ({
      ...role,
      type: 'role',
      likes: getPseudoCount(role.id, 260, 4200),
      createdAt: FEED_BASE_TIME - getPseudoCount(role.id, 1, 14) * DAY_MS,
    }));
  }, [roles]);

  const contentCards = useMemo(() => explorePosts, []);
  const mixedFeed = useMemo(() => mixFeed(contentCards, roleCards), [contentCards, roleCards]);

  const filteredItems = useMemo(() => {
    if (activeFilter === '角色') return roleCards;
    if (activeFilter === '地点') {
      return mixedFeed.filter((item) => {
        if (item.type === 'role') return item.city;
        if (item.type === 'world') return item.location;
        if (item.type === 'post') return item.location;
        return false;
      });
    }
    if (activeFilter === '热门') {
      return [...mixedFeed].sort((a, b) => getPopularity(b) - getPopularity(a));
    }
    if (activeFilter === '新加入') {
      return [...mixedFeed].sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
    }
    return mixedFeed;
  }, [activeFilter, mixedFeed, roleCards]);

  const masonryColumns = useMemo(() => buildMasonryColumns(filteredItems), [filteredItems]);
  const topPadding = Math.max(insets.top - 10, 8);

  if (loading) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
          <View style={styles.loadingState}>
            <ActivityIndicator color="#d86a83" />
            <Text style={styles.loadingText}>正在编织新的故事...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={52} color="#d86a83" />
            <Text style={styles.emptyTitle}>暂时没有更多推荐</Text>
            <Text style={styles.emptySubtitle}>稍后再来，新角色正在路上。</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>世界探索</Text>
              <Text style={styles.headerSubtitle}>寻找想聊的角色与故事</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.masonryRow}>
            {masonryColumns.map((column, columnIndex) => (
              <View
                key={`column-${columnIndex}`}
                style={[
                  styles.masonryColumn,
                  columnIndex === 0 ? { marginRight: COLUMN_GAP } : null,
                ]}
              >
                {column.map((item) => (
                  <MasonryCard key={`${item.id}-${item.cardHeight}`} item={item} navigation={navigation} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatCount(value) {
  if (!value) return '0';
  if (value < 1000) return `${value}`;
  if (value < 10000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 10000).toFixed(1)}w`;
}

function MasonryCard({ item, navigation }) {
  const isPost = item.type === 'post';
  const isWorld = item.type === 'world';
  const imageSource = isPost
    ? item.coverImage || item.images?.[0]
    : isWorld
      ? item.coverImage || item.images?.[0]
      : getRoleImage(item.id, 'heroImage') || getRoleImage(item.id, 'avatar');
  const tagLabel = isPost
    ? item.postType || item.location || '图文'
    : isWorld
      ? item.worldType || item.location || '世界探索'
      : item.city || item.tags?.[0] || '角色灵感';
  const fallbackAvatar = getRoleImage('antoine', 'avatar');
  const authorAvatar = isPost || isWorld ? item.author?.avatar || fallbackAvatar : getRoleImage(item.id, 'avatar');
  const authorName = isPost ? item.author?.name : isWorld ? item.author?.name || '世界向导' : item.name || '匿名角色';
  const cardTitle = isPost ? item.title : item.title || item.name || '';
  const cardDescription = isPost
    ? item.summary
    : isWorld
      ? item.summary || item.description || ''
      : item.description || item.greeting || '';

  const handlePress = async () => {
    if (isPost) {
      navigation.navigate('ExplorePost', { postId: item.id });
      return;
    }
    if (isWorld) {
      navigation.navigate('WorldExplore', { worldId: item.id });
      return;
    }
    try {
      const conversationId = await getConversationByRoleId(item.id);
      if (conversationId) {
        navigation.navigate('Conversation', { conversationId });
      } else {
        console.warn('未找到该角色的对话');
      }
    } catch (error) {
      console.error('跳转失败', error);
    }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={handlePress}>
      <View style={styles.cardImageWrapper}>
        <Image source={imageSource} style={[styles.cardImage, { height: item.cardHeight }]} resizeMode="cover" />
        <View style={styles.cardTag}>
          <Text style={styles.cardTagText}>{tagLabel}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {cardTitle}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {cardDescription}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.cardAuthor}>
            <Image source={authorAvatar} style={styles.cardAvatar} />
            <Text style={styles.cardAuthorName} numberOfLines={1}>
              {authorName}
            </Text>
          </View>
          <View
            style={[
              styles.cardMeta,
              isPost ? styles.cardMetaPost : isWorld ? styles.cardMetaWorld : styles.cardMetaRole,
            ]}
          >
            <Ionicons
              name={isPost ? 'heart' : isWorld ? 'compass' : 'chatbubble-ellipses-outline'}
              size={12}
              color={isPost ? '#d45f7b' : isWorld ? '#5b7aa6' : '#8c6f6d'}
            />
            <Text
              style={[
                styles.cardMetaText,
                isPost
                  ? styles.cardMetaTextPost
                  : isWorld
                    ? styles.cardMetaTextWorld
                    : styles.cardMetaTextRole,
              ]}
            >
              {isPost
                ? formatCount(item.stats?.likes || item.likes || 0)
                : isWorld
                  ? formatCount(item.stats?.views || item.stats?.likes || 0)
                  : '聊天'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f1ec',
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orbOne: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 204, 215, 0.35)',
  },
  orbTwo: {
    position: 'absolute',
    bottom: 120,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(198, 210, 255, 0.3)',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#7d6b6b',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3f3633',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8b7a76',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2f2622',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8f7f7a',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1e1de',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#2d1f22',
    borderColor: '#2d1f22',
  },
  filterText: {
    fontSize: 12,
    color: '#7b6a66',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 120,
  },
  masonryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },
  card: {
    width: COLUMN_WIDTH,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f2e9e6',
    shadowColor: '#221c1e',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardImageWrapper: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
  },
  cardTag: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 24, 26, 0.75)',
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2622',
  },
  cardDescription: {
    fontSize: 12,
    color: '#7a6a67',
    marginTop: 4,
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cardAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  cardAuthorName: {
    fontSize: 11,
    color: '#8f7f7a',
    fontWeight: '600',
    flexShrink: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardMetaPost: {
    backgroundColor: '#fff1f4',
    borderColor: '#f2c7d2',
  },
  cardMetaWorld: {
    backgroundColor: '#eef4ff',
    borderColor: '#cfe0f6',
  },
  cardMetaRole: {
    backgroundColor: '#f7f1ef',
    borderColor: '#e7dad6',
  },
  cardMetaText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaTextPost: {
    color: '#c4526b',
  },
  cardMetaTextWorld: {
    color: '#5b7aa6',
  },
  cardMetaTextRole: {
    color: '#7f6f6a',
  },
});
