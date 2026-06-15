import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  Edit,
  LogOut,
  ChevronRight,
  Settings,
  Camera,
} from 'lucide-react-native';
import { authAPI } from '../api/api';
import { API_URL, BASE_URL } from '../constants';

const COLORS = {
  primary: '#0ea5e9',
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
};

function ProfileItem({ icon: Icon, label, value }) {
  return (
    <View className="flex-row items-center py-4 border-b border-gray-100">
      <View className="p-2 bg-gray-100 rounded-lg mr-4">
        <Icon size={20} color={COLORS.gray[600]} />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-gray-500">{label}</Text>
        <Text className="font-semibold text-gray-900">{value || '-'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(null);



  // Load profile image when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileImage();
    }, [])
  );

  const loadProfileImage = async () => {
    console.log('[Profile] Loading profile image...');
    console.log('[Profile] User from auth:', user?.profile_image || user?.profile_photo);
    
    // Load from user in auth context first
    if (user?.profile_image || user?.profile_photo) {
      const img = user.profile_image || user.profile_photo;
      console.log('[Profile] Setting from user:', img);
      setProfileImageUri(img);
      return;
    }
    
    // Also check storage
    const savedUser = await AsyncStorage.getItem('@auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      console.log('[Profile] Saved user:', parsed?.profile_image || parsed?.profile_photo);
      if (parsed?.profile_image || parsed?.profile_photo) {
        setProfileImageUri(parsed.profile_image || parsed.profile_photo);
      }
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera and photo library permissions to upload profile photo.');
      return false;
    }
    return true;
  };

  const pickImage = async (useCamera) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result;
    
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    // Add explicit null check for result.assets
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: 'profile-photo.jpg',
      });

      const response = await fetch(`${API_URL}/auth/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('@auth_token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // Cloudinary URL is returned in data.profile_photo (or data.data.profile_photo depending on backend structure)
        // Since backend routes return successResponse or direct json, let's support both
        const resultData = data.data || data;
        const serverImageUrl = resultData.profile_photo || resultData.profile_image;
        console.log('[Profile] Server image URL:', serverImageUrl);
        
        // Update local state for immediate display
        setProfileImageUri(serverImageUrl);
        
        // Update user in AuthContext + AsyncStorage
        if (user) {
          const updatedUserData = { 
            ...user, 
            profile_image: serverImageUrl,
            profile_photo: serverImageUrl
          };
          await updateUser(updatedUserData);
        }
        
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePhotoPress = () => {
    Alert.alert(
      'Profile Photo',
      'What would you like to do?',
      [
        {
          text: 'Change Photo',
          onPress: showImageOptions,
        },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: handleRemovePhoto,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      
      const response = await fetch(`${API_URL}/auth/profile/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setProfileImageUri(null);
        
        // Update user in AuthContext + AsyncStorage
        if (user) {
          const updatedUserData = {
            ...user,
            profile_photo: null,
            profile_image: null
          };
          await updateUser(updatedUserData);
        }
        Alert.alert('Success', 'Profile photo removed successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to remove photo');
      }
    } catch (error) {
      console.error('Remove photo error:', error);
      Alert.alert('Error', 'Failed to remove photo. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const profileImageFullUri = useMemo(() => {
    const imagePath = profileImageUri || user?.profile_image || user?.profile_photo;
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${BASE_URL}${imagePath}`;
  }, [profileImageUri, user?.profile_image, user?.profile_photo]);

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-white px-5 py-8 items-center border-b border-gray-100">
          <TouchableOpacity 
            className="relative" 
            onPress={handlePhotoPress}
            disabled={uploading}
          >
            {uploading ? (
              <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : profileImageFullUri ? (
              <Image
                source={{ uri: profileImageFullUri }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center">
                <User size={40} color={COLORS.primary} />
              </View>
            )}
            <View className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full">
              {uploading ? (
                <ActivityIndicator size={12} color="white" />
              ) : (
                <Camera size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 mt-4">{user?.name || 'Employee'}</Text>
          <Text className="text-gray-500 mt-1 capitalize">{user?.role || 'Staff'}</Text>
        </View>

        <View className="px-5 py-6">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t('personalInfo')}
            </Text>
            <ProfileItem
              icon={Phone}
              label={t('phone')}
              value={user?.phone}
            />
            <ProfileItem
              icon={Mail}
              label={t('email')}
              value={user?.email}
            />
            <ProfileItem
              icon={Calendar}
              label={t('joined')}
              value={user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'
              }
            />
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t('workInfo')}
            </Text>
            <ProfileItem
              icon={Building}
              label={t('branch')}
              value={user?.branch_name || user?.branch_id || '-'}
            />
            <ProfileItem
              icon={MapPin}
              label={t('location')}
              value={user?.address || '-'}
            />
          </View>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 mb-3"
            onPress={() => navigation.navigate('Settings')}
          >
            <View className="flex-row items-center">
              <View className="p-2 bg-purple-100 rounded-lg mr-4">
                <Settings size={20} color="#9333ea" />
              </View>
              <Text className="font-semibold text-gray-900">{t('settings')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 mb-3"
          >
            <View className="flex-row items-center">
              <View className="p-2 bg-blue-100 rounded-lg mr-4">
                <Edit size={20} color={COLORS.primary} />
              </View>
              <Text className="font-semibold text-gray-900">{t('editProfile')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 mt-3"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <View className="p-2 bg-red-100 rounded-lg mr-4">
                <LogOut size={20} color={COLORS.danger} />
              </View>
              <Text className="font-semibold text-red-600">{t('logout')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
