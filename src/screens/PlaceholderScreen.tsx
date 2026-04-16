import { StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../components/ScreenShell';
import { AppHeader } from '../components/AppHeader';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <ScreenShell>
      <AppHeader title={title} subtitle={description} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
});
