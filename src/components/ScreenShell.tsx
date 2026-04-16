import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';

type ScreenShellProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function ScreenShell({ children, scroll = true }: ScreenShellProps) {
  const { darkMode } = useAppContext();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: darkMode ? colors.bgDark : colors.bgLight }]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView> : <View style={styles.fill}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fill: {
    flex: 1,
  },
});
