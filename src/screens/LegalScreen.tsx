import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenShell } from '../components/ScreenShell';
import { AppHeader } from '../components/AppHeader';
import { useAppContext } from '../context/AppContext';
import { colors } from '../theme';

const legalContent = {
  terms: {
    title: 'Terms of Use',
    body: [
      'BashayJabo helps users coordinate ride-sharing. You are responsible for your own travel decisions and safety practices.',
      'Users must provide accurate ride and profile information. Misleading ride details, abusive behavior, and fraudulent payment claims are prohibited.',
      'Ride availability, timing, and participation are not guaranteed by the platform. Ride owners and participants are independently responsible for agreements made in rides.',
      'BashayJabo may limit accounts or remove content that violates safety, trust, or legal standards.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'BashayJabo stores account, ride, request, chat, and payment-related metadata needed to operate ride-sharing features.',
      'Location and route information is used for ride matching, fare estimation, and request validation.',
      'Notifications are stored in-app for activity history and delivery reliability.',
      'You can update profile information and notification preferences from app settings. Sensitive access remains protected by authenticated API routes.',
    ],
  },
  safety: {
    title: 'Safety Guidelines',
    body: [
      'Review ride details, route fit, and participant identity before accepting or joining rides.',
      'Use in-app chat for coordination and keep communications respectful and relevant to the ride.',
      'Report suspicious behavior, spam, abuse, or payment disputes promptly through app reporting channels.',
      'In urgent situations, prioritize local emergency services. BashayJabo is a coordination platform, not an emergency service provider.',
    ],
  },
} as const;

type LegalType = keyof typeof legalContent;

export function LegalScreen() {
  const { darkMode } = useAppContext();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const key: LegalType = type === 'privacy' || type === 'safety' ? type : 'terms';
  const content = legalContent[key];

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';

  return (
    <ScreenShell scroll={false}>
      <AppHeader title={content.title} showBack={true} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.title, { color: textPrimary }]}>{content.title}</Text>
          {content.body.map((paragraph, index) => (
            <Text key={index} style={[styles.paragraph, { color: textSecondary }]}>
              {paragraph}
            </Text>
          ))}
          <Text style={[styles.disclaimer, { color: textSecondary }]}>Use BashayJabo responsibly and follow local laws and campus/community policies.</Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
