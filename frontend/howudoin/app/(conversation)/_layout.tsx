import { Stack } from 'expo-router';
import React from 'react';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ConversationLayout() {
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <Stack>
      <Stack.Screen 
        name="friendsChat" 
        options={{
          title: "Chats",
          headerTintColor: tintColor,
          headerStyle: {
            backgroundColor: backgroundColor,
          },
        }}
      />
      <Stack.Screen 
        name="groupChat" 
        options={{
          title: "Chats",
          headerTintColor: tintColor,
          headerStyle: {
            backgroundColor: backgroundColor,
          },
        }}
      />
    </Stack>
  );
}
