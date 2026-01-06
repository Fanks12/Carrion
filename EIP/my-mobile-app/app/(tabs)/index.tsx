import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function Index() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        source={{ uri: 'https://carrion.up.railway.app/' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        
        // User agent DESKTOP au lieu de mobile
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        
        scalesPageToFit={true}
        
        // Permet de zoomer/dézoomer
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        
        // Cookies et stockage
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        
        // Support média
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        
        // Géolocalisation
        geolocationEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});