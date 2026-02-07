import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function StyledScrollView(props) {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const isDark = theme === 'dark';
  return (
    <ScrollView
      style={[
        styles.scrollView,
        { backgroundColor: isDark ? '#181c22' : '#f7f7f7' },
        props.style,
      ]}
      contentContainerStyle={[
        styles.contentContainer,
        { backgroundColor: isDark ? '#181c22' : '#f7f7f7' },
        props.contentContainerStyle,
      ]}
    >
      {props.children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    padding: 25,
    paddingTop: 10,
    marginBottom: 60,
  },
  contentContainer: {
    alignItems: 'flex-start',
    paddingBottom: 60,
  },
});