import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getExplorePostById } from '../data/explorePosts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCount = (value) => {
  if (!value) return '0';
  if (value < 1000) return `${value}`;
  if (value < 10000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 10000).toFixed(1)}w`;
};

export default function ExplorePostScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { postId, post: initialPost } = route?.params || {};
  const post = useMemo(() => initialPost || getExplorePostById(postId), [initialPost, postId]);
  const [activeIndex, setActiveIndex] = useState(0);

  const topPadding = Math.max(insets.top - 10, 8);
  const bottomPadding = Math.max(insets.bottom + 24, 30);
  const imageWidth = SCREEN_WIDTH - 32;

  if (!post) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#d86a83" />
            <Text style={styles.emptyTitle}>内容好像迷路了</Text>
            <Text style={styles.emptySubtitle}>回到探索再试试吧。</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const coverImage = post.coverImage || post.images?.[0];
  const images = useMemo(() => {
    if (Array.isArray(post.images) && post.images.length) return post.images;
    if (coverImage) return [coverImage];
    return [];
  }, [post.images, coverImage]);
  const stats = post.stats || {};
  const comments = useMemo(
    () => [
      {
        id: 'comment-1',
        name: '南风',
        time: '2小时前',
        body: '这段像是在看电影的开场，画面感好强。',
      },
      {
        id: 'comment-2',
        name: '栀子',
        time: '1小时前',
        body: '收藏了！想跟着路线走一遍。',
      },
      {
        id: 'comment-3',
        name: '桃子汽水',
        time: '25分钟前',
        body: '标题太会了，刚好在找这样的灵感。',
      },
    ],
    [post.id]
  );

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / imageWidth);
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#2f2622" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>图文笔记</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        >
          {images.length ? (
            <View style={styles.coverWrapper}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={[styles.coverPager, { width: imageWidth }]}
              >
                {images.map((img, index) => (
                  <Image
                    key={`cover-${index}`}
                    source={img}
                    style={[styles.coverImage, { width: imageWidth }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.coverIndicator}>
                <Text style={styles.coverIndicatorText}>
                  {activeIndex + 1}/{images.length}
                </Text>
                <View style={styles.dotRow}>
                  {images.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={[styles.dot, activeIndex === index && styles.dotActive]}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.contentCard}>
            <View style={styles.authorRow}>
              {post.author?.avatar ? (
                <Image source={post.author.avatar} style={styles.authorAvatar} />
              ) : null}
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author?.name || '匿名作者'}</Text>
                <Text style={styles.authorMeta}>{post.author?.label || post.location || '探索者'}</Text>
              </View>
              <TouchableOpacity style={styles.followButton} activeOpacity={0.85}>
                <Text style={styles.followText}>关注</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.postTitle}>{post.title}</Text>
            {post.summary ? <Text style={styles.postSummary}>{post.summary}</Text> : null}

            {post.content?.map((paragraph, index) => (
              <Text key={`para-${index}`} style={styles.postParagraph}>
                {paragraph}
              </Text>
            ))}

            <View style={styles.tagRow}>
              {(post.tags || []).map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={14} color="#d45f7b" />
                <Text style={styles.statText}>{formatCount(stats.likes)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="bookmark" size={14} color="#d45f7b" />
                <Text style={styles.statText}>{formatCount(stats.collects)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#d45f7b" />
                <Text style={styles.statText}>{formatCount(stats.comments)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.commentSection}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>留言</Text>
              <Text style={styles.commentCount}>{formatCount(stats.comments || comments.length)}</Text>
            </View>
            <View style={styles.commentInput}>
              <View style={styles.commentAvatarPlaceholder}>
                <Text style={styles.commentAvatarText}>你</Text>
              </View>
              <Text style={styles.commentPlaceholder}>写下一句回应...</Text>
            </View>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment.name?.slice(0, 1) || '心'}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentName}>{comment.name}</Text>
                    <Text style={styles.commentTime}>{comment.time}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1e1de',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2622',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  coverWrapper: {
    alignItems: 'center',
  },
  coverPager: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  coverImage: {
    height: 360,
  },
  coverIndicator: {
    marginTop: 10,
    alignItems: 'center',
  },
  coverIndicatorText: {
    fontSize: 12,
    color: '#7b6a66',
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5d8d5',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#d86a83',
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2622',
  },
  authorMeta: {
    fontSize: 11,
    color: '#8f7f7a',
    marginTop: 4,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fde6ec',
  },
  followText: {
    fontSize: 12,
    color: '#c4526b',
    fontWeight: '700',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f2622',
    marginBottom: 8,
  },
  postSummary: {
    fontSize: 13,
    color: '#7a6a67',
    marginBottom: 10,
    lineHeight: 18,
  },
  postParagraph: {
    fontSize: 13,
    color: '#4b3e3a',
    lineHeight: 20,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f7f1ef',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#7b6a66',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  statText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#9a7a85',
    fontWeight: '600',
  },
  commentSection: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2f2622',
  },
  commentCount: {
    fontSize: 12,
    color: '#9a7a85',
    fontWeight: '600',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f7f1ef',
    marginBottom: 12,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e7d8d6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    fontSize: 11,
    color: '#7a6a67',
    fontWeight: '600',
  },
  commentPlaceholder: {
    fontSize: 12,
    color: '#a09390',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fde6ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentName: {
    fontSize: 13,
    color: '#2f2622',
    fontWeight: '700',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 11,
    color: '#9a8e89',
  },
  commentText: {
    fontSize: 13,
    color: '#4b3e3a',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#3f3633',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#8b7a76',
    textAlign: 'center',
  },
});
