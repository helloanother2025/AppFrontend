import React from "react";
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const StyledScrollView = React.forwardRef((props, ref) => {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const isDark = theme === 'dark';
  return (
    <ScrollView
      ref={ref}
      style={[
        styles.scrollView,
        { backgroundColor: isDark ? '#181c22' : '#f7f7f7' },
        props.style,
      ]}
      contentContainerStyle={[
        styles.contentContainer,
        { backgroundColor: isDark ? '#181c22' : '#f7f7f7' },
        props.contentContainerStyle,
      ]}
      {...props}
    >
      {props.children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    padding: 25,
    paddingTop: 10,
    paddingBottom: 60,
    marginBottom: 0,
  },
  contentContainer: {
    alignItems: 'flex-start',
    paddingBottom: 120,
  },
});