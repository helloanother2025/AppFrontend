import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type PickerMode = 'date' | 'time' | 'datetime';

type StyledDateTimePickerProps = {
  text?: string;
  value?: Date | null;
  mode?: PickerMode;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  is24Hour?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function formatDate(value: Date, mode: PickerMode) {
  if (!value) {
    return null;
  }

  if (mode === 'time') {
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (mode === 'date') {
    return value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  if (mode === 'datetime') {
    const dateString = value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeString = value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateString}, ${timeString}`;
  }

  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StyledDateTimePicker({
  text = 'Select date & time',
  value,
  mode = 'time',
  onChange,
  minimumDate,
  maximumDate,
  is24Hour,
  style,
  textStyle,
}: StyledDateTimePickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleConfirm = (date: Date) => {
    setIsVisible(false);
    onChange(date);
  };

  const formatted = value ? formatDate(value, mode) : null;

  return (
    <View style={style}>
      <Pressable style={[styles.button, style]} onPress={() => setIsVisible(true)}>
        {formatted ? (
          <View style={styles.row}>
            <Ionicons style={styles.icon} name="calendar-outline" size={24} color="#fff" />
            <Text style={[styles.buttonText, textStyle]}>{formatted}</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Ionicons style={styles.icon} name="calendar-outline" size={24} color="#fff" />
            <Text style={[styles.buttonText, textStyle]}>{text}</Text>
          </View>
        )}
      </Pressable>

      <DateTimePickerModal
        isVisible={isVisible}
        mode={mode}
        date={value || new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        is24Hour={is24Hour}
        onConfirm={handleConfirm}
        onCancel={() => setIsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#e63e4c',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderColor: '#000000',
    alignItems: 'flex-start',
    alignContent: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    alignSelf: 'center',
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
});