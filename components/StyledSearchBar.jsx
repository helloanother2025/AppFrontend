import React from 'react'
import { TextInput, StyleSheet } from 'react-native'

export const StyledSearchBar = React.forwardRef((props, ref) => {
  const { style, ...rest } = props
  return <TextInput ref={ref} {...rest} style={[styles.searchBar, style]} />
})

const styles = StyleSheet.create({
  searchBar: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#000',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular'
  }
});