import { StyleSheet } from 'react-native';
import { StyledText as Text } from './StyledText';

export function StyledTitle({ children, style, ...rest }) {
  return (
    <Text {...rest} style={[styles.title, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginTop: 5,
  },
});
