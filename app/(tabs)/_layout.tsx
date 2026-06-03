import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

const PINE = '#1E3D2F';
const CLAY = '#B85C38';
const IVORY_MUTED = '#C4B89A';

function TabMark({ label }: { label: string }) {
  return <Text style={styles.mark}>{label}</Text>;
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
          tabBarIcon: () => <TabMark label="01" />,
        }}
      />
      <Tabs.Screen
        name="court"
        options={{
          title: '找球場',
          tabBarIcon: () => <TabMark label="02" />,
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: '約球',
          tabBarIcon: () => <TabMark label="03" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: () => <TabMark label="04" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  mark: {
    color: IVORY_MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 16,
  },
});
