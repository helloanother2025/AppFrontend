import { View, StyleSheet } from 'react-native';

export function StyledCard(props) {
  return <View {...props} 
    style={[styles.card, props.style]}>
    {props.children}
    </View>;
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: 16,
    borderWidth: 0.8,     
    borderColor: '#000000',
    backgroundColor: '#fff',
    padding: 14, 
    marginVertical: 10,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0.5, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  }
})
