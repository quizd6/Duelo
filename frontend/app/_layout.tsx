import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SwipeBackProvider } from '../components/SwipeBackContext';

// All stack pages that support swipe-back with transparent overlay
const SWIPEABLE_SCREENS = [
  'search', 'conversations', 'notifications',
  'chat', 'player-profile', 'category-detail',
  'results', 'matchmaking', 'game',
  'super-category', 'notification-settings',
];

const swipeableScreenOptions = {
  headerShown: false,
  presentation: 'containedTransparentModal' as const,
  animation: 'none' as const,
  contentStyle: { backgroundColor: 'transparent' },
  gestureEnabled: false,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SwipeBackProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050510' },
            animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
            animationDuration: 300,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          {SWIPEABLE_SCREENS.map((name) => (
            <Stack.Screen key={name} name={name} options={swipeableScreenOptions} />
          ))}
        </Stack>
      </SwipeBackProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050510',
  },
});
