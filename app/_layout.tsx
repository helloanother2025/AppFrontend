import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppContext } from '../src/context/AppContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { UserProvider, useUser } from '../src/context/UserContext';
import { RideProvider } from '../src/context/RideContext';
import { SearchProvider } from '../src/context/SearchContext';
import { JoinProvider } from '../src/context/JoinRequestContext';
import { useFonts } from 'expo-font';


import { useEffect } from 'react';
import { DefaultTheme, DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { colors } from '../src/theme';
import { Text, TextInput } from 'react-native';

let globalFontApplied = false;
function applyGlobalFontDefaults() {
  if (globalFontApplied) return;
  const baseTextStyle = { fontFamily: 'Montserrat-Regular' };
  const TextAny = Text as any;
  const TextInputAny = TextInput as any;
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = [baseTextStyle, TextAny.defaultProps.style];
  TextInputAny.defaultProps = TextInputAny.defaultProps || {};
  TextInputAny.defaultProps.style = [baseTextStyle, TextInputAny.defaultProps.style];
  globalFontApplied = true;
}

const RootLayoutNav = () => {
  const { darkMode, isDemoMode } = useAppContext();
  const { isAuthenticated, isLoading } = useUser();
  const theme = darkMode
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bgDark, card: colors.cardDark, text: colors.textPrimaryDark, border: colors.borderDark, primary: colors.brand } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bgLight, card: colors.cardLight, text: colors.textPrimaryLight, border: colors.borderLight, primary: colors.brand } };

  if (isLoading) {
    return (
      <NavThemeProvider value={theme as any}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" options={{ headerShown: false }} />
        </Stack>
      </NavThemeProvider>
    );
  }

  return (
    <NavThemeProvider value={theme as any}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated || isDemoMode ? (
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="Splash" options={{ headerShown: false }} />
      </Stack>
    </NavThemeProvider>
  );
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) applyGlobalFontDefaults();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <JoinProvider>
              <RideProvider>
                <SearchProvider>
                  <AppProvider>
                    <RootLayoutNav />
                  </AppProvider>
                </SearchProvider>
              </RideProvider>
            </JoinProvider>
          </UserProvider>

        </ThemeProvider>

      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
