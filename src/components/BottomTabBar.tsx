import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';

// BottomTabBar is now used as a pass-through tabBar prop for Expo Router's <Tabs>
// The props shape is the same as @react-navigation/bottom-tabs BottomTabBarProps
export function BottomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { darkMode, groupChats } = useAppContext();

  const backgroundColor = darkMode ? colors.cardDark : colors.cardLight;
  const borderColor = darkMode ? colors.borderDark : colors.borderLight;
  const inactiveColor = darkMode ? '#666666' : '#9CA3AF';
  const activeColor = colors.brand;
  const chatUnread = groupChats.reduce((total: number, chat: any) => total + chat.unreadCount, 0);

  const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
    index: { active: 'home', inactive: 'home-outline' },
    activity: { active: 'pulse', inactive: 'pulse-outline' },
    'create-ride': { active: 'add', inactive: 'add' },
    chats: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
    profile: { active: 'person', inactive: 'person-outline' },
  };

  const labelMap: Record<string, string> = {
    index: 'Home',
    activity: 'Activity',
    'create-ride': 'Ride',
    chats: 'Chats',
    profile: 'Profile',
  };

  const visibleRoutes = new Set(['index', 'activity', 'create-ride', 'chats', 'profile']);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor, borderTopColor: borderColor }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const routeName: string = route.name.replace('(app)/', '').split('/')[0];

        // Only show the five primary tabs in the bottom bar.
        if (!visibleRoutes.has(routeName)) return null;

        const isCenter = routeName === 'create-ride';
        const label = labelMap[routeName] ?? (typeof options.title === 'string' ? options.title : routeName);

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.centerWrapper}>
              <View style={styles.centerButton}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.label, { color: activeColor, fontWeight: '700' }]}>{label}</Text>
            </Pressable>
          );
        }

        const iconSet = iconMap[routeName] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
        const iconName = isFocused ? iconSet.active : iconSet.inactive;
        const isChatsTab = routeName === 'chats';

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item}>
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={22} color={isFocused ? activeColor : inactiveColor} />
              {isChatsTab && chatUnread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chatUnread > 9 ? '9+' : chatUnread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: isFocused ? activeColor : inactiveColor, fontWeight: isFocused ? '600' : '400' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    minWidth: 52,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  iconWrap: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
  },
  centerWrapper: {
    alignItems: 'center',
    marginTop: -16,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
