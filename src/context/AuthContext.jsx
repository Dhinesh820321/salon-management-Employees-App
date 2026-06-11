import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      
      if (token) {
        // Try to get fresh profile from server
        try {
          const res = await authAPI.getProfile();
          if (res.success) {
            setUser(res.data);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data));
            if (res.data.branchData) {
              await AsyncStorage.setItem('branchData', JSON.stringify(res.data.branchData));
            } else {
              await AsyncStorage.removeItem('branchData');
            }
          } else if (storedUser) {
            // Use cached user if profile fetch fails
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            if (parsed.branchData) {
              await AsyncStorage.setItem('branchData', JSON.stringify(parsed.branchData));
            }
          } else {
            await clearAuth();
          }
        } catch (profileError) {
          // If 401 (token expired/invalid), force re-login
          if (profileError.response?.status === 401) {
            console.log('Token expired/invalid, clearing auth...');
            await clearAuth();
            setUser(null);
          } else if (storedUser) {
            // Use cached user only if truly offline (network error)
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            if (parsed.branchData) {
              await AsyncStorage.setItem('branchData', JSON.stringify(parsed.branchData));
            }
          }
        }
      } else {
        // No token - must login again
        await clearAuth();
      }
    } catch (error) {
      console.error('Auth init error:', error);
      await clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password, latitude, longitude) => {
    try {
      const res = await authAPI.login({ phone, password, latitude, longitude });
      if (res.success) {
        await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        if (res.data.user?.branchData) {
          await AsyncStorage.setItem('branchData', JSON.stringify(res.data.user.branchData));
        } else {
          await AsyncStorage.removeItem('branchData');
        }
        setUser(res.data.user);
      }
      return res;
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    await clearAuth();
    setUser(null);
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem('branchData');
  };

  const updateUser = useCallback(async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    if (updatedUser?.branchData) {
      await AsyncStorage.setItem('branchData', JSON.stringify(updatedUser.branchData));
    } else {
      await AsyncStorage.removeItem('branchData');
    }
  }, []);

  const contextValue = useMemo(() => ({
    user, 
    loading, 
    login, 
    logout, 
    updateUser,
    isAuthenticated: !!user 
  }), [user, loading, login, logout, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
