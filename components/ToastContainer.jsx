import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';

const Toast = ({ toast, onHide }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onHide(toast.id));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [fadeAnim, toast.id, onHide]);

  const getIconAndColor = () => {
    switch (toast.type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#10B981' };
      case 'error':
        return { icon: 'alert-circle', color: '#EF4444' };
      case 'warning':
        return { icon: 'alert', color: '#F59E0B' };
      case 'info':
      default:
        return { icon: 'information-circle', color: '#3B82F6' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          backgroundColor: color,
        },
      ]}
    >
      <View style={styles.contentWrapper}>
        <Ionicons name={icon} size={20} color="white" style={styles.icon} />
        <Text style={styles.toastText} numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={() => onHide(toast.id)} style={styles.closeButton}>
          <Ionicons name="close" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const ToastContainer = () => {
  const { toasts, hideToast } = useToast();

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onHide={hideToast} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastContainer: {
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Montserrat-Medium',
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});
