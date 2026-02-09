import { StyleSheet, TouchableOpacity } from 'react-native'
import { StyledText as Text } from './StyledText' 
import FontAwesome from '@expo/vector-icons/FontAwesome'
import React from 'react'

export function StyledNavigatorButton ({back = true, title, style, onPress}) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      {back && <FontAwesome style={{ marginRight: 10 }} name="chevron-left" size={14} color="black" />}
      <Text style={{ fontSize: 16, fontWeight: 'semibold' }}>{title ? title : back ? "Back" : "Next"}</Text>
      {!back && <FontAwesome style={{ marginLeft: 10 }} name="chevron-right" size={14} color="black" />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignContent: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f7f7f7',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
  });