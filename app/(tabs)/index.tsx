import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabOneScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [mode, setMode] = useState<'roast' | 'style' | null>(null);
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

    // Using Google Gemini API (Free Tier available without credit card)
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      setIsLoading(false);
      setResultText(currentT.errEnv);
      return;
    }

    try {
      const promptText = selectedMode === 'roast'
        ? `You are a savage, brutal, and hilarious fashion critic. Look at this outfit photo and roast it like there is no tomorrow. Be funny and sarcastic. Point out exactly which clothing items look bad. ${currentT.promptLang}`
        : `You are a high-end, extremely professional celebrity stylist. Analyze the clothing items in this photo and give constructive advice on how to improve the styling, color coordination, and overall vibe. ${currentT.promptLang}`;

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
        setResultText(data.candidates[0].content.parts[0].text);
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
          <Text style={styles.resultContent}>{resultText}</Text>
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
});
