import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../components/StyledText';
import { StyledTitle as Title } from '../../components/StyledTitle';
import { StyledButton as Button } from '../../components/StyledButton';
import { StyledScrollView as ScrollView } from '../../components/StyledScrollView';
import { StyledSearchBar as TextInput } from '../../components/StyledSearchBar'
import { authAPI } from '../../src/api/auth';
import { usersAPI } from '../../src/api/users';
import * as SecureStore from 'expo-secure-store';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      // Login and get token
      const { token, userId, userUuid } = await authAPI.login(email.trim(), password);
      
      // Verify token is stored
      const storedToken = await SecureStore.getItemAsync('authToken');
      if (!storedToken) {
        throw new Error('Failed to store authentication token');
      }
      
      // Fetch user data to verify login
      await usersAPI.getCurrentUser();
      
      // Navigate to dashboard
      router.replace('/(app)/(dashboard)/dash');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView>
      <View style={styles.headerSpacer} />
      <Title>Welcome back</Title>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={loading ? 'Logging in...' : 'Log In'} onPress={handleLogin} disabled={loading} style={styles.button} />

      {loading && <ActivityIndicator size="small" color="#e63e4c" />}

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.linkRow}>
        <Text>Don’t have an account? </Text>
        <Text style={styles.linkText}>Sign up</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerSpacer: {
    height: 100,
  },
  fieldGroup: {
    width: '100%',
    marginTop: 12,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
  error: {
    color: '#e63e4c',
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#e63e4c',
    fontWeight: 'bold',
  },
});
