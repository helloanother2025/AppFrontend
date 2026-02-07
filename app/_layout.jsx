import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { SearchProvider } from '../context/SearchContext';
import { UserProvider } from '../context/UserContext';
import { RideProvider } from '../context/RideContext';
import { ChatProvider } from '../context/ChatContext';
import { FriendsProvider } from '../context/FriendsContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SearchProvider>
        <UserProvider>
          <FriendsProvider>
            <RideProvider>
              <ChatProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </ChatProvider>
            </RideProvider>
          </FriendsProvider>
        </UserProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}
