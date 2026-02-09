import { TextInput, StyleSheet } from 'react-native'

export function StyledSearchBar(props) {
    return <TextInput style={[styles.searchBar, props.style]} {...props} />
}

const styles = StyleSheet.create({
    searchBar: {
      alignSelf: 'stretch',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 10,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: '#b3b3b3',
      fontSize: 16,
      fontFamily: 'Montserrat-Regular'
    }
});