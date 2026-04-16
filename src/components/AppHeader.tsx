import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
};

export function AppHeader({ title, subtitle, showBack, onBack, rightAction }: AppHeaderProps) {
  const { darkMode, unreadCount, groupChats } = useAppContext();

  const totalUnreadChats = groupChats.reduce((sum, gc) => sum + gc.unreadCount, 0);

  const cardBackground = darkMode ? colors.cardDark : colors.cardLight;
  const borderColor = darkMode ? colors.borderDark : colors.borderLight;
  const textPrimary = darkMode ? colors.textPrimaryDark : colors.textPrimaryLight;
  const textSecondary = darkMode ? colors.textSecondaryDark : colors.textSecondaryLight;

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: cardBackground, borderBottomColor: borderColor }]}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={textPrimary} />
          </Pressable>
        ) : null}
        <View>
          <Text style={[styles.title, { color: textPrimary }]}>{title || 'BashayJabo'}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.actions}>
        {rightAction ?? (
          <>
            <Pressable onPress={() => router.push('/notifications')} style={styles.iconButtonPlain}>
              <Ionicons name="notifications-outline" size={20} color={textSecondary} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable onPress={() => router.push('/chats')} style={styles.iconButtonPlain}>
              <Ionicons name="chatbubble-outline" size={20} color={textSecondary} />
              {totalUnreadChats > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalUnreadChats > 9 ? '9+' : totalUnreadChats}</Text>
                </View>
              ) : null}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButtonPlain: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
