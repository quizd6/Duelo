import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import DueloHeader from '../../components/DueloHeader';
import { GlassIconFrame } from '../../components/GlassIconFrame';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GRID_PAD = 16;

const CATEGORY_ICONS: Record<string, string> = {
  series_tv: '📺',
  geographie: '🌍',
  histoire: '🏛️',
  cinema: '🎬',
  sport: '⚽',
  musique: '🎵',
  sciences: '🔬',
  gastronomie: '🍽️',
};

const CATEGORY_COLORS: Record<string, string> = {
  series_tv: '#E040FB',
  geographie: '#00FFFF',
  histoire: '#FFD700',
  cinema: '#FF6B6B',
  sport: '#00FF9D',
  musique: '#FF8C00',
  sciences: '#7B68EE',
  gastronomie: '#FF69B4',
};

type Category = {
  id: string;
  name: string;
  question_count: number;
};

type FeaturedTopic = {
  id: string;
  name: string;
  icon: string;
  icon_url: string;
  category_id: string;
  pillar_color: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredTopics, setFeaturedTopics] = useState<FeaturedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [pseudo, setPseudo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const storedPseudo = await AsyncStorage.getItem('duelo_pseudo');
    if (storedPseudo) setPseudo(storedPseudo);

    try {
      const [catRes, themesRes] = await Promise.all([
        fetch(`${API_URL}/api/categories`),
        fetch(`${API_URL}/api/themes/explore`),
      ]);
      const catData = await catRes.json();
      setCategories(catData);

      const themesData = await themesRes.json();
      // Extract all topics from all pillars
      const topics: FeaturedTopic[] = [];
      for (const pillar of (themesData.pillars || [])) {
        for (const theme of (pillar.themes || [])) {
          for (const topic of (theme.topics || [])) {
            topics.push({
              ...topic,
              pillar_color: pillar.color,
            });
          }
        }
      }
      setFeaturedTopics(topics);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <DueloHeader />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Salut, {pseudo || 'Joueur'} 👋</Text>

        {/* Featured Topics */}
        {featuredTopics.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>À LA UNE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredTopics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.featuredCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/category-detail?id=${topic.category_id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.featuredCardInner, { borderColor: topic.pillar_color + '25' }]}>
                    <View style={[styles.featuredGlow, { backgroundColor: topic.pillar_color + '06', shadowColor: topic.pillar_color }]} />
                    <GlassIconFrame
                      iconUrl={topic.icon_url || undefined}
                      emoji={!topic.icon_url ? topic.icon : undefined}
                      size={60}
                      pillarColor={topic.pillar_color}
                      progress={0}
                      showRing={true}
                    />
                    <Text style={styles.featuredName} numberOfLines={2}>{topic.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionTitle}>CHOISIS TA CATÉGORIE</Text>

        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const color = CATEGORY_COLORS[cat.id] || '#8A2BE2';
            return (
              <TouchableOpacity
                key={cat.id}
                testID={`category-${cat.id}`}
                style={styles.categoryCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/category-detail?id=${cat.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryCardInner, { borderColor: color + '30' }]}>
                  <View style={[styles.categoryIconBox, { backgroundColor: color + '20' }]}>
                    <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat.id] || '❓'}</Text>
                  </View>
                  <Text style={[styles.categoryName, { color }]} numberOfLines={1}>{cat.name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 30 },

  greeting: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 20, marginBottom: 24, paddingHorizontal: GRID_PAD },

  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: '#525252', letterSpacing: 3,
    marginBottom: 16, paddingHorizontal: GRID_PAD,
  },

  // Featured topics
  featuredSection: { marginBottom: 24 },
  featuredScroll: { paddingHorizontal: 12, gap: 10 },
  featuredCard: { width: 120 },
  featuredCardInner: {
    width: '100%', borderRadius: 18, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, alignItems: 'center', minHeight: 140,
    overflow: 'hidden',
  },
  featuredGlow: {
    position: 'absolute', top: -20, left: -20, right: -20, height: 70,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  featuredName: { color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 15 },

  // Grid
  categoriesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PAD,
  },
  categoryCard: {
    width: '25%', padding: 5,
    alignItems: 'center',
  },
  categoryCardInner: {
    width: '100%', borderRadius: 16, padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  categoryIconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  categoryIcon: { fontSize: 26 },
  categoryName: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  categoryCount: { fontSize: 10, color: '#525252', fontWeight: '600' },
});
