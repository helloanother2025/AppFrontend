import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authAPI } from '../api/auth';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { colors } from '../theme';

type AuthMode = 'welcome' | 'signin' | 'user-info' | 'profile-pic' | 'demo-info';
const BRAND = colors.brand;

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <View style={[styles.googleTile, { backgroundColor: '#4285F4' }]} />
      <View style={[styles.googleTile, { backgroundColor: '#34A853' }]} />
      <View style={[styles.googleTile, { backgroundColor: '#FBBC05' }]} />
      <View style={[styles.googleTile, { backgroundColor: '#EA4335' }]} />
    </View>
  );
}

export function LoginScreen() {
  const { setIsDemoMode, setCurrentUserAvatar } = useAppContext();
  const { login, refreshUser, isAuthenticated, isLoading } = useUser();
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [signupRulesAccepted, setSignupRulesAccepted] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading]);

  const enterMain = (guest: boolean) => {
    setIsDemoMode(guest);
    router.replace('/(app)');
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Sign in', 'Enter an email and password to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password.trim());
      setIsDemoMode(false);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Sign in failed', err?.message || 'Check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    enterMain(true);
  };

  const getSignupWarnings = () => {
    const warnings: string[] = [];

    if (!email.trim()) {
      warnings.push('Add a valid email address.');
    } else if (!email.includes('@')) {
      warnings.push('Use a valid email format.');
    }

    if (!password.trim()) {
      warnings.push('Create a password.');
    } else if (password.trim().length < 8) {
      warnings.push('Use at least 8 characters for your password.');
    }

    if (!signupRulesAccepted) {
      warnings.push('Accept the account creation rules before continuing.');
    }

    return warnings;
  };

  const handleBeginSignup = () => {
    const warnings = getSignupWarnings();

    if (warnings.length > 0) {
      Alert.alert('Before you continue', warnings.join('\n'));
      return;
    }

    setMode('user-info');
  };

  const handleUserInfoNext = () => {
    if (!username.trim() || !contactNumber.trim()) {
      Alert.alert('Complete profile', 'Enter at least a username and contact number.');
      return;
    }
    setMode('profile-pic');
  };

  const handleProfilePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfilePic(uri);
      setCurrentUserAvatar(uri);
    }
  };

  const handleFinishSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Sign up', 'Enter an email and password to continue.');
      return;
    }

    const resolvedUsername = username.trim() || email.trim().split('@')[0] || 'Guest';

    setIsSubmitting(true);
    try {
      await authAPI.register(
        email.trim(),
        password.trim(),
        resolvedUsername,
        resolvedUsername,
        contactNumber.trim(),
        gender,
        '',
        department.trim(),
        address.trim(),
        studentId.trim() || undefined
      );

      await refreshUser();

      if (profilePic) {
        setCurrentUserAvatar(profilePic);
      }

      setIsDemoMode(false);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Sign up failed', err?.message || 'Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {mode === 'welcome' ? (
          <View style={styles.card}>
            <Text style={styles.brand}>BashayJabo</Text>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Join students sharing rides safely across campus and city routes.</Text>

            <TextInput value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#9CA3AF" />

            <View style={styles.passwordWrap}>
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} placeholderTextColor="#9CA3AF" />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text style={styles.eyeButtonText}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>

            <View style={styles.ruleCard}>
              <View style={styles.ruleHeaderRow}>
                <Ionicons name="warning-outline" size={16} color="#B45309" />
                <Text style={styles.ruleTitle}>Account creation rules</Text>
              </View>
              <Text style={styles.ruleText}>Please confirm these before continuing:</Text>
              <View style={styles.ruleList}>
                <Text style={styles.ruleItem}>• Email must be valid and reachable</Text>
                <Text style={styles.ruleItem}>• Password must be at least 8 characters</Text>
                <Text style={styles.ruleItem}>• Username and contact number are required later</Text>
                <Text style={styles.ruleItem}>• Profile photo is optional</Text>
              </View>
              <Pressable onPress={() => setSignupRulesAccepted((prev) => !prev)} style={styles.ruleCheckRow}>
                <View style={[styles.ruleCheckbox, signupRulesAccepted ? styles.ruleCheckboxActive : null]}>
                  {signupRulesAccepted ? <Ionicons name="checkmark" size={11} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.ruleCheckText}>I understand and agree to follow these rules.</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleBeginSignup} style={[styles.primaryButton, !signupRulesAccepted ? styles.primaryButtonDisabled : null]}>
              <View style={styles.buttonRow}>
                <GoogleIcon />
                <Text style={styles.primaryButtonTextDark}>Sign Up with Google</Text>
              </View>
            </Pressable>

            <Pressable onPress={handleBeginSignup} style={[styles.secondaryButton, !signupRulesAccepted ? styles.secondaryButtonDisabled : null]}>
              <Text style={styles.secondaryButtonText}>Sign Up with Email</Text>
            </Pressable>

            <Text style={styles.smallCenter}>
              Already have an account?{' '}
              <Text onPress={() => setMode('signin')} style={styles.brandLink}>
                Sign in
              </Text>
            </Text>

            <View style={styles.guestCard}>
              <View style={styles.guestHeaderRow}>
                <View style={styles.guestIconWrap}>
                  <Ionicons name="globe-outline" size={18} color="#666666" />
                </View>
                <View>
                  <Text style={styles.guestTitle}>Browse as Guest</Text>
                  <Text style={styles.smallGray}>Explore without an account</Text>
                </View>
              </View>
              <Text style={styles.guestDesc}>View rides, profiles, and the app — but you won't be able to join or create rides without signing in.</Text>
              <Pressable onPress={() => setMode('demo-info')} style={styles.guestButton}>
                <Text style={styles.guestButtonText}>Continue as Guest →</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {mode === 'signin' ? (
          <View style={styles.card}>
            <Pressable onPress={() => setMode('welcome')} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue where you left off.</Text>

            <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#9CA3AF" />
            <View style={styles.passwordWrap}>
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} placeholderTextColor="#9CA3AF" />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text style={styles.eyeButtonText}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            <View style={styles.forgotRow}>
              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleSignIn} style={styles.darkButton}>
              <View style={styles.buttonRow}>
                <Text style={styles.darkButtonText}>Sign In</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.smallCenter}>
              Don't have an account?{' '}
              <Text onPress={() => setMode('welcome')} style={styles.brandLink}>
                Sign up
              </Text>
            </Text>
            <Text onPress={() => setMode('demo-info')} style={styles.smallGrayCenter}>Continue as guest →</Text>
          </View>
        ) : null}

        {mode === 'user-info' ? (
          <View style={styles.card}>
            <Pressable onPress={() => setMode('welcome')} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Tell us about you</Text>
            <Text style={styles.subtitle}>These details are shown on your profile.</Text>

            <TextInput value={username} onChangeText={setUsername} placeholder="Username" style={styles.input} placeholderTextColor="#9CA3AF" />
            <TextInput value={contactNumber} onChangeText={setContactNumber} placeholder="Contact number" keyboardType="phone-pad" style={styles.input} placeholderTextColor="#9CA3AF" />
            <TextInput value={studentId} onChangeText={setStudentId} placeholder="Student ID" style={styles.input} placeholderTextColor="#9CA3AF" />
            <TextInput value={department} onChangeText={setDepartment} placeholder="Department" style={styles.input} placeholderTextColor="#9CA3AF" />
            <View>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {([
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ] as const).map((option) => (
                  <Pressable key={option.value} onPress={() => setGender(option.value)} style={[styles.genderButton, gender === option.value ? styles.genderButtonActive : null]}>
                    <Text style={[styles.genderText, gender === option.value ? styles.genderTextActive : null]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput value={address} onChangeText={setAddress} placeholder="Address" style={styles.input} placeholderTextColor="#9CA3AF" />

            <Pressable onPress={handleUserInfoNext} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'profile-pic' ? (
          <View style={styles.card}>
            <Pressable onPress={() => setMode('user-info')} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Add a photo</Text>
            <Text style={styles.subtitle}>A profile photo helps other riders recognize you</Text>

            <Pressable onPress={handleProfilePick} style={styles.photoButton}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={28} color="#999999" />
                  <Text style={styles.photoPlaceholderText}>Upload photo</Text>
                </View>
              )}
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </Pressable>

            <Pressable onPress={handleFinishSignup} style={styles.darkButton}>
              <View style={styles.buttonRow}>
                <Text style={styles.darkButtonText}>{profilePic ? 'Finish Setup' : 'Skip for now'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </Pressable>

            <Pressable onPress={handleProfilePick}>
              <Text style={styles.photoAltAction}>Choose a different photo</Text>
            </Pressable>

            <View style={styles.photoInfoCard}>
              <Ionicons name="person-outline" size={20} color="#999999" />
              <Text style={styles.photoInfoText}>Your profile picture is only visible to other BashayJabo users after they join the same ride as you.</Text>
            </View>
          </View>
        ) : null}

        {mode === 'demo-info' ? (
          <View style={styles.card}>
            <Pressable onPress={() => setMode('welcome')} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Guest mode</Text>
            <Text style={styles.subtitle}>Browse rides and profiles without creating an account.</Text>

            <View style={styles.infoList}>
              <Text style={styles.infoItem}>Can browse rides and route details</Text>
              <Text style={styles.infoItem}>Can view profiles and ratings</Text>
              <Text style={styles.infoItem}>Cannot create rides or use payment features</Text>
              <Text style={styles.infoItem}>Cannot save data between sessions</Text>
            </View>

            <Pressable onPress={handleGuest} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Enter as guest</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    gap: 14,
  },
  brand: {
    color: colors.brand,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
  },
  subtitle: {
    marginBottom: 8,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: colors.brand,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonTextDark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: BRAND,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '600',
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  darkButton: {
    backgroundColor: '#111111',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
  },
  darkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoList: {
    gap: 8,
    paddingVertical: 8,
  },
  infoItem: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: 4,
  },
  googleTile: {
    width: 9,
    height: 9,
  },
  smallGray: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 12,
  },
  ruleCard: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  ruleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  ruleText: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 18,
  },
  ruleList: {
    gap: 4,
  },
  ruleItem: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
  },
  ruleCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  ruleCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  ruleCheckboxActive: {
    borderColor: '#D97706',
    backgroundColor: '#D97706',
  },
  ruleCheckText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
  },
  guestCard: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
  },
  guestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guestIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
  },
  guestTitle: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
  },
  guestDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#1C1C1E',
    fontSize: 13,
    fontWeight: '500',
  },
  smallCenter: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  brandLink: {
    color: BRAND,
    fontWeight: '600',
  },
  smallGrayCenter: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: 'absolute',
    right: 18,
    top: 14,
  },
  eyeButtonText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  forgotRow: {
    alignItems: 'flex-end',
  },
  forgotText: {
    color: BRAND,
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E',
  },
  genderText: {
    color: '#666666',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoButton: {
    width: 112,
    height: 112,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAltAction: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  photoInfoCard: {
    marginTop: 'auto',
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoInfoText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
});
