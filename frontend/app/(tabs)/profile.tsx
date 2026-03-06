import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
  Animated, Easing, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORY_META: Record<string, { icon: string; name: string; color: string }> = {
  series_tv: { icon: '📺', name: 'Séries TV', color: '#E040FB' },
  geographie: { icon: '🌍', name: 'Géographie', color: '#00FFFF' },
  histoire: { icon: '🏛️', name: 'Histoire', color: '#FFD700' },
};

const BADGE_MAP: Record<string, string> = { fire: '🔥', bolt: '⚡', glow: '✨' };

type CategoryData = {
  xp: number;
  level: number;
  title: string;
  xp_progress: { current: number; needed: number; progress: number };
  unlocked_titles: { level: number; title: string }[];
};

type ProfileData = {
  user: {
    id: string; pseudo: string; avatar_seed: string; is_guest: boolean;
    total_xp: number; selected_title: string | null;
    categories: Record<string, CategoryData>;
    matches_played: number; matches_won: number;
    best_streak: number; current_streak: number; streak_badge: string;
    win_rate: number; mmr: number;
  };
  all_unlocked_titles: { level: number; title: string; category: string }[];
  match_history: Array<{
    id: string; category: string; player_score: number; opponent_score: number;
    opponent: string; won: boolean; xp_earned: number;
    xp_breakdown: { base: number; victory: number; perfection: number; giant_slayer: number; streak: number; total: number } | null;
    correct_count: number; created_at: string;
  }>;
};

