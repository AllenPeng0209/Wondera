import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import {
  addVocabItem,
  deleteVocabItem,
  getDueVocabItems,
  getVocabTimeline,
  getVocabStats,
  recordVocabReview,
  updateVocabItem,
  saveVocabAudio,
} from '../storage/db';
import { synthesizeQwenTts } from '../services/tts';

const ratingButtons = [
  { key: 'again', label: '再来', color: '#ff6b6b' },
  { key: 'good', label: '好', color: '#f093a4' },
  { key: 'easy', label: '简单', color: '#6fcf97' },
];

export default function VocabScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [stats, setStats] = useState({ total: 0, mastered: 0, due: 0 });
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [initialDue, setInitialDue] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const formatDate = (ts) => {
    if (!ts) return '--';
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const groupedHistory = useMemo(() => {
    const map = historyData.reduce((acc, item) => {
      const key = formatDate(item.created_at);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    return Object.keys(map).map((date) => ({ date, items: map[date] }));
  }, [historyData]);
  const soundRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dueCards, s] = await Promise.all([getDueVocabItems(50), getVocabStats()]);
    setCards(dueCards);
    setStats(s);
    setCurrentIndex(0);
    setShowBack(false);
    setInitialDue(dueCards.length);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const currentCard = cards[currentIndex] || null;
  const remaining = cards.length;
  const progress = initialDue ? Math.max(0, Math.min(1, (initialDue - remaining) / initialDue)) : 0;

  const handleReview = async (rating) => {
    if (!currentCard) return;
    await recordVocabReview(currentCard.id, rating);
    const nextCards = cards.filter((_, idx) => idx !== currentIndex);
    setCards(nextCards);
    setStats(await getVocabStats());
    setCurrentIndex((prev) => Math.min(prev, Math.max(nextCards.length - 1, 0)));
    setShowBack(false);
  };

  const handleDelete = async () => {
    if (!currentCard) return;
    Alert.alert('删除词卡', `确定删除「${currentCard.term}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteVocabItem(currentCard.id);
          const nextCards = cards.filter((item) => item.id !== currentCard.id);
          setCards(nextCards);
          setStats(await getVocabStats());
          setCurrentIndex((prev) => Math.min(prev, Math.max(nextCards.length - 1, 0)));
          setShowBack(false);
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newTerm.trim()) {
      Alert.alert('提示', '请先输入单词');
      return;
    }
    await addVocabItem({ term: newTerm.trim(), definition: newDefinition.trim() || '自定义词卡', language: 'en' });
    setNewTerm('');
    setNewDefinition('');
    loadData();
  };

  const handleSkip = () => {
    if (!currentCard) return;
    if (cards.length <= 1) return;
    const nextCards = [...cards.slice(1), currentCard];
    setCards(nextCards);
    setCurrentIndex(0);
    setShowBack(false);
  };

  const handleToggleStar = async () => {
    if (!currentCard) return;
    const nextStar = currentCard.starred ? 0 : 1;
    await updateVocabItem(currentCard.id, { starred: nextStar });
    setCards((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, starred: nextStar } : item
      )
    );
  };

  const handlePlayAudio = async () => {
    if (!currentCard) return;
    const text = (currentCard.term || '').trim();
    if (!text) return;
    setAudioLoading(true);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
      }

      let audioUrl = currentCard.audio_url;
      if (!audioUrl) {
        const tts = await synthesizeQwenTts({ text });
        audioUrl = tts?.audioUrl;
        if (!audioUrl) {
          throw new Error('未获取到音频');
        }
        await saveVocabAudio(currentCard.id, audioUrl);
        setCards((prev) =>
          prev.map((item, idx) =>
            idx === currentIndex ? { ...item, audio_url: audioUrl } : item
          )
        );
      }

      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(currentCard.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (!status.isPlaying) {
          setPlayingId((id) => (id === currentCard.id ? null : id));
        }
      });
    } catch (error) {
      console.warn('[Vocab] play audio failed', error);
      Alert.alert('播放失败', error?.message || '音频生成或播放失败');
    } finally {
      setAudioLoading(false);
    }
  };

  const topPadding = Math.max(insets.top - 8, 8);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await getVocabTimeline(300);
      setHistoryData(rows);
    } catch (e) {
      console.warn('[Vocab] load history failed', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}> 
      <View style={styles.header}>
        <Text style={styles.headerTitle}>词汇练习</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Ionicons name="refresh" size={18} color="#f093a4" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="待复习" value={stats.due} color="#f093a4" />
        <StatChip label="已掌握" value={stats.mastered} color="#6fcf97" />
        <StatChip
          label="总词库"
          value={stats.total}
          color="#8f8f8f"
          onPress={() => {
            setHistoryVisible((v) => !v);
            if (!historyVisible) loadHistory();
          }}
        />
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.max(initialDue - remaining, 0)}/{initialDue || 0} 已完成
        </Text>
      </View>

      {historyVisible && (
        <View style={styles.historyWrapper}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>总词库 · 时间轴</Text>
            <TouchableOpacity style={styles.historyRefresh} onPress={loadHistory}>
              {historyLoading ? (
                <ActivityIndicator color="#f093a4" size="small" />
              ) : (
                <Ionicons name="refresh" size={18} color="#f093a4" />
              )}
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <ActivityIndicator color="#f093a4" style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.historySectionList}>
              {groupedHistory.map((section) => (
                <View key={section.date} style={styles.historySection}>
                  <View style={styles.historySectionHeader}>
                    <Text style={styles.historySectionDate}>{section.date}</Text>
                    <Text style={styles.historySectionCount}>{section.items.length} 词</Text>
                  </View>
                  <View style={styles.historyGrid}>
                    {section.items.map((item) => (
                      <View key={item.id} style={styles.historyCard}>
                        <Text style={styles.historyTerm}>{item.term}</Text>
                        <Text style={styles.historyDef} numberOfLines={2}>{item.definition || '—'}</Text>
                        <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#f093a4" />
        </View>
      ) : currentCard ? (
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Ionicons name="play-skip-forward" size={18} color="#f093a4" />
              <Text style={styles.skipText}>跳过</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleStar} style={styles.starButton}>
              <Ionicons
                name={currentCard.starred ? 'star' : 'star-outline'}
                size={20}
                color={currentCard.starred ? '#f5c04f' : '#f093a4'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.term}>{currentCard.term}</Text>
          <View style={styles.phoneticRow}>
            {currentCard.phonetic ? (
              <Text style={styles.phonetic}>{currentCard.phonetic}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.audioButton}
              onPress={handlePlayAudio}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#f093a4" />
              ) : (
                <Ionicons
                  name={playingId === currentCard.id ? 'volume-high' : 'play-circle-outline'}
                  size={22}
                  color="#f093a4"
                />
              )}
            </TouchableOpacity>
          </View>

          {Array.isArray(currentCard.tags) && currentCard.tags.length ? (
            <View style={styles.tagRow}>
              {currentCard.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => setShowBack((prev) => !prev)}
            activeOpacity={0.85}
            style={styles.meaningToggle}
          >
            <Text style={styles.meaningLabel}>{showBack ? '隐藏释义' : '显示释义与例句'}</Text>
            <Ionicons name={showBack ? 'chevron-up' : 'chevron-down'} size={16} color="#f093a4" />
          </TouchableOpacity>

          {showBack && (
            <View style={styles.meaningBox}>
              {(currentCard.definition || '').split(/;|；|\n/).filter(Boolean).map((line, idx) => (
                <Text key={`${line}-${idx}`} style={styles.definition}>
                  {line.trim()}
                </Text>
              ))}
              {!currentCard.definition && (
                <Text style={styles.definition}>未填写释义</Text>
              )}

              {currentCard.example ? (
                <View style={styles.exampleBlock}>
                  <Text style={styles.exampleLabel}>例句</Text>
                  <Text style={styles.example}>{currentCard.example}</Text>
                  {currentCard.example_translation ? (
                    <Text style={styles.exampleTranslation}>{currentCard.example_translation}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.ratingRow}>
            {ratingButtons.map((btn) => (
              <TouchableOpacity
                key={btn.key}
                style={[styles.ratingButton, { backgroundColor: btn.color }]}
                onPress={() => handleReview(btn.key)}
                activeOpacity={0.85}
              >
                <Text style={styles.ratingText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('即将支持', '将加入口语评分/拼写练习入口')}>
              <Ionicons name="mic-outline" size={16} color="#f093a4" />
              <Text style={styles.secondaryText}>发音练习</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#e55b73" />
              <Text style={styles.deleteButtonText}>删除词卡</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="sparkles-outline" size={42} color="#f093a4" />
          <Text style={styles.emptyTitle}>今天的词卡复习完了</Text>
          <Text style={styles.emptySubtitle}>可以添加新词，或稍后回来复习</Text>
        </View>
      )}

      <ScrollView style={styles.addBox} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.addTitle}>添加新词</Text>
        <TextInput
          style={styles.input}
          placeholder="单词/短语"
          value={newTerm}
          onChangeText={setNewTerm}
          placeholderTextColor="#c9b4bd"
        />
        <TextInput
          style={[styles.input, { minHeight: 60 }]}
          placeholder="释义/备注"
          value={newDefinition}
          onChangeText={setNewDefinition}
          placeholderTextColor="#c9b4bd"
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>保存到词库</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statChip, { backgroundColor: `${color}15`, borderColor: `${color}55` }]}
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffe5ea',
  },
  deleteButtonText: {
    color: '#e55b73',
    fontWeight: '700',
    marginLeft: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f4d9e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  progressWrapper: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    backgroundColor: '#f4d9e0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f093a4',
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: '#8f8f8f',
  },
  statChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#8f8f8f',
    marginTop: 2,
  },
  loadingBox: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyWrapper: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  historyRefresh: {
    padding: 6,
  },
  historySectionList: {
    marginTop: 8,
  },
  historySection: {
    marginBottom: 12,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  historySectionDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b24f75',
  },
  historySectionCount: {
    fontSize: 12,
    color: '#8f8f8f',
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 10,
  },
  historyCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f2e6ef',
    shadowColor: '#cda7c1',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  historyTerm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c24d72',
  },
  historyDef: {
    marginTop: 4,
    fontSize: 13,
    color: '#555',
  },
  historyDate: {
    marginTop: 6,
    fontSize: 12,
    color: '#8f8f8f',
  },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#fff0f4',
  },
  skipText: {
    marginLeft: 6,
    color: '#f093a4',
    fontWeight: '600',
  },
  starButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff7fb',
  },
  term: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
  },
  phoneticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  phonetic: {
    fontSize: 14,
    color: '#b08fa0',
    marginTop: 4,
  },
  audioButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ffeef4',
  },
  meaningToggle: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meaningLabel: {
    color: '#f093a4',
    fontWeight: '600',
  },
  meaningBox: {
    marginTop: 12,
    backgroundColor: '#fff7fb',
    borderRadius: 12,
    padding: 12,
  },
  definition: {
    fontSize: 15,
    color: '#3f3f3f',
    lineHeight: 22,
    marginBottom: 6,
  },
  exampleLabel: {
    fontSize: 12,
    color: '#b08fa0',
    marginBottom: 4,
  },
  example: {
    fontSize: 14,
    color: '#3f3f3f',
    lineHeight: 20,
  },
  exampleTranslation: {
    fontSize: 13,
    color: '#8f8f8f',
    marginTop: 4,
  },
  exampleBlock: {
    marginTop: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#ffeef4',
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#f093a4',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  ratingButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff0f4',
  },
  secondaryText: {
    marginLeft: 6,
    color: '#f093a4',
    fontWeight: '600',
  },
  emptyBox: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#8f8f8f',
  },
  addBox: {
    marginTop: 4,
    paddingHorizontal: 16,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#fff0f4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#f093a4',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
