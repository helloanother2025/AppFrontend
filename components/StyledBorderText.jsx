import { StyleSheet } from 'react-native';
import { StyledText as Text } from './StyledText';

export function StyledBorderText(props) {
  return <Text {...props} 
    style={[styles.borderText, props.style]}>
    {props.children}
    </Text>;
}

const styles = StyleSheet.create({
  borderText: {
    borderRadius: 16,
    borderWidth: 0.8,     
    borderColor: '#ababab',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 5,
    flex: 1
  }
})
