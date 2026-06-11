import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { Scissors, Lock, Phone, MapPin, AlertCircle, Eye, EyeOff } from 'lucide-react-native';

const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: '#22c55e',
  danger: '#ef4444',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    } catch (err) {
      console.log('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (phone.length < 10) {
      setError('Enter valid 10-digit phone number');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      const res = await login(phone, password, location?.lat, location?.lng);
      if (!res.success) {
        setError(res.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-primary-100 rounded-2xl items-center justify-center mb-4">
              <Scissors size={32} color={COLORS.primary} />
            </View>
            <Text className="text-2xl font-bold text-gray-900">Employee Login</Text>
            <Text className="text-gray-500 mt-1">Sign in to continue</Text>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center">
              <AlertCircle size={20} color={COLORS.danger} />
              <Text className="text-red-700 ml-2 flex-1">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Phone Number</Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4">
                <Phone size={20} color={COLORS.gray[400]} />
                <TextInput
                  className="flex-1 py-4 px-3 text-gray-900"
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4">
                <Lock size={20} color={COLORS.gray[400]} />
                <TextInput
                  className="flex-1 py-4 px-3 text-gray-900"
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="p-2 -mr-2"
                >
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.gray[400]} />
                  ) : (
                    <Eye size={20} color={COLORS.gray[400]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {locationLoading ? (
              <View className="flex-row items-center justify-center py-3">
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text className="text-gray-500 ml-2 text-sm">Getting location...</Text>
              </View>
            ) : location ? (
              <View className="flex-row items-center py-3">
                <MapPin size={16} color={COLORS.success} />
                <Text className="text-gray-500 ml-2 text-sm">Location captured</Text>
              </View>
            ) : (
              <View className="flex-row items-center py-3">
                <MapPin size={16} color={COLORS.danger} />
                <Text className="text-gray-500 ml-2 text-sm">Location not available</Text>
              </View>
            )}

            <TouchableOpacity
              className={`py-4 rounded-xl items-center mt-4 ${loading ? 'bg-gray-400' : 'bg-primary-600'}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
