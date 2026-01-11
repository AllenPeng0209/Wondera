import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getExploreWorldById } from '../data/explorePosts';
import { getRoleImage } from '../data/images';
import { addMessage, ensureConversationByRoleId } from '../storage/db';

const fallbackHero = getRoleImage('edward', 'heroImage');

function resolveImageSource(image) {
  if (!image) return null;
  if (typeof image === 'string') return { uri: image };
  if (image.uri) return image;
  return image;
}

function resolveImageUri(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (image.uri) return image.uri;
  const resolved = Image.resolveAssetSource(image);
  return resolved?.uri || null;
}

export default function WorldExploreScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { worldId, world: initialWorld } = route?.params || {};
  const world = useMemo(() => initialWorld || getExploreWorldById(worldId), [initialWorld, worldId]);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [selectedScene, setSelectedScene] = useState(null);
  const [sceneModalVisible, setSceneModalVisible] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const topPadding = Math.max(insets.top - 10, 8);
  const bottomPadding = Math.max(insets.bottom + 24, 30);

  if (!world) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#fff6f1', '#f3f4ff']} style={styles.backgroundGradient} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#5b7aa6" />
            <Text style={styles.emptyTitle}>世界探索正在加载</Text>
            <Text style={styles.emptySubtitle}>稍后再试试吧。</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const heroImage = world.images?.[0] || fallbackHero;
  const info = world.world || {};
  const infoTags = info.infoTags || world.tags || [];
  const steps = info.routeSteps || [];
  const interactions = info.interactionTags || [];
  const actionLabel = info.actionLabel || '进入世界探索';
  const targetRoleId = world.targetRoleId || info.targetRoleId || 'edward';
  const recommendedRoles = Array.isArray(world.recommendedRoles) && world.recommendedRoles.length
    ? world.recommendedRoles
    : ['edward', 'antoine', 'kieran'];

  const scenes = steps.map((step, index) => ({
    ...step,
    index,
    id: `${world.id || 'world'}-scene-${index}`,
  }));

  const handleEnterJourney = () => {
    setInteractiveMode(true);
  };

  const openScene = (scene) => {
    if (!scene) return;
    if (!interactiveMode) setInteractiveMode(true);
    setSelectedScene(scene);
    setSceneModalVisible(true);
  };

  const closeSceneModal = () => setSceneModalVisible(false);

  const handleTriggerInteraction = async () => {
    if (!selectedScene || triggering) return;
    setTriggering(true);
    try {
      const conversationId = await ensureConversationByRoleId(targetRoleId);
      const sceneImageSource = resolveImageSource(selectedScene.image || heroImage);
      const sceneImageUri = resolveImageUri(sceneImageSource);
      const promptParts = [];
      if (world?.title) promptParts.push(`目的地：${world.title}`);
      if (selectedScene?.title) promptParts.push(`场景：${selectedScene.title}`);
      if (selectedScene?.subtitle) promptParts.push(`提示：${selectedScene.subtitle}`);
      const prompt = promptParts.length ? promptParts.join(' ｜ ') : '准备开始云端旅途。';
      const baseTime = Date.now();
      if (sceneImageUri) {
        const caption = selectedScene?.title ? `场景：${selectedScene.title}` : '云端旅途场景';
        await addMessage(conversationId, 'user', caption, baseTime, {
          kind: 'image',
          mediaKey: JSON.stringify({
            uri: sceneImageUri,
            mimeType: 'image/jpeg',
          }),
        });
      }
      const textOffset = sceneImageUri ? 1 : 0;
      await addMessage(conversationId, 'ai', `[云端旅途] ${prompt}`, baseTime + textOffset);
      await addMessage(conversationId, 'ai', '我已经在这里等你了，准备好就开始聊吧。', baseTime + textOffset + 1);
      setSceneModalVisible(false);
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      console.warn('[WorldExplore] trigger interaction failed', error);
      Alert.alert('触发失败', error?.message || '请稍后再试');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#eef3ff', '#fff6f1']} style={styles.backgroundGradient} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#2f2622" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>世界探索</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        >
          <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImage}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{world.worldType || '云端旅途'}</Text>
              </View>
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle}>{world.title}</Text>
              <Text style={styles.heroSubtitle}>{world.summary}</Text>
            </View>
            <View style={styles.heroCard}>
              <Text style={styles.heroCardTitle}>{info.infoTitle || '场景信息'}</Text>
              <Text style={styles.heroCardBody}>{info.infoBody || '这里会记录场景信息与互动提示。'}</Text>
              <View style={styles.heroTagRow}>
                {infoTags.map((tag, index) => (
                  <View key={`${tag}-${index}`} style={styles.heroTag}>
                    <Text style={styles.heroTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ImageBackground>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>云端互动过程</Text>
              <View
                style={[
                  styles.sectionBadge,
                  interactiveMode ? styles.sectionBadgeActive : styles.sectionBadgeIdle,
                ]}
              >
                <Ionicons
                  name={interactiveMode ? 'sparkles' : 'lock-closed'}
                  size={12}
                  color={interactiveMode ? '#fff' : '#8c7c78'}
                />
                <Text
                  style={[
                    styles.sectionBadgeText,
                    interactiveMode ? styles.sectionBadgeTextActive : styles.sectionBadgeTextIdle,
                  ]}
                >
                  {interactiveMode ? '已进入' : '未进入'}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionHint}>
              {interactiveMode ? '点选不同场景，触发专属互动' : '点击底部按钮进入云端旅途后可触发互动'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {scenes.map((step) => {
                const isActive = selectedScene?.id === step.id;
                const stepImageSource = resolveImageSource(step.image || heroImage);
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[
                      styles.stepCard,
                      interactiveMode && styles.stepCardReady,
                      isActive && styles.stepCardActive,
                      !interactiveMode && styles.stepCardLocked,
                    ]}
                    activeOpacity={0.9}
                    disabled={!interactiveMode}
                    onPress={() => openScene(step)}
                  >
                    {stepImageSource ? (
                      <View style={styles.stepImageWrapper}>
                        <Image source={stepImageSource} style={styles.stepImage} resizeMode="cover" />
                        <View style={styles.stepImageOverlay} />
                        <Text style={styles.stepImageLabel}>{step.title}</Text>
                      </View>
                    ) : (
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    )}
                    <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                    <View style={styles.stepActionRow}>
                      <Ionicons
                        name={interactiveMode ? 'sparkles' : 'lock-closed'}
                        size={12}
                        color={interactiveMode ? '#f093a4' : '#b3a6a2'}
                      />
                      <Text style={styles.stepActionText}>
                        {interactiveMode ? '点击互动' : '进入后解锁'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>场景触发交互</Text>
            <View style={styles.interactionRow}>
              {interactions.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.interactionPill}>
                  <Text style={styles.interactionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>推荐角色</Text>
            <View style={styles.roleRow}>
              {recommendedRoles.map((roleId) => (
                <View key={roleId} style={styles.roleCard}>
                  <Image source={getRoleImage(roleId, 'avatar')} style={styles.roleAvatar} />
                  <Text style={styles.roleName}>{roleId.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, interactiveMode && styles.actionButtonActive]}
            activeOpacity={0.9}
            onPress={handleEnterJourney}
          >
            <Ionicons name={interactiveMode ? 'sparkles' : 'play'} size={16} color="#fff" />
            <Text style={styles.actionText}>
              {interactiveMode ? '已进入云端旅途' : actionLabel}
            </Text>
          </TouchableOpacity>
          {interactiveMode ? (
            <Text style={styles.actionHint}>选择一个场景，触发互动</Text>
          ) : null}
        </ScrollView>
        {sceneModalVisible && selectedScene ? (
          <Modal transparent animationType="fade" visible={sceneModalVisible} onRequestClose={closeSceneModal}>
            <View style={styles.sceneModalBackdrop}>
              <View style={styles.sceneModalCard}>
                <View style={styles.sceneModalHeader}>
                  <Text style={styles.sceneModalTitle}>{selectedScene.title || '场景互动'}</Text>
                  <TouchableOpacity style={styles.sceneCloseButton} onPress={closeSceneModal}>
                    <Ionicons name="close" size={18} color="#6b5f67" />
                  </TouchableOpacity>
                </View>
                {resolveImageSource(selectedScene.image || heroImage) ? (
                  <Image
                    source={resolveImageSource(selectedScene.image || heroImage)}
                    style={styles.sceneModalImage}
                    resizeMode="cover"
                  />
                ) : null}
                {selectedScene.subtitle ? (
                  <Text style={styles.sceneModalSubtitle}>{selectedScene.subtitle}</Text>
                ) : null}
                <View style={styles.sceneMetaRow}>
                  {world.location ? (
                    <View style={styles.sceneMetaPill}>
                      <Ionicons name="location" size={12} color="#7b6a66" />
                      <Text style={styles.sceneMetaText}>{world.location}</Text>
                    </View>
                  ) : null}
                  <View style={styles.sceneMetaPill}>
                    <Ionicons name="sparkles" size={12} color="#7b6a66" />
                    <Text style={styles.sceneMetaText}>{world.worldType || '云端旅途'}</Text>
                  </View>
                </View>
                {interactions.length ? (
                  <View style={styles.sceneTagRow}>
                    {interactions.map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.sceneTag}>
                        <Text style={styles.sceneTagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.scenePrimaryButton, triggering && styles.scenePrimaryButtonDisabled]}
                  onPress={handleTriggerInteraction}
                  disabled={triggering}
                >
                  <Text style={styles.scenePrimaryText}>{triggering ? '正在触发...' : '触发互动'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sceneSecondaryButton} onPress={closeSceneModal}>
                  <Text style={styles.sceneSecondaryText}>稍后再说</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : null}
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
    marginBottom: 8,
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
  hero: {
    height: 360,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'space-between',
    padding: 16,
  },
  heroImage: {
    borderRadius: 20,
  },
  heroTopRow: {
    alignItems: 'flex-start',
  },
  heroPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heroBottom: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 12,
  },
  heroCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2622',
    marginBottom: 6,
  },
  heroCardBody: {
    fontSize: 12,
    color: '#6a5d59',
    lineHeight: 18,
  },
  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  heroTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f0e7e4',
    marginRight: 6,
    marginBottom: 6,
  },
  heroTagText: {
    fontSize: 10,
    color: '#7a6a67',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2f2622',
    marginBottom: 10,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionBadgeActive: {
    backgroundColor: '#2f2622',
    borderColor: '#2f2622',
  },
  sectionBadgeIdle: {
    backgroundColor: '#fff',
    borderColor: '#f0dfe0',
  },
  sectionBadgeText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionBadgeTextActive: {
    color: '#fff',
  },
  sectionBadgeTextIdle: {
    color: '#8c7c78',
  },
  sectionHint: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 11,
    color: '#8c7c78',
  },
  stepCard: {
    width: 160,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  stepImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    height: 86,
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  stepImageLabel: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    right: 8,
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  stepCardReady: {
    borderWidth: 1,
    borderColor: '#f0dfe0',
  },
  stepCardLocked: {
    opacity: 0.6,
  },
  stepCardActive: {
    borderWidth: 1,
    borderColor: '#f093a4',
    shadowColor: '#f093a4',
    shadowOpacity: 0.15,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f2622',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#7a6a67',
  },
  stepActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stepActionText: {
    marginLeft: 6,
    fontSize: 10,
    color: '#9b8c88',
    fontWeight: '600',
  },
  interactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interactionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0dfe0',
    marginRight: 8,
    marginBottom: 8,
  },
  interactionText: {
    fontSize: 11,
    color: '#6c6c75',
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
  },
  roleCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  roleAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
  },
  roleName: {
    marginTop: 6,
    fontSize: 10,
    color: '#7a6a67',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f2622',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  actionButtonActive: {
    backgroundColor: '#f093a4',
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  actionHint: {
    marginTop: -4,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 12,
    color: '#8b7a76',
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
  sceneModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sceneModalCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  sceneModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sceneModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f2622',
  },
  sceneCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7ecef',
  },
  sceneModalSubtitle: {
    fontSize: 12,
    color: '#7a6a67',
    marginBottom: 12,
  },
  sceneModalImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 10,
  },
  sceneMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  sceneMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f6efed',
    marginRight: 8,
    marginBottom: 6,
  },
  sceneMetaText: {
    marginLeft: 4,
    fontSize: 10,
    color: '#7a6a67',
    fontWeight: '600',
  },
  sceneTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sceneTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fff4f7',
    marginRight: 6,
    marginBottom: 6,
  },
  sceneTagText: {
    fontSize: 10,
    color: '#d45f7b',
    fontWeight: '600',
  },
  scenePrimaryButton: {
    backgroundColor: '#f093a4',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  scenePrimaryButtonDisabled: {
    opacity: 0.7,
  },
  scenePrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sceneSecondaryButton: {
    borderWidth: 1,
    borderColor: '#f1d7de',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sceneSecondaryText: {
    fontSize: 13,
    color: '#7a6a67',
    fontWeight: '600',
  },
});
