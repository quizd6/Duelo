import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const TIMER_DURATION = 10;
const TOTAL_QUESTIONS = 7;

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
};

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string; opponentPseudo: string; opponentSeed: string; isBot: string;
  }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [botAnswer, setBotAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [loading, setLoading] = useState(true);
  const [pseudo, setPseudo] = useState('Joueur');
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastBotCorrect, setLastBotCorrect] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const questionFade = useRef(new Animated.Value(0)).current;

  // Left/right bar heights animated
  const leftBarAnim = useRef(new Animated.Value(0)).current;
  const rightBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPseudo();
    fetchQuestions();
  }, []);

  const loadPseudo = async () => {
    const p = await AsyncStorage.getItem('duelo_pseudo');
    if (p) setPseudo(p);
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/game/questions?category=${params.category}`);
      const data = await res.json();
      setQuestions(data.slice(0, TOTAL_QUESTIONS));
      setLoading(false);
      animateQuestion();
      startTimer();
    } catch {
      router.back();
    }
  };

  const animateQuestion = () => {
    questionFade.setValue(0);
    Animated.timing(questionFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const startTimer = () => {
    setTimeLeft(TIMER_DURATION);
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0, duration: TIMER_DURATION * 1000, useNativeDriver: false,
    }).start();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    setShowResult(true);
    setLastCorrect(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Bot might answer
    const question = questions[currentIndex];
    const botCorrect = Math.random() > 0.4;
    if (botCorrect) {
      setBotAnswer(question.correct_option);
      const botPts = Math.floor(Math.random() * 11) + 10;
      setOpponentScore(prev => prev + botPts);
      setLastBotCorrect(true);
    } else {
      const wrongOptions = [0,1,2,3].filter(i => i !== question.correct_option);
      setBotAnswer(wrongOptions[Math.floor(Math.random() * wrongOptions.length)]);
      setLastBotCorrect(false);
    }

    // Animate bars
    animateBars(false, botCorrect);
    setTimeout(nextQuestion, 2000);
  };

  const animateBars = (playerCorrect: boolean, botCorrect: boolean) => {
    // Left bar = player, Right bar = bot
    Animated.timing(leftBarAnim, {
      toValue: playerCorrect ? 1 : -1,
      duration: 300, useNativeDriver: false,
    }).start();
    Animated.timing(rightBarAnim, {
      toValue: botCorrect ? 1 : -1,
      duration: 300, useNativeDriver: false,
    }).start();
  };

  const selectAnswer = useCallback((optionIndex: number) => {
    if (selectedOption !== null || showResult) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(optionIndex);
    setShowResult(true);

    const question = questions[currentIndex];
    const isCorrect = optionIndex === question.correct_option;
    const timeTaken = TIMER_DURATION - timeLeft;
    const points = isCorrect ? Math.max(20 - timeTaken, 10) : 0;

    setLastCorrect(isCorrect);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPlayerScore(prev => prev + points);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Bot answer
    const botCorrect = Math.random() > 0.35;
    if (botCorrect) {
      setBotAnswer(question.correct_option);
      const botTime = Math.floor(Math.random() * 7) + 2;
      setOpponentScore(prev => prev + Math.max(20 - botTime, 10));
      setLastBotCorrect(true);
    } else {
      const wrongOptions = [0,1,2,3].filter(i => i !== question.correct_option);
      setBotAnswer(wrongOptions[Math.floor(Math.random() * wrongOptions.length)]);
      setLastBotCorrect(false);
    }

    animateBars(isCorrect, botCorrect);
    setTimeout(nextQuestion, 2000);
  }, [selectedOption, showResult, currentIndex, questions, timeLeft]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      endGame();
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setSelectedOption(null);
    setBotAnswer(null);
    setShowResult(false);
    setLastCorrect(null);
    setLastBotCorrect(null);
    leftBarAnim.setValue(0);
    rightBarAnim.setValue(0);
    animateQuestion();
    startTimer();
  };

  const endGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const userId = await AsyncStorage.getItem('duelo_user_id');
    router.replace(
      `/results?playerScore=${playerScore}&opponentScore=${opponentScore}&opponentPseudo=${params.opponentPseudo}&category=${params.category}&userId=${userId}&isBot=${params.isBot}`
    );
  };

  if (loading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingView}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const question = questions[currentIndex];
  const progress = (currentIndex) / questions.length;

  const getOptionStyle = (index: number) => {
    if (!showResult) return {};
    const isCorrect = index === question.correct_option;
    const isPlayerPick = index === selectedOption;
    if (isCorrect) return { borderColor: '#00C853', borderWidth: 2 };
    if (isPlayerPick && !isCorrect) return { borderColor: '#FF3B30', borderWidth: 2 };
    return {};
  };

  const getOptionTextColor = (index: number) => {
    if (!showResult) return '#1A1A1A';
    if (index === question.correct_option) return '#00C853';
    if (index === selectedOption) return '#FF3B30';
    return '#888';
  };

  return (
    <View style={styles.container}>
      {/* ── Progress Bar (Violet) ── */}
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, {
          width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
        <View style={[styles.progressBarDone, { width: `${progress * 100}%` }]} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Header: Players + Timer ── */}
        <View style={styles.headerRow}>
          {/* Player (Left) */}
          <View style={styles.playerInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{pseudo[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.playerMeta}>
              <Text style={styles.playerName} numberOfLines={1}>{pseudo}</Text>
              <Text style={styles.playerTitle}>Challenger</Text>
              <Text style={styles.playerScoreText}>{playerScore}</Text>
            </View>
          </View>

          {/* Timer (Center) */}
          <View style={styles.timerCenter}>
            <Text style={styles.timerLabel}>Temps restant</Text>
            <View style={[styles.timerCircle, timeLeft <= 3 && styles.timerDanger]}>
              <Text style={[styles.timerNumber, timeLeft <= 3 && styles.timerNumberDanger]}>
                {timeLeft}
              </Text>
            </View>
          </View>

          {/* Opponent (Right) */}
          <View style={styles.opponentInfo}>
            <View style={styles.playerMeta}>
              <Text style={styles.playerName} numberOfLines={1}>
                {params.opponentPseudo?.slice(0, 10)}
              </Text>
              <Text style={styles.playerTitle}>Bot</Text>
              <Text style={styles.opponentScoreText}>{opponentScore}</Text>
            </View>
            <View style={[styles.avatarCircle, styles.avatarOpponent]}>
              <Text style={styles.avatarLetter}>
                {(params.opponentPseudo || 'B')[0]?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Question Counter ── */}
        <Text style={styles.questionCounter}>Question {currentIndex + 1}/{questions.length}</Text>

        {/* ── Main Game Area with Side Bars ── */}
        <View style={styles.gameArea}>
          {/* Left Score Bar (Player) */}
          <View style={styles.sideBarContainer}>
            <View style={styles.sideBarTrack}>
              <Animated.View style={[styles.sideBarFill, {
                backgroundColor: leftBarAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ['#FF3B30', '#333', '#00C853'],
                }),
                height: leftBarAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ['60%', '10%', '60%'],
                }),
              }]} />
            </View>
          </View>

          {/* Center Content */}
          <View style={styles.centerContent}>
            {/* Question */}
            <Animated.View style={[styles.questionBox, { opacity: questionFade }]}>
              <Text style={styles.questionText}>{question.question_text}</Text>
            </Animated.View>

            {/* Answer Options */}
            <View style={styles.optionsBox}>
              {question.options.map((option, index) => {
                const isPlayerPick = selectedOption === index;
                const isBotPick = botAnswer === index;

                return (
                  <View key={index} style={styles.optionRow}>
                    {/* Left triangle (player pick) */}
                    <View style={styles.triangleSpace}>
                      {showResult && isPlayerPick && (
                        <View style={styles.triangleLeft} />
                      )}
                    </View>

                    {/* Answer Card */}
                    <TouchableOpacity
                      testID={`option-${index}`}
                      style={[styles.optionCard, getOptionStyle(index)]}
                      onPress={() => selectAnswer(index)}
                      disabled={showResult}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.optionText, { color: getOptionTextColor(index) }]} numberOfLines={2}>
                        {option}
                      </Text>
                    </TouchableOpacity>

                    {/* Right triangle (bot pick) */}
                    <View style={styles.triangleSpace}>
                      {showResult && isBotPick && (
                        <View style={styles.triangleRight} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Right Score Bar (Opponent) */}
          <View style={styles.sideBarContainer}>
            <View style={styles.sideBarTrack}>
              <Animated.View style={[styles.sideBarFill, {
                backgroundColor: rightBarAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ['#FF3B30', '#333', '#00C853'],
                }),
                height: rightBarAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ['60%', '10%', '60%'],
                }),
              }]} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  safeArea: { flex: 1 },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFF', fontSize: 16 },

  // ── Progress Bar ──
  progressBarBg: {
    height: 5, backgroundColor: '#333', width: '100%',
  },
  progressBarFill: {
    position: 'absolute', height: 5, backgroundColor: '#8A2BE2',
    borderTopRightRadius: 3, borderBottomRightRadius: 3,
  },
  progressBarDone: {
    position: 'absolute', height: 5, backgroundColor: '#6B21A8',
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  opponentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarOpponent: { backgroundColor: '#2196F3' },
  avatarLetter: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  playerMeta: { marginHorizontal: 8 },
  playerName: { color: '#FFF', fontSize: 13, fontWeight: '700', maxWidth: 80 },
  playerTitle: { color: '#888', fontSize: 10, fontWeight: '500' },
  playerScoreText: { color: '#00C853', fontSize: 20, fontWeight: '900' },
  opponentScoreText: { color: '#00C853', fontSize: 20, fontWeight: '900', textAlign: 'right' },

  // ── Timer ──
  timerCenter: { alignItems: 'center', paddingHorizontal: 8 },
  timerLabel: { color: '#888', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  timerCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 3, borderColor: '#00BFFF',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,191,255,0.1)',
  },
  timerDanger: { borderColor: '#FF3B30', backgroundColor: 'rgba(255,59,48,0.1)' },
  timerNumber: { color: '#00BFFF', fontSize: 22, fontWeight: '900' },
  timerNumberDanger: { color: '#FF3B30' },

  // ── Question Counter ──
  questionCounter: {
    color: '#666', fontSize: 11, fontWeight: '700', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 2, paddingVertical: 6,
  },

  // ── Game Area ──
  gameArea: { flex: 1, flexDirection: 'row' },

  // ── Side Bars ──
  sideBarContainer: {
    width: 14, justifyContent: 'flex-end', alignItems: 'center',
    paddingBottom: 20, paddingTop: 20,
  },
  sideBarTrack: {
    width: 10, flex: 1, backgroundColor: '#222',
    borderRadius: 5, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sideBarFill: {
    width: '100%', borderRadius: 5,
  },

  // ── Center Content ──
  centerContent: { flex: 1, paddingHorizontal: 4 },

  // ── Question ──
  questionBox: {
    paddingHorizontal: 16, paddingVertical: 16,
    justifyContent: 'center', alignItems: 'center',
    minHeight: 80,
  },
  questionText: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '800',
    textAlign: 'center', lineHeight: 28,
  },

  // ── Options ──
  optionsBox: { flex: 1, justifyContent: 'center', gap: 10, paddingBottom: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  triangleSpace: { width: 20, alignItems: 'center', justifyContent: 'center' },
  triangleLeft: {
    width: 0, height: 0,
    borderTopWidth: 12, borderTopColor: 'transparent',
    borderBottomWidth: 12, borderBottomColor: 'transparent',
    borderRightWidth: 14, borderRightColor: '#000000',
  },
  triangleRight: {
    width: 0, height: 0,
    borderTopWidth: 12, borderTopColor: 'transparent',
    borderBottomWidth: 12, borderBottomColor: 'transparent',
    borderLeftWidth: 14, borderLeftColor: '#000000',
  },
  optionCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingVertical: 16, paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center',
    minHeight: 56, borderWidth: 1, borderColor: '#E0E0E0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  optionText: {
    fontSize: 17, fontWeight: '800', textAlign: 'center',
    color: '#1A1A1A',
  },
});
