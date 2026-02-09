import { StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';
import React from 'react';
import { useTheme } from '../context/ThemeContext';

export function StyledButton({ props, title, onPress, style, textStyle, disabled }) {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const isDark = theme === 'dark';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: isDark ? '#e63e4c' : '#1f1f1f' },
        style,
      ]}
      disabled={!!disabled}
    >
      <Text
        style={[
          styles.buttonText,
          { color: isDark ? '#fff' : '#fff' },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'semibold',
    textAlign: 'center',
    fontSize: 14,
  },
});
