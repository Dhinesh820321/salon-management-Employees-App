import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved) {
        setLanguage(saved);
        i18n.changeLanguage(saved);
      }
    } catch (e) {
      console.log('Error loading language:', e);
    }
  };

  const changeLanguage = async (lang) => {
    try {
      setLanguage(lang);
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem('appLanguage', lang);
    } catch (e) {
      console.log('Error changing language:', e);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
