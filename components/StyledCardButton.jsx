import { Pressable, StyleSheet } from 'react-native';

export function StyledCardButton(props) {
  const { disabled, ...rest } = props;
  return <Pressable {...rest} disabled={!!disabled}
    style={({pressed}) =>  [
      styles.card, 
      props.style, 
      {backgroundColor: pressed ? '#e6e6e6' : '#fff'}]}>
    {props.children}
    </Pressable>;
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: 16,
    borderWidth: 1,     
    borderColor: '#000000',
    padding: 14, 
    marginVertical: 10,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  }
})
