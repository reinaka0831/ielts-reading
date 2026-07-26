import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { fullReadingSets } from '../data/fullReadingSets';
import { readingSets } from '../data/readingSets';
import type { ReadingData } from '../data/types';


const highlightText = (
  text: string,
  keywords: string[]
) => {
  if (keywords.length === 0) {
    return text;
  }

  const escapedKeywords = keywords.map((keyword) =>
    keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  const pattern = new RegExp(
    `(${escapedKeywords.join('|')})`,
    'gi'
  );

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isHighlighted = keywords.some(
      (keyword) =>
        keyword.toLowerCase() === part.toLowerCase()
    );

    return (
      <Text
        key={`${part}-${index}`}
        style={
          isHighlighted
            ? styles.highlightedText
            : undefined
        }
      >
        {part}
      </Text>
    );
  });
};

export default function ReadingScreen() {
  const [readingData, setReadingData] = useState<ReadingData>(
    readingSets[0]!
  );
  const [questionNumber, setQuestionNumber] = useState(0);
  const [selected, setSelected] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [result, setResult] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [showPassage, setShowPassage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'quick' | 'full' | null>(null);
  const [typeStats, setTypeStats] = useState<
    Record<string, { correct: number; total: number }>
  >({});
  const [timeSelectionMode, setTimeSelectionMode] = useState<
    'quick' | 'full' | null
  >(null);
  const [showOthers, setShowOthers] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<
    {
      date: string;
      mode: 'quick' | 'full';
      score: number;
      total: number;
      percentage: number;
      elapsedSeconds: number;
      questionRecords: {
        questionNumber: number;
        questionType: string;
        isCorrect: boolean;
        timeSeconds: number;
        }[];
      }[]
    >([]);
  const [lastFlashcardState, setLastFlashcardState] = useState<{
     word: (typeof savedWords)[number];
    index: number;
  } | null>(null);
  const [questionRecords, setQuestionRecords] = useState<
    {
      questionNumber: number;
      questionType: string;
      isCorrect: boolean;
      timeSeconds: number;
    }[]
  >([]);
  const [showProgress, setShowProgress] = useState(false);
  const [progressMode, setProgressMode] = useState<'quick' | 'full'>('quick');
  const [progressPeriod, setProgressPeriod] = useState<
    'latest' | 'week' | 'all'
  >('latest');
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [flashcardHistory, setFlashcardHistory] = useState<string[]>([]);
  const flashcardPosition = useRef(
    new Animated.ValueXY()
  ).current;
  const [flashcardDeck, setFlashcardDeck] = useState<
    'learning' | 'relearn'
  >('learning');
  const [savedWords, setSavedWords] = useState<
    {
      id: string;
      word: string;
      meaning: string;
      status: 'learning' | 'learned';
      reviewLevel: number;
      nextReviewDate: string;
      createdAt: string;
      deck: 'learning' | 'relearn';
      lapseCount: number;
    }[]
  >([]);
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  


  useEffect(() => {
    if (!timerRunning || finished || result !== '') {
      return;
    }
  
    const timer = setInterval(() => {
      setElapsedSeconds((previousSeconds) => previousSeconds + 1);
    }, 1000);
  
    return () => clearInterval(timer);
  }, [timerRunning, finished, result]);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
  
    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds
    ).padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadScoreHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('scoreHistory');
  
        if (savedHistory) {
          setScoreHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('成績履歴の読み込みに失敗しました', error);
      }
    };
  
    loadScoreHistory();
  }, []);

  useEffect(() => {
    const loadSavedWords = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedWords');
  
        if (saved) {
          setSavedWords(JSON.parse(saved));
        }
      } catch (error) {
        console.error('単語データの読み込みに失敗しました', error);
      }
    };
  
    loadSavedWords();
  }, []);

  const getJapaneseMeaning = async (word: string) => {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          word
        )}&langpair=en|ja`
      );
  
      if (!response.ok) {
        throw new Error('Translation request failed');
      }
  
      const data = await response.json();
  
      return (
        data?.responseData?.translatedText ??
        '意味を取得できませんでした'
      );
    } catch (error) {
      console.error('日本語訳の取得に失敗しました', error);
      return '意味を取得できませんでした';
    }
  };

  const saveWordsToStorage = async (
    words: typeof savedWords
  ) => {
    try {
      await AsyncStorage.setItem(
        'savedWords',
        JSON.stringify(words)
      );
  
      setSavedWords(words);
    } catch (error) {
      console.error('単語データの保存に失敗しました', error);
    }
  };
  
  const exportVocabularyPdf = async (
    wordsToExport: typeof savedWords,
    title: string
  ) => {
    if (wordsToExport.length === 0) {
      return;
    }
  
    const vocabularyRows = wordsToExport
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.word}</td>
            <td>${item.meaning}</td>
          </tr>
        `
      )
      .join('');
  
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
            }
  
            h1 {
              text-align: center;
              margin-bottom: 24px;
            }
  
            table {
              width: 100%;
              border-collapse: collapse;
            }
  
            th,
            td {
              border: 1px solid #333333;
              padding: 10px;
              text-align: left;
            }
  
            th {
              background-color: #eeeeee;
            }
          </style>
        </head>
  
        <body>
          <h1>${title}</h1>
  
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>English</th>
                <th>Japanese Meaning</th>
              </tr>
            </thead>
  
            <tbody>
              ${vocabularyRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  
    try {
      const { uri } = await Print.printToFileAsync({
        html,
      });
  
      const sharingAvailable =
        await Sharing.isAvailableAsync();
  
      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'IELTS Vocabulary PDF',
          UTI: '.pdf',
        });
      }
    } catch (error) {
      console.error('PDFの作成に失敗しました', error);
    }
  };

  const updateSavedWord = (
    id: string,
    field: 'meaning' | 'example',
    value: string
  ) => {
    const updatedWords = savedWords.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: value,
          }
        : item
    );
  
    saveWordsToStorage(updatedWords);
  };

  const currentQuestion = readingData?.questions?.[questionNumber];
  if (mode !== null && !currentQuestion) {
    return (
      <View style={styles.modeContainer}>
        <Text>問題データを読み込めませんでした。</Text>
      </View>
    );
  }

  const inputQuestionTypes = [
    'summary-completion',
    'sentence-completion',
    'table-completion',
    'flow-chart-completion',
    'diagram-label-completion',
    'short-answer',
  ];
  
  const isInputQuestion = inputQuestionTypes.includes(
    currentQuestion.type
  );
  const answerLetters = ['A', 'B', 'C', 'D'];

  const recordTypeResult = (
    questionType: string,
    isCorrect: boolean
  ) => {
    setTypeStats((previousStats) => {
      const currentStats = previousStats[questionType] ?? {
        correct: 0,
        total: 0,
      };
  
      return {
        ...previousStats,
        [questionType]: {
          correct:
            currentStats.correct + (isCorrect ? 1 : 0),
          total: currentStats.total + 1,
        },
      };
    });
  };

  const checkAnswer = () => {
    const timeSpent =
      questionStartTime !== null
        ? Math.floor((Date.now() - questionStartTime) / 1000)
        : 0;
    if (result) {
      return;
    }

    const saveQuestionRecord = (isCorrect: boolean) => {
      setQuestionRecords((previousRecords) => [
        ...previousRecords,
        {
          questionNumber: questionNumber + 1,
          questionType: currentQuestion.type,
          isCorrect,
          timeSeconds: timeSpent,
        },
      ]);
    };

    if (isInputQuestion) {
      const userAnswer = typedAnswer.trim().toLowerCase();
  
      if (!userAnswer) {
        setResult('回答を入力してください。');
        return;
      }
  
      const correctAnswers = (
        currentQuestion.acceptableAnswers ?? [
          currentQuestion.correctAnswer,
        ]
      ).map((answer) => answer.trim().toLowerCase());
  
      if (correctAnswers.includes(userAnswer)) {
        setResult('Correct!');
        setScore((previousScore) => previousScore + 1);
        recordTypeResult(currentQuestion.type, true);
        saveQuestionRecord(true);
      } else {
        setResult('Incorrect');
        recordTypeResult(currentQuestion.type, false);
        saveQuestionRecord(false);
      }
  
      return;
    }
  
    if (!selected) {
      setResult('回答を選択してください。');
      return;
    }
  
    if (selected === currentQuestion.correctAnswer) {
      setResult('Correct!');
      setScore((previousScore) => previousScore + 1);
      recordTypeResult(currentQuestion.type, true);
      saveQuestionRecord(true);
    } else {
      setResult('Incorrect');
      recordTypeResult(currentQuestion.type, false);
      saveQuestionRecord(false);
    }
  };

  const nextQuestion = async () => {
    if (questionNumber === readingData.questions.length - 1) {
      const totalQuestions = readingData.questions.length;
  
      const newRecord = {
        date: new Date().toISOString(),
        mode: mode ?? 'quick',
        score: score,
        total: totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        elapsedSeconds: elapsedSeconds,
        questionRecords: questionRecords,
      };
  
      const updatedHistory = [...scoreHistory, newRecord];
  
      try {
        await AsyncStorage.setItem(
          'scoreHistory',
          JSON.stringify(updatedHistory)
        );
  
        setScoreHistory(updatedHistory);
      } catch (error) {
        console.error('成績履歴の保存に失敗しました', error);
      }
      setTimerRunning(false);
      setFinished(true);
      return;
    }
  
    setQuestionNumber((previousNumber) => previousNumber + 1);
    setSelected('');
    setTypedAnswer('');
    setResult('');
    setQuestionStartTime(Date.now());
  };

  const restartQuiz = () => {
    setQuestionNumber(0);
    setSelected('');
    setTypedAnswer('');
    setResult('');
    setScore(0);
    setFinished(false);
    setTypeStats({});
    setElapsedSeconds(0);
    setTimerRunning(false);
    setQuestionStartTime(null);
    setQuestionRecords([]);
  };

  const generateReading = () => {
    const activeSets =
      mode === 'full'
        ? fullReadingSets
        : readingSets;
  
    if (activeSets.length === 0) {
      return;
    }
  
    let nextReading = activeSets[0]!;
  
    if (activeSets.length > 1) {
      do {
        const randomIndex = Math.floor(
          Math.random() * activeSets.length
        );
  
        nextReading = activeSets[randomIndex]!;
      } while (nextReading.id === readingData.id);
    }
  
    setReadingData(nextReading);
    restartQuiz();
  };

  const startPractice = (
    selectedMode: 'quick' | 'full',
    minutes: number
  ) => {
    const availableSets =
      selectedMode === 'quick' ? readingSets : fullReadingSets;
  
    if (availableSets.length === 0) {
      return;
    }
  
    const randomIndex = Math.floor(
      Math.random() * availableSets.length
    );
  
    const selectedPassage = availableSets[randomIndex];
  
    if (!selectedPassage) {
      return;
    }
  
    setReadingData(selectedPassage);
    restartQuiz();
  
    setSelectedTimeLimit(minutes * 60);
    setElapsedSeconds(0);
    setTimerRunning(true);
    setQuestionStartTime(Date.now());
  
    setMode(selectedMode);
    setTimeSelectionMode(null);
  };

  

  if (mode === null) {
    const filteredProgressHistory = scoreHistory.filter((record) => {
      if (record.mode !== progressMode) {
        return false;
      }
    
      if (progressPeriod === 'all') {
        return true;
      }
    
      if (progressPeriod === 'latest') {
        const latestRecord = [...scoreHistory]
          .reverse()
          .find((item) => item.mode === progressMode);
    
        return latestRecord?.date === record.date;
      }
    
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
      return new Date(record.date) >= oneWeekAgo;
    });

    const filteredQuestionRecords = filteredProgressHistory.flatMap(
      (record) => record.questionRecords ?? []
    );
    
    const totalAnswered = filteredQuestionRecords.length;
    
    const totalCorrect = filteredQuestionRecords.filter(
      (record) => record.isCorrect
    ).length;
    
    const progressAccuracy =
      totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0;
    
    const averageQuestionTime =
      totalAnswered > 0
        ? Math.round(
            filteredQuestionRecords.reduce(
              (total, record) => total + record.timeSeconds,
              0
            ) / totalAnswered
          )
        : 0;
    
    const shortestQuestionTime =
      totalAnswered > 0
        ? Math.min(
            ...filteredQuestionRecords.map(
              (record) => record.timeSeconds
            )
          )
        : 0;

    const questionTypeStats = Object.values(
      filteredQuestionRecords.reduce<
        Record<
          string,
          {
            type: string;
            correct: number;
            incorrect: number;
            totalTime: number;
            shortestTime: number;
          }
        >
      >((stats, record) => {
        if (!stats[record.questionType]) {
          stats[record.questionType] = {
            type: record.questionType,
            correct: 0,
            incorrect: 0,
            totalTime: 0,
            shortestTime: record.timeSeconds,
          };
        }

        if (record.isCorrect) {
          stats[record.questionType].correct += 1;
        } else {
          stats[record.questionType].incorrect += 1;
        }

        stats[record.questionType].totalTime += record.timeSeconds;

        stats[record.questionType].shortestTime = Math.min(
          stats[record.questionType].shortestTime,
          record.timeSeconds
        );

        return stats;
      }, {})
    );

    const maximumAnswerCount = Math.max(
      1,
      ...questionTypeStats.map(
        (stat) => stat.correct + stat.incorrect
      )
    );

    const reviewWords = savedWords.filter((item) => {
      const isDue =
        new Date(item.nextReviewDate).getTime() <= Date.now();
    
      const itemDeck = item.deck ?? 'learning';
    
      if (itemDeck !== flashcardDeck) {
        return false;
      }
    
      return item.status === 'learning' || isDue;
    });
    
    const currentFlashcard =
      reviewWords[currentFlashcardIndex];

      const moveToNextFlashcard = () => {
        setIsFlashcardFlipped(false);
      
        if (currentFlashcardIndex < reviewWords.length - 1) {
          setCurrentFlashcardIndex((previous) => previous + 1);
        } else {
          setCurrentFlashcardIndex(0);
        }
      };

      const markFlashcardLearning = async () => {
        if (!currentFlashcard) {
          return;
        }

        setLastFlashcardState({
          word: currentFlashcard,
          index: currentFlashcardIndex,
        });
      
        const updatedWords = savedWords.map((item) =>
          item.id === currentFlashcard.id
            ? {
                ...item,
                status: 'learning' as const,
                reviewLevel: 0,
                nextReviewDate: new Date().toISOString(),
              }
            : item
        );
      
        await saveWordsToStorage(updatedWords);

        setIsFlashcardFlipped(false);

        if (currentFlashcardIndex < reviewWords.length - 1) {
          setCurrentFlashcardIndex((previous) => previous + 1);
        } else {
          setCurrentFlashcardIndex(0);
        }
      }

      const markFlashcardLearned = async () => {
        if (!currentFlashcard) {
          return;
        }

        setLastFlashcardState({
          word: currentFlashcard,
          index: currentFlashcardIndex,
        });
      
        const reviewIntervals = [1, 3, 7, 14];

        const currentLevel = Math.min(
          currentFlashcard.reviewLevel,
          reviewIntervals.length - 1
        );

        const nextReviewDate = new Date();
        nextReviewDate.setDate(
          nextReviewDate.getDate() + reviewIntervals[currentLevel]
        );

        const nextLevel = Math.min(
          currentLevel + 1,
          reviewIntervals.length - 1
        );
      
        const updatedWords = savedWords.map((item) =>
          item.id === currentFlashcard.id
            ? {
                ...item,
                status: 'learned' as const,
                reviewLevel: nextLevel,
                nextReviewDate: nextReviewDate.toISOString(),
              }
            : item
        );
      
        await saveWordsToStorage(updatedWords);
        setCurrentFlashcardIndex(0);
        setIsFlashcardFlipped(false);
      };

      const undoLastFlashcard = async () => {
        if (!lastFlashcardState) {
          return;
        }
      
        const updatedWords = savedWords.map((item) =>
          item.id === lastFlashcardState.word.id
            ? lastFlashcardState.word
            : item
        );
      
        await saveWordsToStorage(updatedWords);
      
        setCurrentFlashcardIndex(lastFlashcardState.index);
        setIsFlashcardFlipped(false);
        setLastFlashcardState(null);
      
        flashcardPosition.setValue({ x: 0, y: 0 });
      };

      const flashcardPanResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
      
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 5,
      
        onPanResponderMove: (_, gestureState) => {
          flashcardPosition.setValue({
            x: gestureState.dx,
            y: 0,
          });
        },
      
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 120) {
            Animated.timing(flashcardPosition, {
              toValue: { x: 500, y: 0 },
              duration: 200,
              useNativeDriver: true,
            }).start(async () => {
              await markFlashcardLearned();
              flashcardPosition.setValue({ x: 0, y: 0 });
            });
      
            return;
          }
      
          if (gestureState.dx < -120) {
            Animated.timing(flashcardPosition, {
              toValue: { x: -500, y: 0 },
              duration: 200,
              useNativeDriver: true,
            }).start(async () => {
              await markFlashcardLearning();
              flashcardPosition.setValue({ x: 0, y: 0 });
            });
      
            return;
          }
      
          Animated.spring(flashcardPosition, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        },
      });

      const sessionSavedWords = savedWords.filter((item) =>
        sessionWords.includes(item.word)
      );

      if (showHowToUse) {
        <TouchableOpacity
          style={styles.topBackButton}
          onPress={() => {
            setShowHowToUse(false);
            setShowOthers(true);
          }}
        >
          <Text style={styles.topBackButtonText}>← 戻る</Text>
        </TouchableOpacity>
        return (
          <ScrollView
            style={{ flex: 1, backgroundColor: '#ffffff' }}
            contentContainerStyle={styles.howToUseContainer}
          >
            <TouchableOpacity
              style={styles.topBackButton}
              onPress={() => {
                setShowHowToUse(false);
                setShowOthers(true);
              }}
            >
              <Text style={styles.topBackButtonText}>← 戻る</Text>
            </TouchableOpacity>

            <Text style={styles.modeTitle}>使い方</Text>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>1. 問題を解く</Text>
              <Text style={styles.howToUseText}>
                Quick PracticeまたはFull Practiceを選び、制限時間を設定します。
                答え合わせ後、解説を確認している間はタイマーが一時停止します。
              </Text>
            </View>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>2. 成績を確認する</Text>
              <Text style={styles.howToUseText}>
                正答率、問題数、平均回答時間、最短回答時間を確認できます。
                QuickとFull、前回・過去7日間・全期間を切り替えられます。
                問題形式ごとの正解数と不正解数も棒グラフで表示されます。
              </Text>
            </View>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>3. 分からない単語を保存する</Text>
              <Text style={styles.howToUseText}>
                問題を解いている途中で分からない英単語を入力し、
                Add to Flashcardsを押してください。
                日本語の意味は自動で取得され、フラッシュカードに保存されます。
              </Text>
            </View>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>4. フラッシュカードで復習する</Text>
              <Text style={styles.howToUseText}>
                カードをタップすると、英単語と日本語の意味を切り替えられます。
                左にスワイプすると覚えていない単語、右にスワイプすると
                覚えた単語として記録されます。
              </Text>
            </View>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>5. Relearnについて</Text>
              <Text style={styles.howToUseText}>
                一度覚えた単語を、別の問題でもう一度分からない単語として
                追加すると、Relearnに移動します。
                忘れやすい単語だけを分けて復習できます。
              </Text>
            </View>
      
            <View style={styles.howToUseCard}>
              <Text style={styles.howToUseTitle}>6. 単語リストをPDFにする</Text>
              <Text style={styles.howToUseText}>
                Export This Practiceでは今回保存した単語だけ、
                Export All Vocabularyでは今まで保存した全単語を
                PDFとして保存・共有・印刷できます。
              </Text>
            </View>
      
          </ScrollView>
        );
      }

      if (showFlashcards) {
        return (
          <View style={styles.modeContainer}>

            <TouchableOpacity
              style={styles.topBackButton}
              onPress={() => {
                setShowFlashcards(false);
                setShowOthers(true);
                setCurrentFlashcardIndex(0);
                setIsFlashcardFlipped(false);
              }}
            >
              <Text style={styles.topBackButtonText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modeTitle}>Flashcards</Text>

            <View style={styles.progressToggleRow}>
              <TouchableOpacity
                style={[
                  styles.progressToggleButton,
                  flashcardDeck === 'learning' &&
                    styles.progressToggleButtonActive,
                ]}
                onPress={() => {
                  setFlashcardDeck('learning');
                  setCurrentFlashcardIndex(0);
                  setIsFlashcardFlipped(false);
                }}
              >
                <Text style={styles.progressToggleText}>Learning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.progressToggleButton,
                  flashcardDeck === 'relearn' &&
                    styles.progressToggleButtonActive,
                ]}
                onPress={() => {
                  setFlashcardDeck('relearn');
                  setCurrentFlashcardIndex(0);
                  setIsFlashcardFlipped(false);
                }}
              >
                <Text style={styles.progressToggleText}>Relearn</Text>
              </TouchableOpacity>
            </View>
      
            <Text style={styles.modeSubtitle}>
              {reviewWords.length === 0
                ? 'No cards to review'
                : `${currentFlashcardIndex + 1} / ${reviewWords.length}`}
            </Text>
      
            {currentFlashcard ? (
              <>
                <Animated.View
                  {...flashcardPanResponder.panHandlers}
                  style={[
                    styles.flashcard,
                    {
                      transform: [
                        { translateX: flashcardPosition.x },
                        {
                          rotate: flashcardPosition.x.interpolate({
                            inputRange: [-200, 0, 200],
                            outputRange: ['-8deg', '0deg', '8deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.flashcardTouchable}
                    activeOpacity={0.9}
                    onPress={() =>
                      setIsFlashcardFlipped((previous) => !previous)
                    }
                  >
                    <Text style={styles.flashcardText}>
                      {isFlashcardFlipped
                        ? currentFlashcard.meaning
                        : currentFlashcard.word}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
      
                <Text style={styles.flashcardHint}>
                  Tap the card to flip
                </Text>
                <View style={styles.flashcardActionRow}>
                  <TouchableOpacity
                    style={[styles.flashcardActionButton, styles.learningButton]}
                    onPress={markFlashcardLearning}
                  >
                    <Text style={styles.flashcardActionText}>
                      ← Not Yet
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.flashcardActionButton, styles.learnedButton]}
                    onPress={markFlashcardLearned}
                  >
                    <Text style={styles.flashcardActionText}>
                      Learned →
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.undoFlashcardButton}
                    onPress={undoLastFlashcard}
                    disabled={!lastFlashcardState}
                  >
                    <Text style={styles.undoFlashcardButtonText}>
                      Undo
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>
                今日復習する単語はありません。
              </Text>
            )}
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                exportVocabularyPdf(
                  sessionSavedWords,
                  'Vocabulary from This Practice'
                )
              }
              disabled={sessionSavedWords.length === 0}
            >
              <Text style={styles.secondaryButtonText}>
                Export This Practice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                exportVocabularyPdf(
                  savedWords,
                  'All IELTS Vocabulary'
                )
              }
              disabled={savedWords.length === 0}
            >
              <Text style={styles.secondaryButtonText}>
                Export All Vocabulary
              </Text>
            </TouchableOpacity>

          </View>
        );
      }
    if (showProgress) {
      return (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.progressScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <TouchableOpacity
              style={styles.topBackButton}
              onPress={() => {
                setShowProgress(false);
                setShowOthers(true);
              }}
            >
              <Text style={styles.topBackButtonText}>← 戻る</Text>
            </TouchableOpacity>

          <Text style={styles.modeTitle}>Progress</Text>
    
          <Text style={styles.modeSubtitle}>
            Your reading performance
          </Text>
          <View style={styles.progressToggleRow}>
            <TouchableOpacity
              style={[
                styles.progressToggleButton,
                progressMode === 'quick' && styles.progressToggleButtonActive,
              ]}
              onPress={() => setProgressMode('quick')}
            >
              <Text style={styles.progressToggleText}>Quick</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.progressToggleButton,
                progressMode === 'full' && styles.progressToggleButtonActive,
              ]}
              onPress={() => setProgressMode('full')}
            >
              <Text style={styles.progressToggleText}>Full</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressToggleRow}>
            <TouchableOpacity
              style={[
                styles.progressToggleButton,
                progressPeriod === 'latest' && styles.progressToggleButtonActive,
              ]}
              onPress={() => setProgressPeriod('latest')}
            >
              <Text style={styles.progressToggleText}>Latest</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.progressToggleButton,
                progressPeriod === 'week' && styles.progressToggleButtonActive,
              ]}
              onPress={() => setProgressPeriod('week')}
            >
              <Text style={styles.progressToggleText}>7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.progressToggleButton,
                progressPeriod === 'all' && styles.progressToggleButtonActive,
              ]}
              onPress={() => setProgressPeriod('all')}
            >
              <Text style={styles.progressToggleText}>All Time</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressSummaryContainer}>
            <View style={styles.progressSummaryCard}>
              <Text style={styles.progressSummaryLabel}>Questions</Text>
              <Text style={styles.progressSummaryValue}>{totalAnswered}</Text>
            </View>

            <View style={styles.progressSummaryCard}>
              <Text style={styles.progressSummaryLabel}>Accuracy</Text>
              <Text style={styles.progressSummaryValue}>
                {progressAccuracy}%
              </Text>
            </View>

            <View style={styles.progressSummaryCard}>
              <Text style={styles.progressSummaryLabel}>Average Time</Text>
              <Text style={styles.progressSummaryValue}>
                {formatTime(averageQuestionTime)}
              </Text>
            </View>

            <View style={styles.progressSummaryCard}>
              <Text style={styles.progressSummaryLabel}>Shortest Time</Text>
              <Text style={styles.progressSummaryValue}>
                {formatTime(shortestQuestionTime)}
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Performance by Question Type</Text>

            {questionTypeStats.length === 0 ? (
              <Text style={styles.noDataText}>
                No practice data yet.
              </Text>
            ) : (
              questionTypeStats.map((stat) => {
                const totalQuestions = stat.correct + stat.incorrect;

                return (
                  <View key={stat.type} style={styles.chartItem}>
                    <Text style={styles.chartTypeText}>{stat.type}</Text>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartLabel}>Correct</Text>

                      <View style={styles.chartTrack}>
                        <View
                          style={[
                            styles.correctBar,
                            {
                              width: `${
                                (stat.correct / maximumAnswerCount) * 100
                              }%`,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.chartNumber}>{stat.correct}</Text>
                    </View>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartLabel}>Incorrect</Text>

                      <View style={styles.chartTrack}>
                        <View
                          style={[
                            styles.incorrectBar,
                            {
                              width: `${
                                (stat.incorrect / maximumAnswerCount) * 100
                              }%`,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.chartNumber}>{stat.incorrect}</Text>
                    </View>

                    <Text style={styles.chartTimeText}>
                      Average: {formatTime(
                        Math.round(stat.totalTime / totalQuestions)
                      )}　Shortest: {formatTime(stat.shortestTime)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

        </ScrollView>
      );
    }
    if (showOthers) {
      return (
        <View style={styles.modeContainer}>

          <TouchableOpacity
            style={styles.topBackButton}
            onPress={() => {
              setShowOthers(false);
            }}
          >
            <Text style={styles.topBackButtonText}>← 戻る</Text>
          </TouchableOpacity>

          <Text style={styles.modeTitle}>Others</Text>
    
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => {
              setShowProgress(true);
              setShowOthers(false);
            }}
          >
            <Text style={styles.modeCardTitle}>Progress</Text>

            <Text style={styles.modeCardText}>
              Check your scores, accuracy, and study time.
            </Text>
          </TouchableOpacity>
    
          <TouchableOpacity 
            style={styles.modeCard}
            onPress={() => {
              setShowFlashcards(true);
              setShowOthers(false);
            }}
          >
            <Text style={styles.modeCardTitle}>Flashcards</Text>
            <Text style={styles.modeCardText}>
              Review saved vocabulary.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => {
              setShowHowToUse(true);
              setShowOthers(false);
            }}
          >
            <Text style={styles.modeCardTitle}>How to Use</Text>

            <Text style={styles.modeCardText}>
              Learn how to use timers, progress, and flashcards.
            </Text>
          </TouchableOpacity>
    
        </View>
      );
    }
    if (timeSelectionMode !== null) {
      const timeOptions =
        timeSelectionMode === 'quick'
          ? [5, 6, 7, 8]
          : [18, 19, 20];
    
      return (
        <View style={styles.modeContainer}>

          <TouchableOpacity
            style={styles.topBackButton}
            onPress={() => setTimeSelectionMode(null)}
          >
            <Text style={styles.topBackButtonText}>← 戻る</Text>
          </TouchableOpacity>

          <Text style={styles.modeTitle}>Select Time Limit</Text>
    
          <Text style={styles.modeSubtitle}>
            {timeSelectionMode === 'quick'
              ? 'Quick Practice'
              : 'Full Practice'}
          </Text>
    
          {timeOptions.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={styles.modeCard}
              onPress={() =>
                startPractice(timeSelectionMode, minutes)
              }
            >
              <Text style={styles.modeCardTitle}>
                {minutes} minutes
              </Text>
            </TouchableOpacity>
          ))}

        </View>
      );
    }
    return (
      <View style={styles.modeContainer}>
        
      
        <Text style={styles.modeTitle}>IELTS Reading Practice</Text>
  
        <Text style={styles.modeSubtitle}>
          Choose your practice mode
        </Text>
  
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => {
            setTimeSelectionMode('quick');
          }}
        >
          <Text style={styles.modeCardTitle}>Quick Practice</Text>
  
          <Text style={styles.modeCardText}>
            Short passage ・ 5 questions
          </Text>
  
          <Text style={styles.modeCardTime}>
            About 5–8 minutes
          </Text>
        </TouchableOpacity>
  
        
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => {
            setTimeSelectionMode('full');
          }}
         >
          <Text style={styles.modeCardTitle}>Full Practice</Text>
  
          <Text style={styles.modeCardText}>
            Full-length passage ・ 13 questions
          </Text>
          <Text style={styles.modeCardTime}>
            About 18–20 minutes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => setShowOthers(true)}
        >
          <Text style={styles.modeCardTitle}>Others</Text>

          <Text style={styles.modeCardText}>
            Check your progress and review flashcards.
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPercentage = Math.round(
    (score / readingData.questions.length) * 100
  );
  
  const previousRecord = [...scoreHistory]
    .slice(0, -1)
    .reverse()
    .find((record) => record.mode === mode);
  
  const percentageDifference = previousRecord
    ? currentPercentage - previousRecord.percentage
    : null;
    const reviewAdvice = (() => {
      const totalQuestions = readingData.questions.length;
      const accuracy =
        totalQuestions > 0
          ? Math.round((score / totalQuestions) * 100)
          : 0;
    
      const weakestType = Object.entries(typeStats)
        .filter(([, stats]) => stats.total > 0)
        .sort(([, first], [, second]) => {
          const firstAccuracy = first.correct / first.total;
          const secondAccuracy = second.correct / second.total;
    
          return firstAccuracy - secondAccuracy;
        })[0];
    
      const isOverTime =
        selectedTimeLimit !== null &&
        elapsedSeconds > selectedTimeLimit;
    
      if (isOverTime && accuracy >= 80) {
        return '正答率は高いですが、制限時間を超えています。正確さは維持しながら、設問のキーワードを先に確認し、本文から言い換え表現を素早く探す練習をしましょう。';
      }
    
      if (accuracy >= 90) {
        return '非常に良い結果です。根拠を正確に見つけられています。次回は同じ正答率を保ちながら、さらに短い時間で解くことを目標にしましょう。';
      }
    
      if (accuracy >= 70 && !weakestType) {
        return '全体的によく理解できています。間違えた問題について、正解の根拠が本文のどこにあったかを確認すると、さらに安定します。';
      }
    
      if (weakestType) {
        const [questionType] = weakestType;
    
        if (
          questionType.includes('true-false') ||
          questionType.includes('not-given')
        ) {
          return 'True・False・Not Givenでは、本文に書かれていない情報を推測しないことが重要です。設問と本文の意味が完全に一致するかを確認しましょう。';
        }
    
        if (
          questionType.includes('multiple-choice') ||
          questionType.includes('matching')
        ) {
          return '選択肢の単語だけで判断せず、本文全体の意味と一致しているか確認しましょう。正解以外の選択肢がなぜ違うのかも振り返ると効果的です。';
        }
    
        if (
          questionType.includes('completion') ||
          questionType.includes('short-answer')
        ) {
          return '空欄補充・短答問題では、語数制限と文法上必要な品詞を確認しましょう。本文からそのまま抜き出せる表現を探すことが大切です。';
        }
    
        if (questionType.includes('heading')) {
          return '見出し問題では、細かい例よりも段落全体の中心的な主張を捉えましょう。最初と最後の文を特に意識してください。';
        }
      }
    
      if (accuracy < 50) {
        return '今回は正答率が低めでした。答えを急いで決めず、各問題で根拠となる一文を本文から確認してから回答しましょう。';
      }
    
      return '間違えた問題の根拠を本文で確認し、設問と本文の言い換え表現を整理しましょう。';
    })();

  if (finished) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Practice Complete!</Text>

        <View style={styles.card}>
          <Text style={styles.score}>
            Score: {score} / {readingData.questions.length}
          </Text>
          <Text style={styles.totalTimeText}>
            Total Time: {formatTime(elapsedSeconds)}
          </Text>
          {sessionWords.length > 0 && (
            <View style={styles.savedWordsResultContainer}>
              <Text style={styles.analysisTitle}>
                Saved Vocabulary
              </Text>

              {sessionWords.map((word) => {
                const savedItem = savedWords.find(
                  (item) => item.word === word
                );

                if (!savedItem) {
                  return null;
                }

                return (
                  <View
                    key={savedItem.id}
                    style={styles.savedWordResultCard}
                  >
                    <Text style={styles.savedWordTitle}>
                      {savedItem.word}
                    </Text>

                    <Text style={styles.savedWordMeaning}>
                      {savedItem.meaning}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {percentageDifference !== null ? (
            <Text style={styles.comparisonText}>
              前回比: {percentageDifference > 0 ? '+' : ''}
              {percentageDifference}%
            </Text>
          ) : (
            <Text style={styles.comparisonText}>
              初回の記録です
            </Text>
          )}
          <Text style={styles.analysisTitle}>
            問題形式ごとの結果
          </Text>

          {Object.entries(typeStats).map(
            ([questionType, stats]) => {
              const accuracy = Math.round(
                (stats.correct / stats.total) * 100
              );

              return (
                <View
                  key={questionType}
                  style={styles.analysisRow}
                >
                  <View style={styles.analysisTextArea}>
                    <Text style={styles.analysisType}>
                      {questionType
                        .replace(/-/g, ' ')
                        .toUpperCase()}
                    </Text>

                    <Text style={styles.analysisScore}>
                      {stats.correct} / {stats.total} 正解
                    </Text>
                  </View>

                  <Text style={styles.analysisPercentage}>
                    {accuracy}%
                  </Text>
                </View>
              );
            }
          )}
          {Object.entries(typeStats)
            .filter(
              ([, stats]) =>
                stats.correct / stats.total < 0.6
            )
            .map(([questionType]) => (
              <View
                key={`advice-${questionType}`}
                style={styles.weaknessBox}
              >
                <Text style={styles.weaknessTitle}>
                  要復習：
                  {questionType
                    .replace(/-/g, ' ')
                    .toUpperCase()}
                </Text>

                <Text style={styles.weaknessText}>
                  {questionType === 'true-false-not-given'
                    ? 'only、all、alwaysなどの限定語と、Not GivenとFalseの違いを復習しましょう。'
                    : questionType.includes('completion') ||
                        questionType === 'short-answer'
                      ? '語数制限と空所に必要な品詞を確認し、本文から正確に抜き出しましょう。'
                      : questionType.includes('matching')
                        ? '設問と本文の言い換えを探し、段落全体の主題を意識しましょう。'
                        : '選択肢の単語ではなく、本文と意味が完全に一致しているか確認しましょう。'}
                </Text>
              </View>
            ))}

          <Text style={styles.adviceTitle}>Review Advice</Text>

          <Text style={styles.adviceText}>
            {reviewAdvice}
          </Text>

          <TouchableOpacity style={styles.button} onPress={() => {
              restartQuiz();
              setElapsedSeconds(0);
              setQuestionStartTime(Date.now());
              setTimerRunning(true);
            }}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={generateReading}
          >
            <Text style={styles.secondaryButtonText}>
              Try Another Passage
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowFlashcards(true);
              setMode(null);
            }}
          >
            <Text style={styles.secondaryButtonText}>
              Flashcards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              restartQuiz();
              setMode(null);
            }}
          >
            <Text style={styles.backButtonText}>
              Back to Practice Modes
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: 40 },
      ]}
    >
      <TouchableOpacity
        style={styles.topBackButton}
        onPress={() => {
          setShowExitConfirmation(true);
        }}
      >
        <Text style={styles.topBackButtonText}>← 戻る</Text>
      </TouchableOpacity>
      {showExitConfirmation && (
        <View style={styles.exitConfirmationBox}>
          <Text style={styles.exitConfirmationTitle}>
            練習を終了しますか？
          </Text>

          <Text style={styles.exitConfirmationText}>
            ここまでの回答と今回の記録は保存されません。
          </Text>

          <View style={styles.exitConfirmationButtons}>
            <TouchableOpacity
              style={styles.cancelExitButton}
              onPress={() => setShowExitConfirmation(false)}
            >
              <Text style={styles.cancelExitButtonText}>
                キャンセル
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmExitButton}
              onPress={() => {
                setShowExitConfirmation(false);
                setTimerRunning(false);
                restartQuiz();
                setMode(null);
                setTimeSelectionMode(null);
              }}
            >
              <Text style={styles.confirmExitButtonText}>
                終了する
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.title}>IELTS Reading Practice</Text>

      {selectedTimeLimit !== null && (
        <View style={styles.timerContainer}>
          <Text
            style={[
              styles.timerText,
              elapsedSeconds > selectedTimeLimit && styles.overtimeText,
            ]}
          >
            {elapsedSeconds <= selectedTimeLimit
              ? formatTime(selectedTimeLimit - elapsedSeconds)
              : `+${formatTime(elapsedSeconds - selectedTimeLimit)}`}
          </Text>
        </View>
      )}

      {/* <TouchableOpacity
        style={styles.generateButton}
        onPress={generateReading}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Generate New Reading</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowPassage(!showPassage)}
      >
        <Text style={styles.toggleText}>
          {showPassage ? 'Hide Passage' : 'Show Passage'}
        </Text>
      </TouchableOpacity> */}

      {showPassage && (
        <View style={styles.passageCard}>
          <Text style={styles.passageTitle}>{readingData.title}</Text>
          <Text style={styles.metaText}>
            {readingData.topic} ・ {readingData.difficulty}
          </Text>
          <Text style={styles.passageText}>
            {result
              ? highlightText(
                  readingData.passage.trim(),
                  currentQuestion.keywords ?? []
                )
              : readingData.passage.trim()}
          </Text>
          <View style={styles.wordSaveArea}>
            <TextInput
              style={styles.wordInput}
              value={wordInput}
              onChangeText={setWordInput}
              placeholder="Enter an unknown word"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.wordSaveButton}
              onPress={async () => {
                const cleanWord = wordInput.trim().toLowerCase();

                if (!cleanWord) {
                  return;
                }

                if (!sessionWords.includes(cleanWord)) {
                  setSessionWords((previousWords) => [
                    ...previousWords,
                    cleanWord,
                  ]);
                }
                
                const existingWord = savedWords.find(
                  (item) => item.word === cleanWord
                );
                
                if (!existingWord) {
                  const japaneseMeaning =
                    await getJapaneseMeaning(cleanWord);
                  
                  const newWord = {
                    id: `${cleanWord}-${Date.now()}`,
                    word: cleanWord,
                    meaning: japaneseMeaning,
                    status: 'learning' as const,
                    reviewLevel: 0,
                    nextReviewDate: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    deck: 'learning' as const,
                    lapseCount: 0,
                  };
                  
                
                  saveWordsToStorage([...savedWords, newWord]);
                }

                if (
                  existingWord &&
                  existingWord.status === 'learned'
                ) {
                  const updatedWords = savedWords.map((item) =>
                    item.id === existingWord.id
                      ? {
                          ...item,
                          status: 'learning' as const,
                          deck: 'relearn' as const,
                          reviewLevel: 0,
                          lapseCount: (item.lapseCount ?? 0) + 1,
                          nextReviewDate: new Date().toISOString(),
                        }
                      : item
                  );
                
                  await saveWordsToStorage(updatedWords);
                }

                setWordInput('');
              }}
            >
              <Text style={styles.buttonText}>Add to Flashcards</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.progress}>
        Question {questionNumber + 1} / {readingData.questions.length}
      </Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${
                ((questionNumber + 1) / readingData.questions.length) * 100
              }%`,
            },
          ]}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.questionType}>
          {currentQuestion.type
            .replace(/-/g, ' ')
            .toUpperCase()}
        </Text>
        <Text style={styles.question}>
          {currentQuestion.question}
        </Text>

        {isInputQuestion ? (
  <TextInput
    style={styles.answerInput}
    value={typedAnswer}
    onChangeText={setTypedAnswer}
    placeholder="答えを英語で入力"
    editable={!result}
    autoCapitalize="none"
  />
) : (
  currentQuestion.options.map((option, index) => {
    const letter = answerLetters[index];

    return (
      <TouchableOpacity
        key={letter}
        style={[
          styles.option,
          selected === letter && styles.selectedOption,
        ]}
        onPress={() => {
          if (!result) {
            setSelected(letter);
          }
        }}
      >
        <Text style={styles.optionText}>
          {letter}. {option}
        </Text>
      </TouchableOpacity>
    );
  })
)}

        {!result ? (
          <TouchableOpacity style={styles.button} onPress={checkAnswer}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View
              style={[
                styles.feedbackBox,
                result === 'Correct!'
                  ? styles.correctBox
                  : styles.incorrectBox,
              ]}
            >
              <Text style={styles.feedbackTitle}>{result}</Text>

              <Text style={styles.explanation}>
                正解：{currentQuestion.correctAnswer}
              </Text>

              <Text style={styles.explanation}>
                {currentQuestion.explanation}
              </Text>

              {currentQuestion.keywords &&
                currentQuestion.keywords.length > 0 && (
                  <>
                    <Text style={styles.adviceTitle}>注目するキーワード</Text>

                    <Text style={styles.keywordText}>
                      {currentQuestion.keywords.join(' / ')}
                    </Text>
                  </>
                )}

              {currentQuestion.evidence && (
                <>
                  <Text style={styles.adviceTitle}>本文の根拠</Text>

                  <Text style={styles.evidenceText}>
                    {currentQuestion.evidence}
                  </Text>
                </>
              )}

              {currentQuestion.strategy && (
                <>
                  <Text style={styles.adviceTitle}>解き方</Text>

                  <Text style={styles.explanation}>
                    {currentQuestion.strategy}
                  </Text>
                </>
              )}

              <Text style={styles.adviceTitle}>今回のポイント</Text>

              <Text style={styles.explanation}>
                {currentQuestion.advice}
              </Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={nextQuestion}>
              <Text style={styles.buttonText}>
                {questionNumber === readingData.questions.length - 1
                  ? 'See Results'
                  : 'Next Question'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#F4F7FB',
  },
  title: {
    fontSize: 29,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#7657E8',
    padding: 17,
    borderRadius: 14,
    marginBottom: 12,
  },
  toggleButton: {
    padding: 12,
    marginBottom: 10,
  },
  toggleText: {
    color: '#4F6EDB',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  passageTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  passageText: {
    fontSize: 17,
    lineHeight: 28,
  },
  progress: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 9,
    backgroundColor: '#DCE2EA',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7657E8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  question: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  option: {
    borderWidth: 2,
    borderColor: '#DCE1E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#7657E8',
    backgroundColor: '#EEE9FF',
  },
  optionText: {
    fontSize: 17,
  },
  button: {
    backgroundColor: '#4F6EDB',
    padding: 17,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#7657E8',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#7657E8',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  feedbackBox: {
    padding: 17,
    borderRadius: 12,
    marginTop: 12,
  },
  correctBox: {
    backgroundColor: '#DFF6E8',
  },
  incorrectBox: {
    backgroundColor: '#FFE4E4',
  },
  feedbackTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  explanation: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  adviceTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 17,
    lineHeight: 26,
  },
  score: {
    fontSize: 27,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
  },
  metaText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 14,
  },
  answerInput: {
    borderWidth: 2,
    borderColor: '#DCE1E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  keywordText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
    color: '#6A4FCB',
    marginBottom: 8,
  },
  
  evidenceText: {
    fontSize: 16,
    lineHeight: 25,
    padding: 12,
    backgroundColor: '#FFF9D9',
    borderRadius: 10,
    marginBottom: 8,
  },
  highlightedText: {
    backgroundColor: '#FFF19A',
    fontWeight: 'bold',
  },
  questionType: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7657E8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modeContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F4F7FB',
  },
  
  modeTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  modeSubtitle: {
    fontSize: 17,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  
  modeCard: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#7657E8',
  },
  
  disabledModeCard: {
    opacity: 0.5,
    borderColor: '#BBBBBB',
  },
  
  modeCardTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  modeCardText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444444',
  },
  
  modeCardTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7657E8',
    marginTop: 10,
  },
  
  backButton: {
    padding: 15,
    marginTop: 10,
  },
  
  backButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555555',
  },
  analysisTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  analysisTextArea: {
    flex: 1,
  },
  
  analysisType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  
  analysisScore: {
    fontSize: 14,
    color: '#666666',
    marginTop: 3,
  },
  
  analysisPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  weaknessBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#FFF3D6',
  },
  
  weaknessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  
  weaknessText: {
    fontSize: 15,
    lineHeight: 23,
  },
  comparisonText: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  timerText: {
    fontSize: 24,
    fontWeight: '700',
  },
  
  overtimeText: {
    color: 'red',
  },

  totalTimeText: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  
  progressToggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  
  progressToggleButtonActive: {
    backgroundColor: '#dddddd',
  },
  
  progressToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSummaryContainer: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  
  progressSummaryCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  
  progressSummaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  
  progressSummaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  chartContainer: {
    width: '100%',
    marginTop: 24,
  },
  
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  
  chartItem: {
    marginBottom: 20,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  
  chartTypeText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  chartLabel: {
    width: 70,
    fontSize: 13,
  },
  
  chartTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#eeeeee',
    borderRadius: 7,
    overflow: 'hidden',
  },
  
  correctBar: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  
  incorrectBar: {
    height: '100%',
    backgroundColor: '#ef4444',
  },
  
  chartNumber: {
    width: 30,
    marginLeft: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  
  chartTimeText: {
    marginTop: 8,
    fontSize: 13,
  },
  
  noDataText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  wordSaveArea: {
    marginTop: 16,
    gap: 10,
  },
  
  wordInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  
  wordSaveButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  savedWordsResultContainer: {
    width: '100%',
    marginTop: 20,
  },
  
  savedWordResultCard: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  
  savedWordTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  
  savedWordMeaning: {
    fontSize: 16,
    lineHeight: 24,
  },
  flashcard: {
    width: '100%',
    minHeight: 260,
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  
  flashcardText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  flashcardHint: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
  },
  flashcardActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  
  flashcardActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  learningButton: {
    backgroundColor: '#ef4444',
  },
  
  learnedButton: {
    backgroundColor: '#22c55e',
  },
  
  flashcardActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  flashcardTouchable: {
    width: '100%',
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  undoFlashcardButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  
  undoFlashcardButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  progressScrollContent: {
    flexGrow: 1,
    width: '100%',
    padding: 24,
    paddingBottom: 80,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  
  howToUseContainer: {
    flexGrow: 1,
    width: '100%',
    padding: 24,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
  },
  
  howToUseCard: {
    width: '100%',
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  
  howToUseTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111111',
  },
  
  howToUseText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#444444',
  },

  topBackButton: {
    alignSelf: 'flex-start',
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#eeeeee',
    borderRadius: 10,
    zIndex: 10,
  },
  
  topBackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },

  exitConfirmationBox: {
    width: '100%',
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  
  exitConfirmationTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111111',
  },
  
  exitConfirmationText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#555555',
  },
  
  exitConfirmationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  
  cancelExitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
  },
  
  confirmExitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  
  cancelExitButtonText: {
    fontWeight: '600',
    color: '#111111',
  },
  
  confirmExitButtonText: {
    fontWeight: '700',
    color: '#ffffff',
  },

});