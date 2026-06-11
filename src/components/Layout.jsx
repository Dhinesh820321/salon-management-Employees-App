import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as RNStatusBar } from 'react-native';

export function SafeAreaProvider({ children }) {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
}

export function StatusBar({ barStyle = 'dark-content', backgroundColor = 'white' }) {
  return <RNStatusBar barStyle={barStyle} backgroundColor={backgroundColor} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default { SafeAreaProvider, StatusBar };
