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

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your camera so you can snap an outfit picture!');
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
      Alert.alert('Permission Required', 'We need access to your gallery to pick an outfit photo!');
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
      'Upload Outfit',
      'How would you like to show us your fit?',
      [
        { text: '📸 Take Photo', onPress: openCamera },
        { text: '🖼️ Choose from Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
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
      setResultText("⚠️ Lütfen projenin içine bir .env dosyası oluşturun ve ücretsiz Google Gemini API anahtarınızı ekleyin:\n\nEXPO_PUBLIC_GEMINI_API_KEY=senin_anahtarin\n\n(Ücretsiz anahtar almak için: aistudio.google.com)");
      return;
    }

    try {
      const promptText = selectedMode === 'roast'
        ? "You are a savage, brutal, and hilarious fashion critic. Look at this outfit photo and roast it like there is no tomorrow. Be funny and sarcastic. Point out exactly which clothing items look bad."
        : "You are a high-end, extremely professional celebrity stylist. Analyze the clothing items in this photo and give constructive advice on how to improve the styling, color coordination, and overall vibe.";

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
        setResultText("The AI couldn't figure out this outfit. Try another picture!");
      }
    } catch (error) {
      console.error(error);
      setResultText("Oh no! Our fashionable servers are currently down. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      <View style={styles.header}>
        <Text style={styles.title}>StyleRoast 👗</Text>
        <Text style={styles.subtitle}>Let AI judge your fit.</Text>
      </View>

      {/* Image Picker Area */}
      <TouchableOpacity activeOpacity={0.8} onPress={pickImage} style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-outline" size={60} color="#8a8a8e" />
            <Text style={styles.placeholderText}>Tap to upload your outfit</Text>
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
            <Text style={styles.buttonText}>Roast Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.styleButton]}
            onPress={() => analyzeOutfit('style')}
            disabled={isLoading}
          >
            <Ionicons name="sparkles" size={20} color="#fff" style={styles.btnIcon} />
            <Text style={styles.buttonText}>Style Me</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.loadingText}>
            {mode === 'roast' ? 'Preparing the burn...' : 'Consulting the fashion gods...'}
          </Text>
        </View>
      )}

      {/* Result Display */}
      {resultText && !isLoading && (
        <View style={[styles.resultBox, mode === 'roast' ? styles.roastBox : styles.styleBox]}>
          <Text style={styles.resultTitle}>
            {mode === 'roast' ? '🔥 The Burn' : '✨ The Vision'}
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
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
