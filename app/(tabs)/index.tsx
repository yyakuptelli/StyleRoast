import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform, Alert, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabOneScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [mode, setMode] = useState<'roast' | 'style' | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [lang, setLang] = useState<'en' | 'tr'>('en');

  const t = {
    en: {
      permCam: 'Permission Required',
      permCamDesc: 'We need access to your camera so you can snap an outfit picture!',
      permGal: 'Permission Required',
      permGalDesc: 'We need access to your gallery to pick an outfit photo!',
      upOutfit: 'Upload Outfit',
      howFit: 'How would you like to show us your fit?',
      btnCam: '📸 Take Photo',
      btnGal: '🖼️ Choose from Gallery',
      btnCancel: 'Cancel',
      subtitle: 'Let AI judge your fit.',
      tapToUp: 'Tap to upload your outfit',
      btnRoast: 'Roast Me',
      btnStyle: 'Style Me',
      loadRoast: 'Preparing the burn...',
      loadStyle: 'Consulting the fashion gods...',
      titleRoast: '🔥 The Burn',
      titleStyle: '✨ The Vision',
      errEnv: '⚠️ Please create a .env file and add your EXPO_PUBLIC_GEMINI_API_KEY.',
      errApi: 'The AI couldn\'t figure out this outfit. Try another picture!',
      errSrv: 'Oh no! Our fashionable servers are currently down. Please try again.',
      shareTitle: 'My StyleRoast Result',
      scoreLabel: 'Style Score',
      promptLang: 'Reply entirely in English.',
    },
    tr: {
      permCam: 'İzin Gerekli',
      permCamDesc: 'Kombinini çekebilmen için kamerana erişim vermen gerekiyor!',
      permGal: 'İzin Gerekli',
      permGalDesc: 'Fotoğraf seçebilmen için galerine erişim vermelisin!',
      upOutfit: 'Kombinini Yükle',
      howFit: 'Bize tarzını nasıl göstermek istersin?',
      btnCam: '📸 Kamerayla Çek',
      btnGal: '🖼️ Galeriden Seç',
      btnCancel: 'İptal',
      subtitle: 'Bırak yapay zeka tarzını yargılasın.',
      tapToUp: 'Kombinini yüklemek için dokun',
      btnRoast: 'Eleştir Beni',
      btnStyle: 'Stil Öner',
      loadRoast: 'Linç hazırlanıyor...',
      loadStyle: 'Moda tanrılarına danışılıyor...',
      titleRoast: '🔥 Linç',
      titleStyle: '✨ Stil Vizyonu',
      errEnv: '⚠️ Lütfen .env dosyasına EXPO_PUBLIC_GEMINI_API_KEY ekleyin.',
      errApi: 'Yapay zeka bu kombini çözemedi. Başka bir fotoğraf dene!',
      errSrv: 'Eyvah! Sunucularımız şu an dinleniyor. Lütfen tekrar dene.',
      shareTitle: 'StyleRoast Sonucum',
      scoreLabel: 'Stil Puanı',
      promptLang: 'Sadece ama sadece Türkçe dilinde cevap ver.',
    }
  };

  const currentT = t[lang];

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(currentT.permCam, currentT.permCamDesc);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      base64: true,
    });

    handleImageResult(result);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(currentT.permGal, currentT.permGalDesc);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      base64: true,
    });

    handleImageResult(result);
  };

  const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setResultText(null);
      setMode(null);
    }
  };

  const pickImage = () => {
    Alert.alert(
      currentT.upOutfit,
      currentT.howFit,
      [
        { text: currentT.btnCam, onPress: openCamera },
        { text: currentT.btnGal, onPress: openGallery },
        { text: currentT.btnCancel, style: 'cancel' },
      ]
    );
  };

  const analyzeOutfit = async (selectedMode: 'roast' | 'style') => {
    if (!imageBase64) return;

    setMode(selectedMode);
    setIsLoading(true);
    setResultText(null);
    setScore(null);

    // Using Google Gemini API (Free Tier available without credit card)
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      setIsLoading(false);
      setResultText(currentT.errEnv);
      return;
    }

    try {
      const scoreInstruction = 'IMPORTANT: Start your response with exactly "SCORE: X/10" on the first line (where X is your rating from 1 to 10), then continue with your analysis on a new line.';
      const promptText = selectedMode === 'roast'
        ? `You are a savage, brutal, and hilarious fashion critic. Look at this outfit photo and roast it like there is no tomorrow. Be funny and sarcastic. Point out exactly which clothing items look bad. ${scoreInstruction} ${currentT.promptLang}`
        : `You are a high-end, extremely professional celebrity stylist. Analyze the clothing items in this photo and give constructive advice on how to improve the styling, color coordination, and overall vibe. ${scoreInstruction} ${currentT.promptLang}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
            ]
          }]
        }),
      });

      const data = await response.json();

      if (data.error) {
        setResultText(`API Error: ${data.error.message}`);
      } else if (data.candidates && data.candidates[0].content.parts[0].text) {
        const fullText = data.candidates[0].content.parts[0].text;
        // Extract score from response
        const scoreMatch = fullText.match(/SCORE:\s*(\d+)\/10/);
        const extractedScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
        const cleanText = fullText.replace(/SCORE:\s*\d+\/10\n?/, '').trim();
        setScore(extractedScore);
        setResultText(cleanText);
        // Save to history
        try {
          const historyItem = {
            id: Date.now().toString(),
            mode: selectedMode,
            score: extractedScore,
            text: cleanText,
            imageUri: imageUri,
            date: new Date().toISOString(),
            lang: lang,
          };
          const existing = await AsyncStorage.getItem('styleroast_history');
          const history = existing ? JSON.parse(existing) : [];
          history.unshift(historyItem);
          await AsyncStorage.setItem('styleroast_history', JSON.stringify(history.slice(0, 50)));
        } catch (e) { console.log('History save error', e); }
      } else {
        setResultText(currentT.errApi);
      }
    } catch (error) {
      console.error(error);
      setResultText(currentT.errSrv);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>StyleRoast 👗</Text>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLang(lang === 'en' ? 'tr' : 'en')}
          >
            <Text style={styles.langText}>{lang === 'en' ? '🇹🇷 TR' : '🇬🇧 EN'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>{currentT.subtitle}</Text>
      </View>

      {/* Image Picker Area */}
      <TouchableOpacity activeOpacity={0.8} onPress={pickImage} style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-outline" size={60} color="#8a8a8e" />
            <Text style={styles.placeholderText}>{currentT.tapToUp}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action Buttons */}
      {imageUri && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.button, styles.roastButton]}
            onPress={() => analyzeOutfit('roast')}
            disabled={isLoading}
          >
            <Ionicons name="flame" size={20} color="#fff" style={styles.btnIcon} />
            <Text style={styles.buttonText}>{currentT.btnRoast}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.styleButton]}
            onPress={() => analyzeOutfit('style')}
            disabled={isLoading}
          >
            <Ionicons name="sparkles" size={20} color="#fff" style={styles.btnIcon} />
            <Text style={styles.buttonText}>{currentT.btnStyle}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.loadingText}>
            {mode === 'roast' ? currentT.loadRoast : currentT.loadStyle}
          </Text>
        </View>
      )}

      {/* Result Display */}
      {resultText && !isLoading && (
        <View style={[styles.resultBox, mode === 'roast' ? styles.roastBox : styles.styleBox]}>
          <Text style={styles.resultTitle}>
            {mode === 'roast' ? currentT.titleRoast : currentT.titleStyle}
          </Text>

          {/* Score Badge */}
          {score !== null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreOut}>/10</Text>
              <Text style={styles.scoreLabel}>{currentT.scoreLabel}</Text>
            </View>
          )}

          <Text style={styles.resultContent}>{resultText}</Text>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              try {
                await Share.share({
                  message: `${currentT.shareTitle}\n\n${score ? `⭐ ${score}/10\n\n` : ''}${resultText}\n\n📱 Analyzed by StyleRoast App`,
                });
              } catch (e) { console.log(e); }
            }}
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={styles.shareText}>{lang === 'en' ? 'Share Result' : 'Sonucu Paylaş'}</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13', // Deep dark mode!
  },
  contentContainer: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  langToggle: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38383a',
  },
  langText: {
    color: '#EBEBF5',
    fontWeight: 'bold',
    fontSize: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 6,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38383a',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8a8a8e',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnIcon: {
    marginRight: 8,
  },
  roastButton: {
    backgroundColor: '#FF3B30',
    marginRight: 10,
  },
  styleButton: {
    backgroundColor: '#007AFF', // Deep iOS Blue
    marginLeft: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: '#EBEBF5',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  resultBox: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  roastBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  styleBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  resultContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#EBEBF5',
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFD60A',
  },
  scoreOut: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD60A',
    marginTop: 10,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 10,
    marginTop: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  shareText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
