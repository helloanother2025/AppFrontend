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
                    },
                    tabBarActiveTintColor: '#e63e4c',
                    tabBarInactiveTintColor: '#000000',
                  }}
                >
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
                      tabBarButton: (props) => {
                        const { onPress, ...rest } = props;
                        const { Pressable } = require('react-native');
                        const { useRouter } = require('expo-router');
                        const router = useRouter();
                        return (
                          <Pressable
                            {...rest}
                            onPress={() => {
                              router.replace('/(dashboard)/(rides)');
                            }}
                          >
                            {props.children}
                          </Pressable>
                        );
                      },
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
                  {/* hide from tabs */} 
                  <Tabs.Screen 
                    name="(dashboard)/[id]" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(joinRide)" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(completeRide)/complete" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(completeRide)/fareCalculation" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(completeRide)/rateRide" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(createRide)" 
                    options={{ href: null}} 
                  />
                  <Tabs.Screen 
                    name="(chat)/chatScreen" 
                    options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }} 
                  />
                  <Tabs.Screen 
                    name="(chat)/index" 
                    options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }} 
                  />
                  <Tabs.Screen 
                    name="(completeRide)/partnerFeedback" 
                    options={{ href: null}} 
                  />
                </Tabs>
              </ChatProvider>
            </RideProvider>
          </FriendsProvider>
        </UserProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}
