import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function StyledCard(props) {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const isDark = theme === 'dark';
  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#23272f' : '#fff',
          borderColor: isDark ? '#444' : '#000',
          shadowColor: isDark ? '#000' : '#000',
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    shadowOffset: { width: 0.5, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
});
