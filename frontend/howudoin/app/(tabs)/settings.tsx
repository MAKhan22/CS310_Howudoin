import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function Settings() {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('email');
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.option} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#ff4444" />
        <ThemedText style={[styles.optionText, styles.logoutText]}>
          Logout
        </ThemedText>
      </Pressable>
      <ThemedText style={styles.themeInfo}>
        App theme (dark/light) follows your system settings
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  optionText: {
    marginLeft: 16,
    fontSize: 16,
  },
  logoutText: {
    color: '#ff4444',
  },
  themeInfo: {
    textAlign: 'center',
    fontSize: 14,
    color: '#5c9eff',
    marginBottom: 20,
    fontStyle: 'italic'
  },
});
