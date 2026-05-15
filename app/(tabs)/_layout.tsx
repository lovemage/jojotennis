import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

const PINE = '#1E3D2F';
const CLAY = '#B85C38';
const IVORY_MUTED = '#C4B89A';

function TabEmoji({ emoji }: { emoji: string }) {
  return <Text style={styles.emoji}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: PINE,
          borderTopColor: CLAY,
          borderTopWidth: 2,
        },
        tabBarActiveTintColor: CLAY,
        tabBarInactiveTintColor: IVORY_MUTED,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: () => <TabEmoji emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="court"
        options={{
          title: '找球場',
          tabBarIcon: () => <TabEmoji emoji="🗺" />,
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: '約球',
          tabBarIcon: () => <TabEmoji emoji="🎾" />,
        }}
      />
      <Tabs.Screen
        name="club"
        options={{
          title: '社團',
          tabBarIcon: () => <TabEmoji emoji="👥" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: () => <TabEmoji emoji="👤" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 22, lineHeight: 26 },
});
