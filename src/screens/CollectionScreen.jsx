import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { reportsAPI } from '../api/api';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, DollarSign, CreditCard, Banknote, ArrowDownRight, ChevronLeft, ChevronRight, Receipt, Wallet, ArrowLeft } from 'lucide-react-native';

const COLORS = {
  primary: '#0ea5e9',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
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

function formatCurrency(amount) {
  return `Rs. ${parseFloat(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function SummaryCard({ title, amount, icon: Icon, color, bgColor }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={[styles.summaryAmount, { color }]}>{formatCurrency(amount)}</Text>
      </View>
    </View>
  );
}

function EntryItem({ entry, index, type }) {
  return (
    <View style={styles.entryItem}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryIndex}>{index + 1}</Text>
        <View style={styles.entryDetails}>
          <Text style={styles.entryName}>{entry.customer_name}</Text>
          <Text style={styles.entryMeta}>
            {entry.items || 'Service'} • {entry.time}
          </Text>
        </View>
      </View>
      <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
    </View>
  );
}

function ExpenseItem({ expense, index, onPress }) {
  const amount = Number(expense.grand_total) || Number(expense.amount) || 0;
  return (
    <TouchableOpacity style={styles.expenseItem} onPress={() => onPress(expense)} activeOpacity={0.7}>
      <View style={styles.expenseLeft}>
        <Text style={styles.expenseIndex}>{index + 1}</Text>
        <View style={styles.expenseDetails}>
          <Text style={styles.expenseTitle}>{expense.title}</Text>
          <Text style={styles.expenseMeta}>{expense.time}</Text>
        </View>
      </View>
      <Text style={styles.expenseAmount}>{formatCurrency(amount)}</Text>
    </TouchableOpacity>
  );
}

export default function CollectionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedExpense, setSelectedExpense] = useState(null);

  const openExpenseDetails = (expense) => {
    setSelectedExpense(expense);
  };

  const closeExpenseDetails = () => {
    setSelectedExpense(null);
  };

  const fetchCollection = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await reportsAPI.getDailyCollection({ date: selectedDate });
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Collection error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchCollection();
    }, [fetchCollection])
  );

  const changeDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const TABS = [
    { key: 'summary', label: t('summary') || 'Summary' },
    { key: 'upi', label: 'UPI' },
    { key: 'cash', label: 'Cash' },
    { key: 'expenses', label: t('expenses') || 'Expenses' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const balance = (data?.totalCash || 0) + (data?.totalUPI || 0) - (data?.totalExpense || 0);
  const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Custom Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('collection') || 'Daily Collection'}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <ChevronLeft size={24} color={COLORS.gray[600]} />
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Calendar size={16} color={COLORS.gray[500]} />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayText}>Today</Text></View>}
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <ChevronRight size={24} color={COLORS.gray[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCollection(true)} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'summary' && (
          <View style={styles.section}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                {formatCurrency(balance)}
              </Text>
            </View>

            <SummaryCard
              title="Cash Collection"
              amount={data?.totalCash || 0}
              icon={Banknote}
              color={COLORS.success}
              bgColor="#dcfce7"
            />
            <SummaryCard
              title="UPI Collection"
              amount={data?.totalUPI || 0}
              icon={CreditCard}
              color={COLORS.primary}
              bgColor="#dbeafe"
            />
               <SummaryCard
              title="Expenses"
              amount={data?.totalExpense || 0}
              icon={ArrowDownRight}
              color={COLORS.danger}
              bgColor="#fee2e2"
            />
            <SummaryCard
              title="Total Collection"
              amount={data?.totalCollection || 0}
              icon={Wallet}
              color="#7c3aed"
              bgColor="#ede9fe"
            />
         

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data?.cashEntries?.length || 0}</Text>
                <Text style={styles.statLabel}>Cash Txns</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data?.upiEntries?.length || 0}</Text>
                <Text style={styles.statLabel}>UPI Txns</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{data?.expenses?.length || 0}</Text>
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'upi' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>UPI Entries ({data?.upiEntries?.length || 0})</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(data?.totalUPI || 0)}</Text>
            </View>
            {(data?.upiEntries?.length || 0) > 0 ? (
              data.upiEntries.map((entry, index) => (
                <EntryItem key={entry._id || index} entry={entry} index={index} type="upi" />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No UPI entries for this date</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'cash' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Banknote size={18} color={COLORS.success} />
              <Text style={styles.sectionTitle}>Cash Entries ({data?.cashEntries?.length || 0})</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(data?.totalCash || 0)}</Text>
            </View>
            {(data?.cashEntries?.length || 0) > 0 ? (
              data.cashEntries.map((entry, index) => (
                <EntryItem key={entry._id || index} entry={entry} index={index} type="cash" />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No cash entries for this date</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'expenses' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Receipt size={18} color={COLORS.danger} />
              <Text style={styles.sectionTitle}>Expenses ({data?.expenses?.length || 0})</Text>
              <Text style={[styles.sectionTotal, { color: COLORS.danger }]}>
                {formatCurrency(data?.totalExpense || 0)}
              </Text>
            </View>
            {(data?.expenses?.length || 0) > 0 ? (
              data.expenses.map((expense, index) => (
                <ExpenseItem key={expense._id || index} expense={expense} index={index} onPress={openExpenseDetails} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses for this date</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {selectedExpense && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeExpenseDetails} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Details</Text>
              <TouchableOpacity onPress={closeExpenseDetails}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{selectedExpense.title}</Text>
            <Text style={styles.modalDate}>{selectedExpense.date} • {selectedExpense.time}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalSectionTitle}>Items</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
              {selectedExpense.items?.length > 0 ? (
                selectedExpense.items.map((item, idx) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <Text style={styles.modalItemIndex}>{idx + 1}.</Text>
                    <Text style={styles.modalItemName}>{item.itemName}</Text>
                    <Text style={styles.modalItemCalc}>
                      {item.quantity} x Rs. {item.price} = Rs. {((item.quantity || 1) * (item.price || 0)).toFixed(0)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No items in this expense</Text>
              )}
            </ScrollView>
            <View style={styles.modalDivider} />
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Total</Text>
              <Text style={styles.modalTotalValue}>
                {formatCurrency(Number(selectedExpense.grand_total) || Number(selectedExpense.amount) || 0)}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={closeExpenseDetails}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateArrow: {
    padding: 8,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  todayBadge: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabScroll: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#0ea5e9',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryTitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  entryItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entryIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 10,
  },
  entryDetails: {
    flex: 1,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  entryMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  expenseItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginRight: 10,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  expenseMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 20,
    color: '#6b7280',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalScroll: {
    maxHeight: 200,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemIndex: {
    fontSize: 13,
    color: '#6b7280',
    width: 24,
  },
  modalItemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  modalItemCalc: {
    fontSize: 13,
    color: '#6b7280',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
  },
  modalButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});
