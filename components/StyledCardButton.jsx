import { Pressable, StyleSheet } from 'react-native';

export function StyledCardButton(props) {
  return <Pressable {...props} 
    style={({pressed}) =>  [
      styles.card, 
      {backgroundColor: pressed ? '#e6e6e6' : '#fff'},
      props.style]}>
    {props.children}
    </Pressable>;
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: 16,
    borderWidth: 0.8,     
    borderColor: '#000000',
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
