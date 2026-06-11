import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Check,
} from 'lucide-react-native';

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
  success: '#22c55e',
  danger: '#ef4444',
};

const LANGUAGES = [
  { label: 'English', native: 'English', value: 'en' },
  { label: 'தமிழ்', native: 'Tamil', value: 'ta' },
  { label: 'हिन्दी', native: 'Hindi', value: 'hi' },
];

export default function SettingsScreen() {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="p-2 bg-blue-100 rounded-lg mr-3">
                <Globe size={20} color={COLORS.primary} />
              </View>
              <Text className="text-base font-semibold text-gray-900">
                {t('selectLanguage')}
              </Text>
            </View>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                onPress={() => changeLanguage(lang.value)}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                  language === lang.value
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <View className="flex-row items-center">
                  <Text
                    className={`text-lg font-medium ${
                      language === lang.value ? 'text-primary-600' : 'text-gray-700'
                    }`}
                  >
                    {lang.label}
                  </Text>
                  <Text
                    className={`ml-3 text-sm ${
                      language === lang.value ? 'text-blue-500' : 'text-gray-400'
                    }`}
                  >
                    {lang.native}
                  </Text>
                </View>
                {language === lang.value && (
                  <View className="p-1 bg-primary-600 rounded-full">
                    <Check size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-sm text-gray-500 text-center">
              {t('dataStoredEnglish')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
