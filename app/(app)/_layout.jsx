import { Tabs } from 'expo-router';
import { RideProvider } from '../../context/RideContext';
import { SearchProvider } from '../../context/SearchContext';
import { UserProvider } from '../../context/UserContext';
import { ChatProvider } from '../../context/ChatContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { FriendsProvider } from '../../context/FriendsContext';
import DashboardHeader from '../../components/AppHeader';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Applied to every non-tab (flow) screen
const HIDDEN_FLOW = {
  href: null,
  tabBarStyle: { display: 'none' },
  headerShown: true,
};

// Applied to flow screens that should still show the tab bar
const VISIBLE_FLOW = {
  href: null,
  headerShown: true,
};

export default function TabsLayout() {
  return (
    <ThemeProvider>
      <SearchProvider>
        <UserProvider>
          <FriendsProvider>
            <RideProvider>
              <ChatProvider>
                <Tabs
                  screenOptions={{
                    header: () => <DashboardHeader />,
                    headerShown: true,
                    tabBarLabelStyle: { fontFamily: 'Montserrat-SemiBold', fontSize: 10 },
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
                    tabBarInactiveTintColor: '#000000',
                  }}
                >
                  {/* Visible tabs */}
                  <Tabs.Screen
                    name="(dashboard)/dash"
                    options={{
                      title: 'Dashboard',
                      tabBarIcon: ({ color }) => <Entypo name="home" color={color} size={22} />,
                    }}
                  />
                  <Tabs.Screen
                    name="(dashboard)/(rides)"
                    options={{
                      title: 'Ride Status',
                      tabBarIcon: ({ color }) => <FontAwesome name="car" color={color} size={18} />,
                    }}
                  />
                  <Tabs.Screen
                    name="(dashboard)/notifs"
                    options={{
                      title: 'Notifications',
                      tabBarIcon: ({ color }) => <Ionicons name="notifications" color={color} size={20} />,
                    }}
                  />
                  <Tabs.Screen
                    name="(dashboard)/profile"
                    options={{
                      title: 'Profile',
                      tabBarIcon: ({ color }) => <Ionicons name="person" color={color} size={20} />,
                    }}
                  />

                  {/* Hidden flow screens (no tab bar) */}
                  <Tabs.Screen name="(dashboard)/(rides)/[id]" options={HIDDEN_FLOW} />
                  <Tabs.Screen name="(dashboard)/[id]" options={HIDDEN_FLOW} />
                  <Tabs.Screen name="(createRide)" options={VISIBLE_FLOW} />
                  <Tabs.Screen name="(joinRide)" options={VISIBLE_FLOW} />
                  <Tabs.Screen name="(completeRide)" options={HIDDEN_FLOW} />
                  <Tabs.Screen name="(chat)/chatScreen" options={HIDDEN_FLOW} />
                  <Tabs.Screen name="(chat)/index" options={HIDDEN_FLOW} />
                </Tabs>
              </ChatProvider>
            </RideProvider>
          </FriendsProvider>
        </UserProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}
