import { Tabs } from 'expo-router';
import { AppHeader } from '../../src/components/AppHeader';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import React from 'react';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <AppHeader title="BashayJabo" />,
      }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="create-ride" options={{ title: 'CreateRide' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="ride-details" options={{ href: null }} />
      <Tabs.Screen name="ride-status" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="group-chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="user/[id]" options={{ href: null }} />
      <Tabs.Screen name="ride-review" options={{ href: null }} />
      <Tabs.Screen name="fare-calc" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="edit-ride" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="legal" options={{ href: null }} />
    </Tabs>
  );
}