function StreakBadge({ streak, badge }: { streak: number; badge: string }) {
  if (streak < 3) return null;
  const emoji = BADGE_MAP[badge] || '🔥';
  const label = streak >= 10 ? 'LÉGENDAIRE' : streak >= 5 ? 'EN FEU' : 'EN SÉRIE';
  const bgColor = streak >= 10 ? 'rgba(0,255,255,0.12)' : streak >= 5 ? 'rgba(255,165,0,0.12)' : 'rgba(255,100,0,0.12)';
  const borderColor = streak >= 10 ? 'rgba(0,255,255,0.3)' : streak >= 5 ? 'rgba(255,165,0,0.3)' : 'rgba(255,100,0,0.3)';
  const textColor = streak >= 10 ? '#00FFFF' : streak >= 5 ? '#FFA500' : '#FF6B35';

  return (
    <View style={[styles.streakContainer, { backgroundColor: bgColor, borderColor }]}>
      <Text style={styles.streakEmoji}>{emoji}</Text>
      <View>
        <Text style={[styles.streakLabel, { color: textColor }]}>{label}</Text>
        <Text style={styles.streakCount}>{streak} victoires d'affilée</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const userId = await AsyncStorage.getItem('duelo_user_id');
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/profile/${userId}`);
      const data = await res.json();
      setProfile(data);
    } catch {}
    setLoading(false);
  };

  const handleSelectTitle = async (title: string) => {
    if (!profile) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`${API_URL}/api/user/select-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile.user.id, title }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setProfile(prev => prev ? {
          ...prev,
          user: { ...prev.user, selected_title: title }
        } : null);
      }
    } catch {}
    setSavingTitle(false);
    setShowTitleModal(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['duelo_user_id', 'duelo_pseudo', 'duelo_avatar_seed']);
    router.replace('/');
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8A2BE2" /></View>;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Connecte-toi pour voir ton profil</Text>
          <TouchableOpacity testID="go-login-btn" style={styles.loginBtn} onPress={() => router.replace('/')}>
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { user, all_unlocked_titles, match_history } = profile;
  const isGlow = user.streak_badge === 'glow';
  const displayTitle = user.selected_title || all_unlocked_titles[0]?.title || '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, isGlow && styles.avatarGlow]}>
            <Text style={styles.avatarLargeText}>{user.pseudo[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.pseudoText}>{user.pseudo}</Text>
          {displayTitle ? (
            <TouchableOpacity style={styles.titleBadge} onPress={() => setShowTitleModal(true)}>
              <Text style={styles.titleText}>{displayTitle}</Text>
              <Text style={styles.titleEdit}> ✎</Text>
            </TouchableOpacity>
          ) : null}
          {user.current_streak >= 3 && (
            <View style={styles.headerBadgeRow}>
              <Text style={styles.headerBadgeEmoji}>{BADGE_MAP[user.streak_badge] || ''}</Text>
            </View>
          )}
        </View>

        {/* Win Streak Banner */}
        <StreakBadge streak={user.current_streak} badge={user.streak_badge} />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.matches_played}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#00FF9D' }]}>{user.matches_won}</Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.win_rate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>{user.best_streak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Category Levels */}
        <Text style={styles.sectionTitle}>PROGRESSION PAR CATÉGORIE</Text>
        <View style={styles.categoryCardsContainer}>
          {Object.entries(user.categories).map(([catKey, catData]) => {
            const meta = CATEGORY_META[catKey] || { icon: '❓', name: catKey, color: '#8A2BE2' };
            return (
              <View key={catKey} style={[styles.categoryCard, { borderColor: meta.color + '30' }]}>
                <View style={styles.catCardHeader}>
                  <View style={[styles.catIconBox, { backgroundColor: meta.color + '20' }]}>
                    <Text style={styles.catIcon}>{meta.icon}</Text>
                  </View>
                  <View style={styles.catHeaderInfo}>
                    <Text style={styles.catName}>{meta.name}</Text>
                    <Text style={[styles.catTitle, { color: meta.color }]}>{catData.title}</Text>
                  </View>
                  <View style={styles.catLevelBadge}>
                    <Text style={[styles.catLevelText, { color: meta.color }]}>Niv. {catData.level}</Text>
                  </View>
                </View>
                <View style={styles.catXpBar}>
                  <View style={[styles.catXpFill, { width: `${catData.xp_progress.progress * 100}%`, backgroundColor: meta.color }]} />
                </View>
                <Text style={styles.catXpText}>
                  {catData.xp_progress.current.toLocaleString()} / {catData.xp_progress.needed.toLocaleString()} XP
                </Text>
                {catData.level >= 50 && (
                  <View style={[styles.maxLevelTag, { backgroundColor: meta.color + '20' }]}>
                    <Text style={[styles.maxLevelText, { color: meta.color }]}>NIVEAU MAX !</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Unlocked Titles */}
        <Text style={styles.sectionTitle}>MES TITRES</Text>
        <View style={styles.titlesContainer}>
          {all_unlocked_titles.map((t, i) => {
            const meta = CATEGORY_META[t.category] || { icon: '❓', name: '', color: '#8A2BE2' };
            const isSelected = user.selected_title === t.title;
            return (
              <TouchableOpacity
                key={`${t.category}-${t.level}`}
                style={[styles.titleChip, isSelected && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
                onPress={() => handleSelectTitle(t.title)}
              >
                <Text style={styles.titleChipIcon}>{meta.icon}</Text>
                <Text style={[styles.titleChipText, isSelected && { color: meta.color }]}>{t.title}</Text>
                {isSelected && <Text style={styles.titleChipCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Match History */}
        <Text style={styles.sectionTitle}>HISTORIQUE</Text>
        {match_history.length === 0 ? (
          <Text style={styles.noHistory}>Aucun match pour le moment</Text>
        ) : (
          match_history.map((m) => (
            <View key={m.id} style={[styles.matchCard, m.won && styles.matchCardWon]}>
              <View style={styles.matchLeft}>
                <Text style={styles.matchCategory}>{CATEGORY_META[m.category]?.icon || '❓'}</Text>
                <View>
                  <Text style={styles.matchOpponent}>vs {m.opponent}</Text>
                  <Text style={styles.matchDate}>{new Date(m.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
              </View>
              <View style={styles.matchRight}>
                <Text style={[styles.matchScore, m.won ? styles.scoreWin : styles.scoreLoss]}>
                  {m.player_score} - {m.opponent_score}
                </Text>
                <View style={styles.matchXpRow}>
                  <Text style={[styles.matchResult, m.won ? styles.resultWin : styles.resultLoss]}>
                    {m.won ? 'VICTOIRE' : 'DÉFAITE'}
                  </Text>
                  {m.xp_earned > 0 && (
                    <Text style={styles.matchXp}>+{m.xp_earned} XP</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}

        {/* Logout */}
        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Title Selection Modal */}
      <Modal visible={showTitleModal} transparent animationType="fade" onRequestClose={() => setShowTitleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un titre</Text>
            <Text style={styles.modalHint}>Ce titre sera affiché sous ton pseudo en duel</Text>
            <ScrollView style={styles.modalScroll}>
              {all_unlocked_titles.map((t) => {
                const meta = CATEGORY_META[t.category] || { icon: '❓', name: '', color: '#8A2BE2' };
                const isSelected = user.selected_title === t.title;
                return (
                  <TouchableOpacity
                    key={`${t.category}-${t.level}`}
                    style={[styles.modalItem, isSelected && { borderColor: meta.color, backgroundColor: meta.color + '10' }]}
                    onPress={() => handleSelectTitle(t.title)}
                    disabled={savingTitle}
                  >
                    <Text style={styles.modalItemIcon}>{meta.icon}</Text>
                    <View style={styles.modalItemInfo}>
                      <Text style={[styles.modalItemTitle, isSelected && { color: meta.color }]}>{t.title}</Text>
                      <Text style={styles.modalItemSub}>{meta.name} • Niv. {t.level}</Text>
                    </View>
                    {isSelected && <Text style={[styles.modalItemCheck, { color: meta.color }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTitleModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#A3A3A3', fontSize: 16, marginBottom: 16 },
  loginBtn: { backgroundColor: '#8A2BE2', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  loginBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Profile Header
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: '#8A2BE2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  avatarGlow: {
    shadowColor: '#00FFFF', shadowOpacity: 0.8, shadowRadius: 20,
    borderWidth: 2, borderColor: 'rgba(0,255,255,0.5)',
  },
  avatarLargeText: { color: '#FFF', fontSize: 38, fontWeight: '900' },
  pseudoText: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  titleBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, backgroundColor: 'rgba(138,43,226,0.2)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(138,43,226,0.3)',
  },
  titleText: { color: '#8A2BE2', fontSize: 13, fontWeight: '700' },
  titleEdit: { color: '#525252', fontSize: 12 },
  headerBadgeRow: { marginTop: 6 },
  headerBadgeEmoji: { fontSize: 20 },

  // Streak Banner
  streakContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14,
    borderWidth: 1, marginBottom: 16, gap: 12,
  },
  streakEmoji: { fontSize: 28 },
  streakLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  streakCount: { color: '#A3A3A3', fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 10, color: '#525252', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },

  // Category Level Cards
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#525252', letterSpacing: 3, marginBottom: 12, marginTop: 8 },
  categoryCardsContainer: { gap: 12, marginBottom: 24 },
  categoryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catIcon: { fontSize: 22 },
  catHeaderInfo: { flex: 1 },
  catName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  catTitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  catLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catLevelText: { fontSize: 13, fontWeight: '800' },
  catXpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  catXpFill: { height: 6, borderRadius: 3 },
  catXpText: { color: '#525252', fontSize: 11, marginTop: 6, fontWeight: '500' },
  maxLevelTag: { marginTop: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  maxLevelText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Titles
  titlesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  titleChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 6,
  },
  titleChipIcon: { fontSize: 14 },
  titleChipText: { color: '#A3A3A3', fontSize: 13, fontWeight: '600' },
  titleChipCheck: { color: '#00FF9D', fontSize: 14, fontWeight: '800' },

  // Match History
  noHistory: { color: '#525252', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  matchCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  matchCardWon: { borderColor: 'rgba(0,255,157,0.15)', backgroundColor: 'rgba(0,255,157,0.04)' },
  matchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchCategory: { fontSize: 20 },
  matchOpponent: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  matchDate: { color: '#525252', fontSize: 11, marginTop: 2 },
  matchRight: { alignItems: 'flex-end' },
  matchScore: { fontSize: 16, fontWeight: '800' },
  scoreWin: { color: '#00FF9D' },
  scoreLoss: { color: '#FF3B30' },
  matchXpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  matchResult: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  resultWin: { color: '#00FF9D' },
  resultLoss: { color: '#FF3B30' },
  matchXp: { color: '#00FFFF', fontSize: 10, fontWeight: '700' },

  // Logout
  logoutBtn: {
    marginTop: 24, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  logoutText: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, maxHeight: '70%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  modalHint: { fontSize: 13, color: '#525252', marginBottom: 20 },
  modalScroll: { maxHeight: 300 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalItemIcon: { fontSize: 22, marginRight: 12 },
  modalItemInfo: { flex: 1 },
  modalItemTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalItemSub: { color: '#525252', fontSize: 11, marginTop: 2 },
  modalItemCheck: { fontSize: 18, fontWeight: '800' },
  modalClose: {
    marginTop: 16, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalCloseText: { color: '#A3A3A3', fontSize: 14, fontWeight: '600' },
});
