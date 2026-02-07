import { Tabs } from 'expo-router';
import { RideProvider } from '../../../context/RideContext';
import { SearchProvider } from '../../../context/SearchContext';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabsLayout() {
  return (
    <SearchProvider>
      <RideProvider>
        <Tabs
      screenOptions={{
        //header: () => <DashboardHeader />,
        headerShown: false,
        tabBarLabelStyle: { fontFamily: 'Montserrat-SemiBold', fontSize: 11 },
        tabBarStyle: {
          borderRadius: 30,
          position: 'absolute',
          bottom: 0,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: '#ffffff',
          height: 100,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#e63e4c',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="(dashboard)/dash"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Entypo name="home" color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/rides"
        options={{
          title: 'Your Rides',
          tabBarIcon: ({ color }) => <FontAwesome name="car" color={color} size={19} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/notifs"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="(dashboard)/profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons name="person" color={color} size={21} />,
        }}
      />
      {/* hide from tabs */} 
      <Tabs.Screen 
      name="(joinRide)" 
      options={{ href: null}} 
      />
      <Tabs.Screen 
      name="(completeRide)" 
      options={{ href: null}} 
      />
      <Tabs.Screen 
      name="(createRide)" 
      options={{ href: null}} 
      />
    </Tabs>
  </RideProvider>
</SearchProvider>
);
}
