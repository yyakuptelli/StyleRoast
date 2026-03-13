import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

interface HistoryItem {
  id: string;
  mode: 'roast' | 'style';
  score: number | null;
  text: string;
  imageUri: string | null;
  date: string;
  lang: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('styleroast_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.log('History load error', e);
    }
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all your past analyses?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('styleroast_history');
            setHistory([]);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>History 📜</Text>
          {history.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
              <Ionicons name="trash-outline" size={16} color="#FF453A" />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Your past outfit analyses</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={80} color="#38383a" />
          <Text style={styles.emptyTitle}>No Analyses Yet</Text>
          <Text style={styles.emptyText}>
            Go to the Home tab, upload an outfit photo, and get your first AI analysis!
          </Text>
        </View>
      ) : (
        history.map((item) => (
          <View
            key={item.id}
            style={[
              styles.historyCard,
              item.mode === 'roast' ? styles.roastCard : styles.styleCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardBadge}>
                <Ionicons
                  name={item.mode === 'roast' ? 'flame' : 'sparkles'}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.cardBadgeText}>
                  {item.mode === 'roast' ? 'Roast' : 'Style'}
                </Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
            </View>

            {item.score !== null && (
              <View style={styles.cardScoreRow}>
                <Text style={styles.cardScore}>{item.score}</Text>
                <Text style={styles.cardScoreOut}>/10</Text>
                <View style={styles.scoreBar}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        width: `${item.score * 10}%`,
                        backgroundColor:
                          item.score >= 7 ? '#30D158' : item.score >= 4 ? '#FFD60A' : '#FF453A',
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <Text style={styles.cardText} numberOfLines={4}>
              {item.text}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  contentContainer: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    marginBottom: 30,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  clearText: {
    color: '#FF453A',
    fontWeight: '600',
    fontSize: 13,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: '#EBEBF5',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  historyCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  roastCard: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  styleCard: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cardBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDate: {
    color: '#636366',
    fontSize: 12,
  },
  cardScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 2,
  },
  cardScore: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD60A',
  },
  cardScoreOut: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD60A',
    marginTop: 8,
    marginRight: 12,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#EBEBF5',
  },
});
