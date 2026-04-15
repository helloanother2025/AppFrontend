import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledText as Text } from './StyledText';

export default function StyledSlidingPill({ 
  options, 
  activeOption, 
  onOptionSelect, 
  containerStyle,
  pillStyle,
  textStyle
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((option, index) => {
        const isString = typeof option === 'string';
        const key = isString ? option : option.key;
        const label = isString ? option : option.label;
        const icon = isString ? null : option.icon;
        
        const isActive = activeOption === key;

        let renderedIcon = null;
        if (icon) {
          if (React.isValidElement(icon)) {
            renderedIcon = React.cloneElement(icon, { color: isActive ? '#fff' : '#666' });
          } else if (typeof icon === 'function') {
            renderedIcon = icon(isActive);
          }
        }

        return (
          <TouchableOpacity
            key={key ?? index}
            style={[
              styles.pill,
              pillStyle,
              isActive && styles.pillActive
            ]}
            onPress={() => onOptionSelect(key)}
          >
            {renderedIcon}
            <Text style={[
              styles.pillText,
              textStyle,
              isActive && styles.pillTextActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    borderRadius: 14,
    padding: 0,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  pillActive: {
    backgroundColor: '#1f1f1f',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
