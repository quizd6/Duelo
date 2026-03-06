import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';

function TabIcon({ label, focused, icon }: { label: string; focused: boolean; icon: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

function PlayTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.playTabWrap}>
      <View style={[styles.playTabCircle, focused && styles.playTabCircleActive]}>
        <Text style={styles.playTabIcon}>⚔️</Text>
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive, { marginTop: 4 }]}>Jouer</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#8A2BE2',
        tabBarInactiveTintColor: '#525252',
      }}
    >
      <Tabs.Screen
        name="accueil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Accueil" focused={focused} icon="🏠" />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Joueurs" focused={focused} icon="👥" />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <PlayTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="themes"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Thèmes" focused={focused} icon="📚" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profil" focused={focused} icon="👤" />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    elevation: 0,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  tabIcon: { fontSize: 22 },
  tabIconActive: { transform: [{ scale: 1.15 }] },
  tabLabel: { fontSize: 10, color: '#525252', marginTop: 4, fontWeight: '600' },
  tabLabelActive: { color: '#8A2BE2' },
  activeIndicator: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#8A2BE2', marginTop: 4,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  playTabWrap: { alignItems: 'center', justifyContent: 'center', marginTop: -12 },
  playTabCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  playTabCircleActive: {
    backgroundColor: '#9B3FFF',
    shadowOpacity: 0.8, shadowRadius: 16,
  },
  playTabIcon: { fontSize: 24 },
});
