import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../components/StyledText';
import { StyledTitle as Title } from '../../components/StyledTitle';
import { StyledButton as Button } from '../../components/StyledButton';
import { StyledScrollView as ScrollView } from '../../components/StyledScrollView';
import { authAPI } from '../../src/api/auth';
import { usersAPI } from '../../src/api/users';
import * as SecureStore from 'expo-secure-store';

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [address, setAddress] = useState('');
  const [fb, setFb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim() || null;
      const username = email.trim().split('@')[0];
      
      // Register and get token
      const { token, userId, userUuid } = await authAPI.register(
        email.trim(), 
        password, 
        name, 
        username, 
        phone.trim() || null, 
        gender ? gender.toLowerCase() : null, 
        university || null, 
        department || null, 
        address || null, 
        fb || null
      );
      
      // Verify token is stored
      const storedToken = await SecureStore.getItemAsync('authToken');
      if (!storedToken) {
        throw new Error('Failed to store authentication token');
      }
      
      // Add a small delay to ensure token is available in subsequent requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user data to verify registration
      try {
        await usersAPI.getCurrentUser();
      } catch (userErr) {
        console.log('Warning: Could not fetch user data after signup');
        console.log('getCurrentUser error details:', {
          message: userErr?.message,
          status: userErr?.response?.status,
          data: userErr?.response?.data,
          headers: userErr?.response?.headers?.authorization
        });
      }
      
      // Navigate to dashboard
      router.replace('/(app)/(dashboard)/dash');
    } catch (err) {
      console.log('Signup error:', err);
      console.log('Error response:', err?.response?.data);
      setError(err?.response?.data?.error || err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView>
      <Title>Create account</Title>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.half]}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First"
          />
        </View>
        <View style={[styles.fieldGroup, styles.half, styles.halfRight]}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="01XXXXXXXXX"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
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
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gender</Text>
        <TextInput
          style={styles.input}
          value={gender}
          onChangeText={setGender}
          placeholder="Male / Female / Other"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>University</Text>
        <TextInput
          style={styles.input}
          value={university}
          onChangeText={setUniversity}
          placeholder="Your university"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Department</Text>
        <TextInput
          style={styles.input}
          value={department}
          onChangeText={setDepartment}
          placeholder="Your department"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Your address"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Facebook</Text>
        <TextInput
          style={styles.input}
          value={fb}
          onChangeText={setFb}
          placeholder="Facebook profile"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={loading ? 'Creating account...' : 'Sign Up'} onPress={handleSignup} disabled={loading} style={styles.button} />

      {loading && <ActivityIndicator size="small" color="#e63e4c" />}

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
        <Text>Already have an account? </Text>
        <Text style={styles.linkText}>Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  fieldGroup: {
    width: '100%',
    marginTop: 12,
  },
  half: {
    flex: 1,
  },
  halfRight: {
    marginLeft: 10,
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
