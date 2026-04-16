import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type UserAvatarProps = {
  name: string;
  size?: number | 'sm' | 'md' | 'lg';
  source?: string | null;
  src?: string | null;
};

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 64,
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getNameColor(name: string): string {
  const palette = ['#E83950', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
  const index = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

export function UserAvatar({ name, size = 44, source, src }: UserAvatarProps) {
  const resolvedSize = typeof size === 'number' ? size : sizeMap[size] ?? 44;
  const imageSource = source ?? src;
  const initials = getInitials(name);

  if (imageSource) {
    return <Image source={{ uri: imageSource }} style={[styles.image, { width: resolvedSize, height: resolvedSize, borderRadius: resolvedSize / 2 }]} />;
  }

  return (
    <View style={[styles.fallback, { width: resolvedSize, height: resolvedSize, borderRadius: resolvedSize / 2, backgroundColor: getNameColor(name) }]}> 
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.borderLight,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
