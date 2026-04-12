import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

function findTabNav(navigation) {
  let nav = navigation;
  while (nav) {
    const parent = nav.getParent();
    if (!parent) break;
    if (parent.getState()?.type === 'tab') return parent;
    nav = parent;
  }
  return null;
}

export function useHideTabBar() {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      const tabNav = findTabNav(navigation);
      if (!tabNav) return;
      tabNav.setOptions({ tabBarStyle: { display: 'none' } });
    }, [navigation])
  );
}

export function useShowTabBar() {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      const tabNav = findTabNav(navigation);
      if (!tabNav) return;
      tabNav.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );
}
