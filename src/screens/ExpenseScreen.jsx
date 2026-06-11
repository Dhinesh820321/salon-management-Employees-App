import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { expensesAPI, branchesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Wallet, QrCode, FileText, Clock } from 'lucide-react-native';

const COLORS = {
  primary: '#0ea5e9',
  success: '#22c55e',
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

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', icon: Wallet },
  { id: 'UPI', label: 'UPI', icon: QrCode },
];

const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  itemName: '',
  price: '',
  quantity: '1',
  subtotal: 0
});

export default function ExpenseScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [formData, setFormData] = useState({
    items: [createEmptyItem()],
    payment_mode: 'CASH',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isHelper = user?.role === 'helper';
  
  // All employees can view this screen
  // For helpers: show branch picker and require selection
  // For others: use their default branch

  // Set default branch for non-helpers on mount
  useEffect(() => {
    if (!isHelper && user?.branch_id) {
      const branchId = typeof user.branch_id === 'object' ? user.branch_id._id : user.branch_id;
      setSelectedBranch(branchId);
    }
  }, [isHelper, user?.branch_id]);

  // Fetch branches for helper to select
  useEffect(() => {
    branchesAPI.getAll({ status: 'active' })
      .then(res => {
        if (res.success) setBranches(res.data || []);
      })
      .catch(() => {});
  }, []);

  // Calculate grand total
  const grandTotal = formData.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // Update individual item
  const updateItem = (id, field, value) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate subtotal when price or quantity changes
        if (field === 'price' || field === 'quantity') {
          const price = field === 'price' ? parseFloat(value) || 0 : parseFloat(updated.price) || 0;
          const qty = field === 'quantity' ? parseInt(value) || 1 : parseInt(updated.quantity) || 1;
          updated.subtotal = price * qty;
        }
        
        return updated;
      }
      return item;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  // Add new item row
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()]
    });
  };

  // Remove item row
  const removeItem = (id) => {
    if (formData.items.length === 1) {
      Alert.alert('Cannot Remove', 'At least one item is required');
      return;
    }
    const updatedItems = formData.items.filter(item => item.id !== id);
    setFormData({ ...formData, items: updatedItems });
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check if at least one item has name and valid price
    const validItems = formData.items.filter(item => 
      item.itemName.trim() && parseFloat(item.price) > 0
    );
    
    if (validItems.length === 0) {
      newErrors.items = 'Add at least one item with name and price';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const branchId = selectedBranch || (typeof user?.branch_id === 'object' ? user?.branch_id?._id : user?.branch_id);
    if (!branchId && user?.role !== 'admin') {
      Alert.alert(
        'Branch Not Assigned',
        'Your account has no branch assigned. Please contact your admin to assign a branch.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // Clean up items - remove empty ones and calculate subtotals
      const cleanedItems = formData.items
        .filter(item => item.itemName.trim() && parseFloat(item.price) > 0)
        .map(item => ({
          itemName: item.itemName.trim(),
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity) || 1,
          subtotal: (parseFloat(item.price) * (parseInt(item.quantity) || 1))
        }));

      // Generate dynamic title from item names
      const itemNames = cleanedItems.map(i => i.itemName);
      let dynamicTitle;
      if (itemNames.length === 1) {
        dynamicTitle = itemNames[0];
      } else if (itemNames.length === 2) {
        dynamicTitle = itemNames.join(' & ');
      } else {
        dynamicTitle = `${itemNames[0]} + ${itemNames.length - 1} more`;
      }

      const expenseData = {
        title: dynamicTitle,
        items: cleanedItems,
        grand_total: parseFloat(grandTotal.toString()),
        payment_mode: formData.payment_mode,
        notes: formData.notes.trim(),
        // Helpers use selected branch, others use their default branch
        branch_id: selectedBranch || (typeof user?.branch_id === 'object' ? user?.branch_id?._id : user?.branch_id),
      };

      console.log('📤 EXPENSE REQUEST:', JSON.stringify(expenseData, null, 2));

      const res = await expensesAPI.create(expenseData);

      if (res.success) {
        Alert.alert(t('success'), t('expenseSaved'), [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                items: [createEmptyItem()],
                payment_mode: 'CASH',
                notes: '',
              });
              setErrors({});
            },
          },
        ]);
      } else {
        Alert.alert(t('error'), res.message || t('error'));
      }
    } catch (error) {
      console.error('Expense error:', error);
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error ||
                       error.message ||
                       t('error');
      Alert.alert(t('error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-6 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">{t('addExpense')}</Text>
        <Text className="text-gray-500 mt-1">{t('recordExpensePage')}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
          {/* Branch Selection for Helpers */}
          {isHelper && (
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-3">Select Branch *</Text>
              {branches.length > 0 ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedBranch}
                    onValueChange={(value) => setSelectedBranch(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a branch..." value="" />
                    {branches.map(branch => (
                      <Picker.Item key={branch._id} label={branch.name} value={branch._id} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text className="text-sm text-gray-400">Loading branches...</Text>
              )}
              {selectedBranch ? (
                <Text className="text-xs text-green-600 mt-2">
                  Selected: {branches.find(b => b._id === selectedBranch)?.name}
                </Text>
              ) : (
                <Text className="text-xs text-gray-500 mt-2">Please select a branch</Text>
              )}
            </View>
          )}

          {/* Items Section */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <Text className="text-sm font-semibold text-gray-700 mb-4">
              {t('items') || 'Items'} *
            </Text>
            
            {errors.items && (
              <Text className="text-red-500 text-sm mb-2">{errors.items}</Text>
            )}

            {formData.items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>#{index + 1}</Text>
                  {formData.items.length > 1 && (
                    <TouchableOpacity 
                      onPress={() => removeItem(item.id)}
                      style={styles.removeBtn}
                    >
                      <Trash2 size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.itemInputs}>
                  {/* Item Name */}
                  <TextInput
                    style={[styles.input, styles.nameInput]}
                    placeholder="Item Name"
                    value={item.itemName}
                    onChangeText={(text) => updateItem(item.id, 'itemName', text)}
                    editable={!loading}
                  />
                  
                  {/* Price */}
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    placeholder="Price"
                    keyboardType="decimal-pad"
                    value={item.price}
                    onChangeText={(text) => updateItem(item.id, 'price', text)}
                    editable={!loading}
                  />
                  
                  {/* Quantity */}
                  <TextInput
                    style={[styles.input, styles.qtyInput]}
                    placeholder="Qty"
                    keyboardType="number-pad"
                    value={item.quantity}
                    onChangeText={(text) => updateItem(item.id, 'quantity', text)}
                    editable={!loading}
                  />
                </View>
                
                {/* Subtotal */}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal:</Text>
                  <Text style={styles.subtotalValue}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Add More Button */}
            <TouchableOpacity 
              style={styles.addItemBtn}
              onPress={addItem}
              disabled={loading}
            >
              <Plus size={18} color={COLORS.primary} />
              <Text style={styles.addItemText}>Add More Item</Text>
            </TouchableOpacity>

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(grandTotal)}
              </Text>
            </View>
          </View>

          {/* Payment Mode */}
          <View className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <Text className="text-sm font-semibold text-gray-700 mb-3">{t('paymentMode')}</Text>
            <View className="flex-row gap-3">
              {PAYMENT_MODES.map(mode => {
                const modeLabel = mode.id === 'CASH' ? t('cash') : t('upi');
                const IconComponent = mode.icon;
                const isActive = formData.payment_mode === mode.id;
                const activeColor = mode.id === 'CASH' ? '#28a745' : '#007bff';
                const activeBg = mode.id === 'CASH' ? '#e6f9ed' : '#e6f0ff';
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.paymentBtn,
                      isActive && { borderColor: activeColor, backgroundColor: activeBg }
                    ]}
                    onPress={() => setFormData({ ...formData, payment_mode: mode.id })}
                    disabled={loading}
                  >
                    <IconComponent
                      size={20}
                      color={isActive ? activeColor : COLORS.gray[400]}
                    />
                    <Text
                      style={[
                        styles.paymentLabel,
                        isActive && { color: activeColor }
                      ]}
                    >
                      {modeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          {/* <View className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <Text className="text-sm font-semibold text-gray-700 mb-2">{t('notes')}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={t('notesPlaceholder') || 'Additional notes...'}
              multiline
              numberOfLines={3}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              editable={!loading}
            />
          </View> */}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              loading && styles.submitBtnDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                {t('recordExpenseBtn') || 'Record Expense'} ({formatCurrency(grandTotal)})
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  itemRow: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  removeBtn: {
    padding: 4,
  },
  itemInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  nameInput: {
    flex: 2,
  },
  priceInput: {
    flex: 1,
  },
  qtyInput: {
    flex: 0.7,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  subtotalLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginRight: 8,
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addItemText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.gray[50],
    gap: 8,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  notesInput: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});