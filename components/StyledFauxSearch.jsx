import { StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';

export function StyledFauxSearch({ props, title, onPress, style, textStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} >
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      <FontAwesome name="search" size={18} color="#5e5e5e" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'black',
    marginVertical: 10,
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  buttonText: {
    width: '85%',
    textAlign: 'left',
    color: '#5e5e5e',
    fontSize: 16,
  },
});
