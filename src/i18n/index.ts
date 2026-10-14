import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import translationEs from './locales/es.json'
import translationEn from './locales/en.json'

const defaultLanguage = localStorage.getItem('i18nextLng') || 'es'

const resources = {
  es: { translation: translationEs },
  en: { translation: translationEn },
}

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
