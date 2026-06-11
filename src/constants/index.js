// Environment-based API configuration for EmployeesApp

// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================

// Local development - use your computer's IP address
// To find IP on Windows: ipconfig (look for IPv4 Address)
const LOCAL_IP = '192.168.1.100'; // CHANGE THIS to your local IP
const LOCAL_PORT = '5000';

// Production - your deployed backend URL
const PRODUCTION_URL = 'https://salon-management-backend-4tb9.onrender.com/api';

// ============================================
// MODE SELECTION
// ============================================

// Set to 'development' for local backend, 'production' for live server
const APP_MODE = 'production'; // Changed from 'production' to 'development'

// ============================================
// AUTO-DETECTION (Do not change below)
// ============================================

// Determine base URL based on mode
const getBaseURL = () => {
  if (APP_MODE === 'development') {
    return `http://${LOCAL_IP}:${LOCAL_PORT}/api`;
  }
  return PRODUCTION_URL;
};


// Export URLs
export const API_URL = getBaseURL();
export const BASE_URL = APP_MODE === 'development' 
  ? `http://${LOCAL_IP}:${LOCAL_PORT}` 
  : 'https://salon-management-backend-4tb9.onrender.com';

export const DEFAULT_TIMEOUT = 15000;

export const STORAGE_KEYS = {
  TOKEN: '@auth_token',
  USER: '@auth_user',
  SETTINGS: '@app_settings',
};

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
};

export const ATTENDANCE_STATUS = {
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  ACTIVE: 'ACTIVE',
};

// Debug logging
if (__DEV__) {
  console.log('🔧 API Config:');
  console.log(`   Mode: ${APP_MODE}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API URL: ${API_URL}`);
}