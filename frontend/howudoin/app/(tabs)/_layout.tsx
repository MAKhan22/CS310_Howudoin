import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { MaterialIcons } from '@expo/vector-icons';
// or
import { Ionicons } from '@expo/vector-icons';
// or
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, router } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <MaterialIcons name="chat" size={22} color={color} />,
          //  tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={28} color={color} />,
          // or
          // tabBarIcon: ({ color }) => <FontAwesome name="comments" size={28} color={color} />,
          // or
          // tabBarIcon: ({ color }) => <IconSymbol name="chat" color={color} />,
          // or
          // tabBarIcon: ({ color }) => <Image source={require('@/assets/images/chat-icon.png')} style={{ tintColor: color }} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => <FontAwesome name="comments" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <FontAwesome name="comment" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
