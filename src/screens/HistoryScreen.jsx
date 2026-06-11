import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { attendanceAPI } from '../api/api';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, LogIn, LogOut, Calendar, Coffee } from 'lucide-react-native';

const COLORS = {
  primary: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
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

const FILTERS = [
  { key: 'today', labelKey: 'today' },
  { key: 'week', labelKey: 'thisWeek' },
  { key: 'month', labelKey: 'thisMonth' },
  { key: 'all', labelKey: 'all' },
];

function AttendanceCard({ item, t }) {
  const checkIn = item.start_time;
  const checkOut = item.end_time;
  const isInProgress = !!checkIn && !checkOut;
  const isCompleted = !!checkIn && !!checkOut;
  const isAbsent = !checkIn && !checkOut;

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = () => {
    if (!checkIn) return '--';
    if (!checkOut) return t('running');
    const inTime = new Date(checkIn);
    const outTime = new Date(checkOut);
    const diff = Math.abs(outTime - inTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusConfig = () => {
    if (isInProgress) {
      return {
        label: t('inProgress'),
        bgColor: '#fff7ed',
        textColor: '#c2410c',
        borderColor: '#fed7aa',
      };
    }
    if (isCompleted) {
      return {
        label: t('completed'),
        bgColor: '#f0fdf4',
        textColor: '#15803d',
        borderColor: '#bbf7d0',
      };
    }
    return {
      label: t('notCheckedIn'),
      bgColor: '#f3f4f6',
      textColor: '#6b7280',
      borderColor: '#e5e7eb',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={COLORS.gray[600]} />
          <Text style={styles.dateText}>
            {formatDate(item.date || item.created_at)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusConfig.bgColor,
              borderColor: statusConfig.borderColor,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {!isAbsent && (
        <>
          <View style={styles.divider} />

          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <View style={styles.timeLabel}>
                <LogIn size={14} color={COLORS.success} />
                <Text style={styles.timeLabelText}>{t('checkIn')}</Text>
              </View>
              <Text style={styles.timeValue}>{formatTime(checkIn)}</Text>
            </View>

            <View style={styles.timeItem}>
              <View style={styles.timeLabel}>
                <LogOut size={14} color={COLORS.danger} />
                <Text style={styles.timeLabelText}>{t('checkOut')}</Text>
              </View>
              <Text style={styles.timeValue}>{formatTime(checkOut)}</Text>
            </View>

            <View style={styles.timeItem}>
              <View style={styles.timeLabel}>
                <Coffee size={14} color={COLORS.primary} />
                <Text style={styles.timeLabelText}>{t('workHours')}</Text>
              </View>
              <Text
                style={[
                  styles.timeValue,
                  isInProgress && styles.runningText,
                ]}
              >
                {calculateDuration()}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchHistory = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      }

      const params = {};
      if (filter !== 'all') {
        params.filter = filter;
      }

      const res = await attendanceAPI.getHistory(params);

      if (res.success) {
        const data = res.data?.attendance || res.data || [];
        setAttendance(data);
      }
    } catch (error) {
      console.error('History error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = useCallback(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  const filteredData = attendance;

  const renderItem = useCallback(({ item }) => <AttendanceCard item={item} t={t} />, [t]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Clock size={48} color={COLORS.gray[300]} />
      <Text style={styles.emptyText}>{t('noData')}</Text>
    </View>
  );

  const renderFilterButton = ({ key, labelKey }) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.filterButton,
        filter === key && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(key)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === key && styles.filterButtonTextActive,
        ]}
      >
        {t(labelKey)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('attendanceHistory')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollContainer}
        contentContainerStyle={styles.filterContentContainer}
      >
        {FILTERS.map(renderFilterButton)}
      </ScrollView>

      {loading && attendance.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item._id?.toString() || item.id?.toString() || index.toString()
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  filterScrollContainer: {
    flexGrow: 0,
    backgroundColor: '#ffffff',
  },
  filterContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    paddingRight: 30,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#0ea5e9',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  timeRow: {
    gap: 12,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabelText: {
    fontSize: 13,
    color: '#6b7280',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  runningText: {
    color: '#0ea5e9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
    marginTop: 12,
  },
});
