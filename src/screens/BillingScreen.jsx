import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { customersAPI, servicesAPI, invoicesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  User,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  Smartphone,
  Receipt,
  X,
  Check,
  Pencil,
  RotateCcw,
  Trash2,
  UserPlus,
  UserCheck,
  AlertCircle,
  Wallet,
  QrCode,
} from 'lucide-react-native';
import { formatCurrency } from '../utils/helpers';

// ── Debounce helper ──────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

// ── Constants ────────────────────────────────────────────────────
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

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: Wallet },
  { id: 'UPI', label: 'UPI', icon: QrCode },
];

// ── Main Component ───────────────────────────────────────────────
export default function BillingScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scrollViewRef = useRef(null);

  // Steps & form state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Customer state
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState(null);
  const [isWalkin, setIsWalkin] = useState(false);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearched, setCustomerSearched] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Customer cache
  const recentCustomersCache = useRef(new Map());

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await servicesAPI.getAll();
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (error) {
      console.error('Services error:', error);
    }
  };

  // ── Debounced mobile search (300ms) ──────────────────────────
  const debouncedSearchRef = useRef(null);

  useEffect(() => {
    debouncedSearchRef.current = debounce(async (mobile) => {
      if (!mobile || mobile.replace(/\D/g, '').length < 10) return;

      const cleaned = mobile.replace(/\D/g, '').slice(-10);

      // Check cache first
      if (recentCustomersCache.current.has(cleaned)) {
        const cached = recentCustomersCache.current.get(cleaned);
        setCustomer(cached);
        setCustomerName(cached.name || '');
        setIsNewCustomer(false);
        setCustomerSearched(true);
        setCustomerSearchLoading(false);
        return;
      }

      setCustomerSearchLoading(true);
      try {
        const res = await customersAPI.searchByMobile(cleaned);
        if (res.success && res.data) {
          recentCustomersCache.current.set(cleaned, res.data);
          setCustomer(res.data);
          setCustomerName(res.data.name || '');
          setIsNewCustomer(false);
        } else {
          setCustomer(null);
          setCustomerName('');
          setIsNewCustomer(true);
        }
        setCustomerSearched(true);
      } catch (err) {
        console.error('Customer search error:', err);
        setCustomer(null);
        setIsNewCustomer(true);
        setCustomerSearched(true);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);

    return () => debouncedSearchRef.current?.cancel();
  }, []);

  // ── Phone change handler ─────────────────────────────────────
  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
      setPhoneError('');
      setCustomerSearched(false);
      setCustomer(null);
      setCustomerName('');
      setIsNewCustomer(false);

      if (cleaned.length === 10) {
        debouncedSearchRef.current?.(cleaned);
      }
    }
  };

  const validatePhone = () => {
    if (phone.length > 0 && phone.length < 10) {
      setPhoneError('Enter valid 10-digit mobile number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // ── Manual search button ─────────────────────────────────────
  const searchCustomer = async () => {
    if (!validatePhone()) return;
    if (!phone || phone.length < 10) {
      setPhoneError('Enter valid 10-digit mobile number');
      return;
    }
    debouncedSearchRef.current?.cancel();

    const cleaned = phone.replace(/\D/g, '').slice(-10);

    if (recentCustomersCache.current.has(cleaned)) {
      const cached = recentCustomersCache.current.get(cleaned);
      setCustomer(cached);
      setCustomerName(cached.name || '');
      setIsNewCustomer(false);
      setCustomerSearched(true);
      return;
    }

    setCustomerSearchLoading(true);
    try {
      const res = await customersAPI.searchByMobile(cleaned);
      if (res.success && res.data) {
        recentCustomersCache.current.set(cleaned, res.data);
        setCustomer(res.data);
        setCustomerName(res.data.name || '');
        setIsNewCustomer(false);
      } else {
        setCustomer(null);
        setCustomerName('');
        setIsNewCustomer(true);
      }
      setCustomerSearched(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to search customer');
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  // ── Pick walk-in ─────────────────────────────────────────────
  const handleWalkin = () => {
    setCustomer(null);
    setIsWalkin(true);
    setPhone('');
    setCustomerName('Walk-in');
    setCustomerSearched(false);
    setIsNewCustomer(false);
    setShowCustomerModal(false);
  };

  // ── Service manipulation ─────────────────────────────────────
  const toggleService = (service) => {
    const existing = selectedServices.find(s => s.service_id === service.id);
    if (existing) {
      setSelectedServices(selectedServices.filter(s => s.service_id !== service.id));
    } else {
      setSelectedServices([...selectedServices, {
        service_id: service.id,
        name: service.name,
        price: service.price,
        editedPrice: service.price,
        priceInput: String(service.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (serviceId, delta) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id === serviceId) {
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      }
      return s;
    }));
  };

  const updatePrice = (serviceId, text) => {
    const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1');
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id === serviceId) {
        const numericVal = parseFloat(cleaned);
        return {
          ...s,
          priceInput: cleaned,
          editedPrice: (!isNaN(numericVal) && numericVal >= 0) ? numericVal : s.price,
        };
      }
      return s;
    }));
  };

  const handlePriceBlur = (serviceId) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id === serviceId) {
        const numericVal = parseFloat(s.priceInput);
        if (isNaN(numericVal) || numericVal < 0 || s.priceInput.trim() === '') {
          return { ...s, priceInput: String(s.price), editedPrice: s.price };
        }
        return { ...s, priceInput: String(numericVal), editedPrice: numericVal };
      }
      return s;
    }));
  };

  const resetPrice = (serviceId) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id === serviceId) {
        return { ...s, priceInput: String(s.price), editedPrice: s.price };
      }
      return s;
    }));
  };

  const removeService = (serviceId) => {
    setSelectedServices(selectedServices.filter(s => s.service_id !== serviceId));
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, s) => {
      const price = (s.editedPrice !== undefined && s.editedPrice !== null) ? s.editedPrice : s.price;
      return sum + (Number(price) * s.quantity);
    }, 0);
  };

  // ── Scroll to focused input ──────────────────────────────────
  const scrollToInput = (y) => {
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  };

  // ── Invoice submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user?.branch_id && user?.role !== 'admin') {
      Alert.alert(
        'Branch Not Assigned',
        'Your account has no branch assigned. Please contact your admin to assign a branch.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert(t('error'), t('selectServices'));
      return;
    }
    if (!paymentMethod) {
      Alert.alert(t('error'), t('selectPayment'));
      return;
    }

    setLoading(true);
    try {
      let customerId = customer?._id || customer?.id || null;
      let finalCustomerName = customerName || t('walkIn');

      // If new customer with phone, create customer first
      if (!customerId && phone && phone.length === 10 && !isWalkin) {
        if (!customerName.trim()) {
          setNameError(t('nameRequired'));
          setLoading(false);
          return;
        }
        try {
          const customerRes = await customersAPI.findOrCreate({
            name: customerName.trim(),
            phone: phone,
            branch_id: user.branch_id, // Include branch_id when creating customer
          });
          if (customerRes.success && customerRes.data) {
            customerId = customerRes.data._id || customerRes.data.id;
            finalCustomerName = customerRes.data.name;
            // Cache the new customer
            recentCustomersCache.current.set(phone, customerRes.data);
          }
        } catch (custErr) {
          console.error('Customer creation error:', custErr);
        }
      }

      const totalAmount = Number(calculateTotal());
      const invoiceData = {
        customer_id: customerId,
        branch_id: user?.branch_id,
        items: selectedServices.map(s => {
          const finalPrice = Number(s.editedPrice !== undefined ? s.editedPrice : s.price);
          return {
            service_id: s.service_id,
            quantity: s.quantity,
            price: finalPrice,
            subtotal: finalPrice * (s.quantity || 1),
          };
        }),
        payment_type: paymentMethod,
        total_amount: totalAmount,
        final_amount: totalAmount,
        is_walkin: isWalkin || !customerId,
        customer_name: finalCustomerName,
        customer_mobile: phone || null,
      };

      console.log('📋 Sending invoice data:', JSON.stringify(invoiceData, null, 2));

      const res = await invoicesAPI.create(invoiceData);
      console.log('✅ Invoice response:', JSON.stringify(res, null, 2));

      if (res.success) {
        Alert.alert(t('success'), t('billingSaved'), [
          { text: 'OK', onPress: resetForm }
        ]);
      } else {
        Alert.alert(t('error'), res.message || t('error'));
      }
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      let errorMessage = t('error');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(e => e.msg || e.message).join(', ');
      }
      Alert.alert(t('error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPhone('');
    setCustomerName('');
    setCustomer(null);
    setIsWalkin(false);
    setIsNewCustomer(false);
    setCustomerSearched(false);
    setSelectedServices([]);
    setPaymentMethod('CASH');
    setPhoneError('');
    setNameError('');
  };

  // ── Continue from step 1 ─────────────────────────────────────
  const handleContinueFromStep1 = () => {
    if (!isWalkin && !customer && phone.length > 0 && phone.length < 10) {
      setPhoneError('Enter valid 10-digit mobile number');
      return;
    }
    if (isNewCustomer && !customerName.trim()) {
      setNameError(t('nameRequired'));
      return;
    }
    setStep(2);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex1}>
            {/* ── Header ────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('newBilling')}</Text>
              <View style={styles.stepIndicator}>
                {[1, 2, 3].map(s => (
                  <View key={s} style={styles.stepRow}>
                    <View style={[
                      styles.stepCircle,
                      step >= s ? styles.stepCircleActive : styles.stepCircleInactive,
                    ]}>
                      {step > s ? (
                        <Check size={16} color="white" />
                      ) : (
                        <Text style={[
                          styles.stepText,
                          step >= s ? styles.stepTextActive : styles.stepTextInactive,
                        ]}>{s}</Text>
                      )}
                    </View>
                    {s < 3 && (
                      <View style={[
                        styles.stepLine,
                        step > s ? styles.stepLineActive : styles.stepLineInactive,
                      ]} />
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* ── Scrollable Content ────────────────────────── */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.flex1}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ─────────── STEP 1: CUSTOMER ─────────────── */}
              {step === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.sectionTitle}>{t('selectCustomer')}</Text>

                  {/* Search customer button */}
                  <TouchableOpacity
                    style={styles.customerCard}
                    onPress={() => setShowCustomerModal(true)}
                  >
                    <View style={styles.customerCardInner}>
                      <User size={24} color={COLORS.primary} />
                      <View style={styles.customerInfo}>
                        {customer ? (
                          <>
                            <View style={styles.customerBadgeRow}>
                              <UserCheck size={14} color={COLORS.success} />
                              <Text style={styles.existingBadge}>{t('existingCustomer')}</Text>
                            </View>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            <Text style={styles.customerPhone}>{customer.phone}</Text>
                          </>
                        ) : isNewCustomer && customerSearched ? (
                          <>
                            <View style={styles.customerBadgeRow}>
                              <UserPlus size={14} color={COLORS.warning} />
                              <Text style={styles.newBadge}>{t('newCustomer')}</Text>
                            </View>
                            <Text style={styles.customerPhone}>{phone}</Text>
                          </>
                        ) : (
                          <Text style={styles.customerPlaceholder}>{t('tapToSearch')}</Text>
                        )}
                      </View>
                      {customer && (
                        <TouchableOpacity onPress={() => { setCustomer(null); setPhone(''); setCustomerSearched(false); setIsNewCustomer(false); setCustomerName(''); }}>
                          <X size={20} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* New customer name input (visible when new) */}
                  {isNewCustomer && customerSearched && !isWalkin && (
                    <View style={styles.nameInputCard}>
                      <Text style={styles.nameInputLabel}>{t('enterName')}</Text>
                      <TextInput
                        style={[styles.nameInput, nameError ? styles.inputError : null]}
                        placeholder={t('enterName')}
                        placeholderTextColor={COLORS.gray[400]}
                        value={customerName}
                        onChangeText={(t) => { setCustomerName(t); setNameError(''); }}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      {nameError ? (
                        <View style={styles.errorRow}>
                          <AlertCircle size={12} color={COLORS.danger} />
                          <Text style={styles.errorText}>{nameError}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Walk-in toggle */}
                  <TouchableOpacity
                    style={[styles.walkinCard, isWalkin && styles.walkinCardActive]}
                    onPress={handleWalkin}
                  >
                    <View style={styles.walkinInner}>
                      <View style={[
                        styles.radio,
                        isWalkin ? styles.radioActive : styles.radioInactive,
                      ]}>
                        {isWalkin && <Check size={14} color="white" />}
                      </View>
                      <Text style={styles.walkinText}>{t('walkIn')}</Text>
                      <Text style={styles.walkinHint}>{t('walkInHint')}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Continue button */}
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={handleContinueFromStep1}
                  >
                    <Text style={styles.continueBtnText}>{t('continue')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ─────────── STEP 2: SERVICES ─────────────── */}
              {step === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('selectServices')}</Text>
                    <TouchableOpacity onPress={() => setStep(1)}>
                      <Text style={styles.backLink}>{t('back')}</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.servicesScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={styles.servicesCard}>
                      {services.map((service, index) => {
                        const selected = selectedServices.find(s => s.service_id === service.id);
                        return (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.serviceRow,
                              index !== services.length - 1 && styles.serviceRowBorder,
                            ]}
                            onPress={() => toggleService(service)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.serviceInfo}>
                              <Text style={styles.serviceName}>{service.name}</Text>
                              <Text style={styles.servicePrice}>{formatCurrency(service.price)}</Text>
                            </View>
                            <View style={[
                              styles.serviceCheck,
                              selected ? styles.serviceCheckActive : styles.serviceCheckInactive,
                            ]}>
                              {selected && <Check size={14} color="white" />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {selectedServices.length > 0 && (
                    <View style={styles.selectedSection}>
                      <Text style={styles.sectionTitle}>{t('selected')}</Text>
                      <ScrollView 
                        style={styles.selectedScrollView}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        scrollEnabled={true}
                      >
                        {selectedServices.map(s => {
                          const isEdited = s.editedPrice !== s.price;
                          return (
                            <TouchableOpacity 
                              key={s.service_id} 
                              activeOpacity={0.95}
                              style={[styles.selectedCard, isEdited && styles.selectedCardEdited]}
                            >
                              <View style={styles.selectedRow}>
                                <View style={styles.selectedInfo}>
                                  <Text style={styles.selectedName}>{s.name}</Text>
                                  {isEdited ? (
                                    <Text style={styles.originalPriceEdited}>Default: {formatCurrency(s.price)}</Text>
                                  ) : (
                                    <Text style={styles.originalPrice}>{formatCurrency(s.price)}</Text>
                                  )}
                                </View>
                                <View style={styles.actionButtons}>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(s.service_id, -1)}
                                    disabled={s.quantity <= 1}
                                  >
                                    <Minus size={14} color={s.quantity <= 1 ? COLORS.gray[300] : COLORS.gray[600]} />
                                  </TouchableOpacity>
                                  <Text style={styles.qtyText}>{s.quantity}</Text>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(s.service_id, 1)}
                                  >
                                    <Plus size={14} color={COLORS.gray[600]} />
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  style={styles.removeBtn}
                                  onPress={() => removeService(s.service_id)}
                                >
                                  <Trash2 size={16} color={COLORS.danger} />
                                </TouchableOpacity>
                              </View>
                              <View style={[styles.priceEditRow, isEdited && styles.priceEditRowEdited]}>
                                <Pencil size={14} color={isEdited ? COLORS.primary : COLORS.gray[400]} />
                                <View style={[styles.priceInputContainer, isEdited && styles.priceInputEdited]}>
                                  <Text style={[styles.rupeeSymbol, isEdited && styles.rupeeSymbolEdited]}>₹</Text>
                                  <TextInput
                                    style={[styles.priceInput, isEdited && styles.priceInputTextEdited]}
                                    value={s.priceInput}
                                    onChangeText={(text) => updatePrice(s.service_id, text)}
                                    onBlur={() => handlePriceBlur(s.service_id)}
                                    onFocus={() => {
                                      // Auto-scroll handled by keyboard avoiding view
                                    }}
                                    keyboardType="decimal-pad"
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    selectTextOnFocus
                                    maxLength={8}
                                    placeholder={String(s.price)}
                                    placeholderTextColor={COLORS.gray[400]}
                                  />
                                </View>
                                {isEdited && (
                                  <TouchableOpacity
                                    style={styles.resetPriceBtn}
                                    onPress={() => resetPrice(s.service_id)}
                                  >
                                    <RotateCcw size={14} color={COLORS.gray[500]} />
                                  </TouchableOpacity>
                                )}
                                <Text style={[styles.subtotalText, isEdited && styles.subtotalTextEdited]}>
                                  = {formatCurrency((s.editedPrice || s.price) * s.quantity)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <View style={styles.totalBar}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.continueBtn, selectedServices.length === 0 && styles.continueBtnDisabled]}
                    onPress={() => setStep(3)}
                    disabled={selectedServices.length === 0}
                  >
                    <Text style={styles.continueBtnText}>{t('continue')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ─────────── STEP 3: PAYMENT ──────────────── */}
              {step === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('payment')}</Text>
                    <TouchableOpacity onPress={() => setStep(2)}>
                      <Text style={styles.backLink}>{t('back')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Summary card */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('customer')}</Text>
                      <Text style={styles.summaryValue}>
                        {customer?.name || (isWalkin ? t('walkIn') : customerName || t('walkIn'))}
                      </Text>
                    </View>
                    {phone ? (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('mobile')}</Text>
                        <Text style={styles.summaryValue}>{phone}</Text>
                      </View>
                    ) : null}
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{t('services')}</Text>
                      <Text style={styles.summaryValue}>{selectedServices.length}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotalLabel}>{t('totalAmount')}</Text>
                      <Text style={styles.summaryTotalValue}>{formatCurrency(calculateTotal())}</Text>
                    </View>
                  </View>

                  {/* Payment method */}
                  <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t('paymentMode')}</Text>
                  <View style={styles.paymentMethodRow}>
                    {PAYMENT_METHODS.map(method => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      const methodLabel = method.id === 'CASH' ? t('cash') : t('upi');
                      const activeColor = method.id === 'CASH' ? '#28a745' : '#007bff';
                      const activeBg = method.id === 'CASH' ? '#e6f9ed' : '#e6f0ff';
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodCard,
                            isSelected && { borderColor: activeColor, backgroundColor: activeBg },
                          ]}
                          onPress={() => setPaymentMethod(method.id)}
                        >
                          <Icon size={24} color={isSelected ? activeColor : COLORS.gray[400]} />
                          <Text style={[
                            styles.paymentMethodLabel,
                            isSelected && { color: activeColor },
                          ]}>{methodLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View style={styles.submitBtnInner}>
                        <Receipt size={20} color="white" />
                        <Text style={styles.submitBtnText}>{t('createInvoiceBtn')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Customer Search Modal ──────────────────────── */}
        <Modal 
          visible={showCustomerModal} 
          transparent 
          animationType="slide" 
          statusBarTranslucent
          onRequestClose={() => setShowCustomerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => {
                Keyboard.dismiss();
                setShowCustomerModal(false);
              }}
            />
            <KeyboardAvoidingView
              behavior="padding"
              keyboardVerticalOffset={0}
              style={styles.modalKAV}
            >
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{t('searchCustomer')}</Text>

                  {/* Phone input */}
                  <View style={styles.modalInputRow}>
                    <Search size={20} color={COLORS.gray[400]} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder={t('enterMobile')}
                      keyboardType="number-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={handlePhoneChange}
                      returnKeyType="done"
                      onSubmitEditing={searchCustomer}
                      autoFocus
                    />
                    {customerSearchLoading && (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    )}
                  </View>
                  {phoneError ? (
                    <View style={styles.errorRow}>
                      <AlertCircle size={12} color={COLORS.danger} />
                      <Text style={styles.errorText}>{phoneError}</Text>
                    </View>
                  ) : null}

                  {/* Search result */}
                  {customerSearched && !customerSearchLoading && (
                    <View style={styles.searchResultCard}>
                      {customer ? (
                        <View style={styles.searchResultInner}>
                          <UserCheck size={20} color={COLORS.success} />
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultBadge}>{t('existingCustomer')}</Text>
                            <Text style={styles.searchResultName}>{customer.name}</Text>
                            <Text style={styles.searchResultPhone}>{customer.phone}</Text>
                          </View>
                        </View>
                      ) : (
                        <View>
                          <View style={styles.searchResultInner}>
                            <UserPlus size={20} color={COLORS.warning} />
                            <View style={styles.searchResultInfo}>
                              <Text style={styles.searchResultNewBadge}>{t('newCustomer')}</Text>
                              <Text style={styles.searchResultHint}>{t('enterName')}</Text>
                            </View>
                          </View>
                          <TextInput
                            style={[styles.modalNameInput, nameError ? styles.inputError : null]}
                            placeholder={t('enterName')}
                            placeholderTextColor={COLORS.gray[400]}
                            value={customerName}
                            onChangeText={(t) => { setCustomerName(t); setNameError(''); }}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                          {nameError ? (
                            <View style={styles.errorRow}>
                              <AlertCircle size={12} color={COLORS.danger} />
                              <Text style={styles.errorText}>{nameError}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Modal buttons */}
                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setShowCustomerModal(false)}
                    >
                      <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalWalkinBtn}
                      onPress={handleWalkin}
                    >
                      <Text style={styles.modalWalkinText}>{t('walkIn')}</Text>
                    </TouchableOpacity>

                    {customerSearched && (
                      <TouchableOpacity
                        style={styles.modalConfirmBtn}
                        onPress={() => {
                          if (isNewCustomer && !customerName.trim()) {
                            setNameError(t('nameRequired'));
                            return;
                          }
                          setIsWalkin(false);
                          setShowCustomerModal(false);
                        }}
                      >
                        <Text style={styles.modalConfirmText}>{t('confirm')}</Text>
                      </TouchableOpacity>
                    )}

                    {!customerSearched && (
                      <TouchableOpacity
                        style={styles.modalSearchBtn}
                        onPress={searchCustomer}
                        disabled={customerSearchLoading}
                      >
                        {customerSearchLoading ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.modalSearchText}>{t('searchCustomer')}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.gray[50] },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.gray[900] },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleInactive: { backgroundColor: COLORS.gray[200] },
  stepText: { fontWeight: '600' },
  stepTextActive: { color: '#fff' },
  stepTextInactive: { color: COLORS.gray[500] },
  stepLine: { width: 48, height: 4, marginHorizontal: 4, borderRadius: 2 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepLineInactive: { backgroundColor: COLORS.gray[200] },

  // Scroll
  scrollContent: { paddingBottom: 140 },

  // Step container
  stepContainer: { paddingHorizontal: 20, paddingVertical: 24, flex: 1 },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray[900], marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backLink: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },

  // Customer card
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  customerCardInner: { flexDirection: 'row', alignItems: 'center' },
  customerInfo: { marginLeft: 16, flex: 1 },
  customerBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  existingBadge: { fontSize: 11, fontWeight: '600', color: COLORS.success, marginLeft: 4, textTransform: 'uppercase' },
  newBadge: { fontSize: 11, fontWeight: '600', color: COLORS.warning, marginLeft: 4, textTransform: 'uppercase' },
  customerName: { fontSize: 16, fontWeight: '600', color: COLORS.gray[900] },
  customerPhone: { fontSize: 14, color: COLORS.gray[500], marginTop: 2 },
  customerPlaceholder: { color: COLORS.gray[400], fontSize: 15 },

  // Name input
  nameInputCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  nameInputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.warning, marginBottom: 8 },
  nameInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },

  // Walk-in
  walkinCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  walkinCardActive: { borderColor: COLORS.primary, backgroundColor: '#f0f9ff' },
  walkinInner: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  radioInactive: { borderColor: COLORS.gray[300] },
  walkinText: { marginLeft: 12, fontWeight: '600', color: COLORS.gray[900], fontSize: 15 },
  walkinHint: { marginLeft: 6, color: COLORS.gray[400], fontSize: 13 },

  // Continue / Submit buttons
  continueBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  continueBtnDisabled: { backgroundColor: COLORS.gray[300] },
  continueBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginTop:20,
  },
  submitBtnDisabled: { backgroundColor: COLORS.gray[400] },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 },

  // Services list - IMPROVED FOR VISIBILITY
  servicesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  servicesScrollView: {
    maxHeight: 280,
  },
  serviceRow: { 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    minHeight: 64,
  },
  serviceRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontWeight: '600', color: COLORS.gray[900], fontSize: 17 },
  servicePrice: { fontSize: 18, fontWeight: '700', color: COLORS.gray[800], marginTop: 4 },
  serviceCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceCheckActive: { backgroundColor: COLORS.success },
  serviceCheckInactive: { backgroundColor: COLORS.gray[200] },

  // Selected services - IMPROVED VISIBILITY
  selectedSection: { marginTop: 24 },
  selectedScrollView: { 
    maxHeight: 350,
  },
  selectedCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.success,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCardEdited: { borderColor: COLORS.primary, backgroundColor: '#f0f9ff' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  selectedInfo: { flex: 1, marginRight: 8 },
  selectedName: { fontWeight: '700', color: COLORS.gray[900], fontSize: 17 },
  originalPrice: { fontSize: 14, color: COLORS.gray[400], marginTop: 4 },
  originalPriceEdited: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { marginHorizontal: 12, fontWeight: '700', color: COLORS.gray[900], minWidth: 28, textAlign: 'center', fontSize: 18 },
  removeBtn: { marginLeft: 8, padding: 8 },

  // Price edit row - IMPROVED VISIBILITY
  priceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  priceEditRowEdited: { backgroundColor: '#f0f9ff', borderWidth: 2, borderColor: COLORS.primary },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 100,
  },
  priceInputEdited: { borderColor: COLORS.primary },
  rupeeSymbol: { fontSize: 18, fontWeight: '700', color: COLORS.gray[600], marginRight: 4 },
  rupeeSymbolEdited: { color: COLORS.primary },
  priceInput: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900], paddingVertical: 4, minWidth: 60 },
  priceInputTextEdited: { color: COLORS.primary },
  resetPriceBtn: { marginLeft: 4, padding: 6 },
  subtotalText: { fontSize: 16, fontWeight: '700', color: COLORS.gray[600], marginLeft: 'auto' },
  subtotalTextEdited: { color: COLORS.primary, fontWeight: '800' },

  // Total bar - BIG & BOLD
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  totalLabel: { fontSize: 20, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 28, fontWeight: '900', color: '#fff' },

  // Summary card (Step 3) - IMPROVED
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' },
  summaryLabel: { color: COLORS.gray[500], fontSize: 16 },
  summaryValue: { fontWeight: '600', color: COLORS.gray[900], fontSize: 16 },
  summaryDivider: { borderTopWidth: 2, borderTopColor: COLORS.gray[200], marginVertical: 8 },
  summaryTotalLabel: { fontSize: 20, fontWeight: '800', color: COLORS.gray[900] },
  summaryTotalValue: { fontSize: 24, fontWeight: '900', color: COLORS.success },

  // Payment method
  paymentMethodRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  paymentMethodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    backgroundColor: '#fff',
  },
  paymentMethodCardActive: { borderColor: COLORS.primary, backgroundColor: '#f0f9ff' },
  paymentMethodLabel: { marginTop: 8, fontWeight: '600', color: COLORS.gray[500], fontSize: 14 },
  paymentMethodLabelActive: { color: COLORS.primary },

  // Error
  inputError: { borderColor: COLORS.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  errorText: { color: COLORS.danger, fontSize: 12, marginLeft: 4 },

  // Modal - FIXED to cover entire screen and push up with keyboard
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalKAV: { 
    width: '100%', 
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900], marginBottom: 16 },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  modalInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: COLORS.gray[900] },

  // Search result in modal
  searchResultCard: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchResultInner: { flexDirection: 'row', alignItems: 'center' },
  searchResultInfo: { marginLeft: 12, flex: 1 },
  searchResultBadge: { fontSize: 11, fontWeight: '700', color: COLORS.success, textTransform: 'uppercase', marginBottom: 2 },
  searchResultNewBadge: { fontSize: 11, fontWeight: '700', color: COLORS.warning, textTransform: 'uppercase', marginBottom: 2 },
  searchResultName: { fontSize: 16, fontWeight: '600', color: COLORS.gray[900] },
  searchResultPhone: { fontSize: 14, color: COLORS.gray[500], marginTop: 2 },
  searchResultHint: { fontSize: 13, color: COLORS.gray[500] },
  modalNameInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginTop: 10,
  },

  // Modal buttons - FIXED with proper centering and red cancel
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#fef2f2', 
    borderWidth: 1, 
    borderColor: '#fecaca',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', color: '#dc2626', textAlign: 'center' },
  modalWalkinBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fffbeb', 
    borderWidth: 1, 
    borderColor: '#fde68a' 
  },
  modalWalkinText: { fontWeight: '600', color: COLORS.warning, textAlign: 'center' },
  modalSearchBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary 
  },
  modalSearchText: { fontWeight: '600', color: '#fff', textAlign: 'center' },
  modalConfirmBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.success 
  },
  modalConfirmText: { fontWeight: '600', color: '#fff', textAlign: 'center' },
});
