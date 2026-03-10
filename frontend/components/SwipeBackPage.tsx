import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const SPRING_CONFIG = { damping: 22, stiffness: 220, mass: 0.8 };

interface SwipeBackPageProps {
  children: React.ReactNode;
}

export default function SwipeBackPage({ children }: SwipeBackPageProps) {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const translateX = useSharedValue(0);

  const goBack = () => {
    router.back();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(20)       // Activate after 20px horizontal movement
    .failOffsetX(-10)        // Fail if user swipes left
    .failOffsetY([-15, 15])  // Fail if user scrolls vertically
    .onUpdate((e) => {
      'worklet';
      // Only allow right swipe (positive translation)
      translateX.value = Math.max(0, e.translationX);
    })
    .onEnd((e) => {
      'worklet';
      const threshold = SCREEN_WIDTH * 0.3;
      if (
        e.translationX > threshold ||
        (e.translationX > 40 && e.velocityX > 500)
      ) {
        // Swipe completed - slide page out to the right then navigate back
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 220 }, () => {
          runOnJS(goBack)();
        });
      } else {
        // Swipe cancelled - spring back to original position
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Dim overlay behind the page that becomes visible during swipe
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SCREEN_WIDTH * 0.5],
      [0, 0.5],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.container}>
      {/* Subtle overlay visible when page is being swiped */}
      <Animated.View style={[styles.dimOverlay, overlayStyle]} pointerEvents="none" />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.page, pageStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020208',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a1a',
  },
  page: {
    flex: 1,
    backgroundColor: '#050510',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -8, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '-10px 0px 30px rgba(0, 0, 0, 0.7)',
      } as any,
    }),
  },
});
