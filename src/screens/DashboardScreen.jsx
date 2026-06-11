import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { invoicesAPI, attendanceAPI } from '../api/api';
import {
  TrendingUp,
  Users,
  CreditCard,
  Clock,
  Receipt,
  ArrowRight,
  DollarSign,
} from 'lucide-react-native';
import { formatCurrency } from '../utils/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

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
  warning: '#f59e0b',
  danger: '#ef4444',
};

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-gray-500">{title}</Text>
        <View className={`p-2 rounded-xl ${color}`}>
          <Icon size={18} color="white" />
        </View>
      </View>
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-400 mt-1">{subtitle}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(null);

  // Watch for user changes
  React.useEffect(() => {
    if (user) {
      loadProfileImage();
    }
  }, [user]);

  // Construct full profile image URL
  const getHeaderProfileImage = () => {
    const imagePath = profileImageUri || user?.profile_image;
    
    if (!imagePath) return null;
    
    // Already full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Local path - prepend BASE_URL
    return `${BASE_URL}${imagePath}`;
  };

  // Load profile image
  const loadProfileImage = async () => {
    // Try auth context first
    if (user?.profile_image) {
      setProfileImageUri(user.profile_image);
      return;
    }
    
    // Try AsyncStorage
    const savedUser = await AsyncStorage.getItem('@auth_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.profile_image) {
        setProfileImageUri(parsed.profile_image);
      }
    }
  };

  const headerImageUri = getHeaderProfileImage();

  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayServices: 0,
    todayCollection: 0,
    monthlyCollection: 0,
    checkedIn: false,
    checkInTime: null,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Handle branch_id - could be object with _id or direct string
      let branchId = user?.branch_id?._id || user?.branch_id;
      
      // Also check for branchId (capital D)
      if (!branchId) {
        branchId = user?.branchId?._id || user?.branchId;
      }
      
      if (__DEV__) {
        console.log('[Dashboard] User branch_id:', user?.branch_id);
        console.log('[Dashboard] Using branchId:', branchId);
      }
      
      // Fetch attendance (works without branch)
      const attendanceRes = await attendanceAPI.getToday();
      
      if (attendanceRes.success && attendanceRes.data) {
        const myAttendance = attendanceRes.data;
        
        if (myAttendance && myAttendance.check_in) {
          setStats(prev => ({
            ...prev,
            checkedIn: !!myAttendance.check_in && !myAttendance.check_out,
            checkInTime: myAttendance.check_in,
          }));
        } else {
          setStats(prev => ({
            ...prev,
            checkedIn: false,
            checkInTime: null,
          }));
        }
      }

      // If no branch, skip revenue fetch
      if (!branchId) {
        if (__DEV__) console.log('[Dashboard] No branch assigned - skipping revenue');
        setLoading(false);
        return;
      }
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Fetch daily revenue and monthly revenue in parallel
      try {
        const [revenueRes, monthlyRes] = await Promise.all([
          invoicesAPI.getDailyRevenue({ branch_id: branchId, date: today }),
          invoicesAPI.getMonthlyRevenue({ branch_id: branchId, year: currentYear, month: currentMonth }),
        ]);

        if (__DEV__) {
          console.log('📊 Dashboard Revenue:', revenueRes);
          console.log('📊 Monthly Revenue:', monthlyRes);
        }

        let todayRevenue = 0, todayServices = 0, todayCollection = 0;
        if (revenueRes.success) {
          const revenueData = revenueRes.data || {};
          todayRevenue = parseFloat(revenueData.total) || 0;
          todayServices = parseInt(revenueData.count) || 0;
          todayCollection = (parseFloat(revenueData.upi) || 0) + (parseFloat(revenueData.cash) || 0) + (parseFloat(revenueData.card) || 0);
        }

        // Sum monthly collection from daily breakdown
        let monthlyCollection = 0;
        if (monthlyRes.success && Array.isArray(monthlyRes.data)) {
          monthlyCollection = monthlyRes.data.reduce((sum, day) => sum + (parseFloat(day.revenue) || 0), 0);
        }

        setStats(prev => ({
          ...prev,
          todayRevenue,
          todayServices,
          todayCollection,
          monthlyCollection,
        }));
      } catch (revenueErr) {
        if (__DEV__) console.log('[Dashboard] Revenue fetch error:', revenueErr.message);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4 pb-6 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Hello, {user?.name?.split(' ')[0] || 'Employee'}! 👋
              </Text>
              <Text className="text-gray-500 mt-1">{t('viewDetails')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              className="p-1"
            >
              {headerImageUri ? (
                <Image
                  source={{ uri: headerImageUri }}
                  style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.primary }}
                  onError={(e) => console.log('[Dashboard] Image load error:', e.nativeEvent.error)}
                  onLoad={() => console.log('[Dashboard] Image loaded successfully')}
                />
              ) : (
                <View
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'E'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 py-6">
          <View className="flex-row gap-3 mb-4">
            <StatCard
              title={t('todayRevenue')}
              value={formatCurrency(stats.todayRevenue)}
              subtitle={`${stats.todayServices} ${t('services')}`}
              icon={TrendingUp}
              color="bg-green-500"
            />
            <StatCard
              title={t('collection')}
              value={formatCurrency(stats.monthlyCollection)}
              subtitle={`${new Date().toLocaleString('default', { month: 'long' })} Total`}
              icon={CreditCard}
              color="bg-blue-500"
            />
          </View>

          <View className="flex-row gap-3 mb-6">
            <StatCard
              title={t('status')}
              value={stats.checkedIn ? t('active') : t('away')}
              subtitle={stats.checkInTime 
                ? `${t('checkIn')}: ${new Date(stats.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : t('notCheckedIn')}
              icon={Clock}
              color={stats.checkedIn ? 'bg-green-500' : 'bg-gray-400'}
            />
            <StatCard
              title={t('services')}
              value={stats.todayServices.toString()}
              subtitle={t('completed')}
              icon={Receipt}
              color="bg-purple-500"
            />
          </View>

          <Text className="text-lg font-bold text-gray-900 mb-4">{t('quickActions')}</Text>
          
          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => navigation.navigate('Billing')}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="p-3 bg-blue-100 rounded-xl mr-4">
                  <Receipt size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">{t('newBilling')}</Text>
                  <Text className="text-sm text-gray-500">{t('createInvoice')}</Text>
                </View>
              </View>
              <ArrowRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Attendance')}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="p-3 bg-green-100 rounded-xl mr-4">
                  <Clock size={24} color={COLORS.success} />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">{t('markAttendance')}</Text>
                  <Text className="text-sm text-gray-500">
                    {stats.checkedIn ? t('checkOut') : t('checkIn')}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Expense')}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="p-3 bg-orange-100 rounded-xl mr-4">
                  <CreditCard size={24} color={COLORS.warning} />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">{t('addExpense')}</Text>
                  <Text className="text-sm text-gray-500">{t('recordExpense')}</Text>
                </View>
              </View>
              <ArrowRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Collection')}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="p-3 bg-green-100 rounded-xl mr-4">
                  <DollarSign size={24} color={COLORS.success} />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">{t('collection') || 'Daily Collection'}</Text>
                  <Text className="text-sm text-gray-500">View today's collection</Text>
                </View>
              </View>
              <ArrowRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="p-3 bg-purple-100 rounded-xl mr-4">
                  <Users size={24} color="#9333ea" />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">{t('myProfile')}</Text>
                  <Text className="text-sm text-gray-500">{t('viewDetails')}</Text>
                </View>
              </View>
              <ArrowRight size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
