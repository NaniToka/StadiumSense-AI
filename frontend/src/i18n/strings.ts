/**
 * UI string translations for the Fan Companion.
 *
 * Keys are kept flat and descriptive. All 5 supported locales must have
 * every key — TypeScript enforces this via the Strings type.
 */

export type Locale = 'en' | 'es' | 'ar' | 'hi' | 'pt'

export interface Strings {
  appName: string
  tagline: string
  placeholder: string
  send: string
  clearChat: string
  accessibility: string
  language: string
  crowdWidget: string
  crowdLoading: string
  crowdError: string
  welcomeTitle: string
  welcomeBody: string
  chip_exit: string
  chip_food: string
  chip_accessible: string
  chip_transit: string
  thinking: string
  youLabel: string
  assistantLabel: string
  zoneNormal: string
  zoneCrowded: string
  zoneCritical: string
  largertextLabel: string
  highContrastLabel: string
  a11yPanelTitle: string
  closePanel: string
  liveLabel: string
}

const translations: Record<Locale, Strings> = {
  en: {
    appName: 'Fan Companion',
    tagline: 'Your AI guide for FIFA World Cup 2026',
    placeholder: 'Ask me anything about the stadium…',
    send: 'Send',
    clearChat: 'Clear chat',
    accessibility: 'Accessibility',
    language: 'Language',
    crowdWidget: 'Live Crowd Status',
    crowdLoading: 'Loading crowd data…',
    crowdError: 'Crowd data unavailable',
    welcomeTitle: 'Welcome to StadiumSense',
    welcomeBody: 'Ask about directions, crowd levels, transport, or accessibility.',
    chip_exit: 'Find nearest exit',
    chip_food: 'Least crowded food court',
    chip_accessible: 'Accessible route to my seat',
    chip_transit: 'Nearest transit',
    thinking: 'Thinking…',
    youLabel: 'You',
    assistantLabel: 'StadiumSense AI',
    zoneNormal: 'Clear',
    zoneCrowded: 'Busy',
    zoneCritical: 'Packed',
    largertextLabel: 'Larger text',
    highContrastLabel: 'High contrast',
    a11yPanelTitle: 'Accessibility options',
    closePanel: 'Close panel',
    liveLabel: 'LIVE',
  },
  es: {
    appName: 'Fan Companion',
    tagline: 'Tu guía de IA para la Copa del Mundo FIFA 2026',
    placeholder: 'Pregúntame cualquier cosa sobre el estadio…',
    send: 'Enviar',
    clearChat: 'Borrar chat',
    accessibility: 'Accesibilidad',
    language: 'Idioma',
    crowdWidget: 'Estado del estadio en vivo',
    crowdLoading: 'Cargando datos…',
    crowdError: 'Datos no disponibles',
    welcomeTitle: 'Bienvenido a StadiumSense',
    welcomeBody: 'Pregunta sobre direcciones, multitudes, transporte o accesibilidad.',
    chip_exit: 'Salida más cercana',
    chip_food: 'Zona de comida menos concurrida',
    chip_accessible: 'Ruta accesible a mi asiento',
    chip_transit: 'Transporte más cercano',
    thinking: 'Pensando…',
    youLabel: 'Tú',
    assistantLabel: 'StadiumSense IA',
    zoneNormal: 'Libre',
    zoneCrowded: 'Ocupado',
    zoneCritical: 'Lleno',
    largertextLabel: 'Texto más grande',
    highContrastLabel: 'Alto contraste',
    a11yPanelTitle: 'Opciones de accesibilidad',
    closePanel: 'Cerrar',
    liveLabel: 'EN VIVO',
  },
  ar: {
    appName: 'رفيق المشجع',
    tagline: 'دليلك الذكي لكأس العالم FIFA 2026',
    placeholder: 'اسألني أي شيء عن الملعب…',
    send: 'إرسال',
    clearChat: 'مسح المحادثة',
    accessibility: 'إمكانية الوصول',
    language: 'اللغة',
    crowdWidget: 'حالة الحشود المباشرة',
    crowdLoading: 'جارٍ التحميل…',
    crowdError: 'البيانات غير متاحة',
    welcomeTitle: 'مرحبًا بك في StadiumSense',
    welcomeBody: 'اسأل عن الاتجاهات أو الحشود أو وسائل النقل أو إمكانية الوصول.',
    chip_exit: 'أقرب مخرج',
    chip_food: 'أهدأ منطقة طعام',
    chip_accessible: 'مسار مناسب لمقعدي',
    chip_transit: 'أقرب وسيلة نقل',
    thinking: 'جارٍ التفكير…',
    youLabel: 'أنت',
    assistantLabel: 'StadiumSense AI',
    zoneNormal: 'هادئ',
    zoneCrowded: 'مزدحم',
    zoneCritical: 'ممتلئ',
    largertextLabel: 'نص أكبر',
    highContrastLabel: 'تباين عالٍ',
    a11yPanelTitle: 'خيارات إمكانية الوصول',
    closePanel: 'إغلاق',
    liveLabel: 'مباشر',
  },
  hi: {
    appName: 'फैन साथी',
    tagline: 'FIFA विश्व कप 2026 के लिए आपका AI गाइड',
    placeholder: 'स्टेडियम के बारे में कुछ भी पूछें…',
    send: 'भेजें',
    clearChat: 'चैट साफ करें',
    accessibility: 'सुगम्यता',
    language: 'भाषा',
    crowdWidget: 'लाइव भीड़ की स्थिति',
    crowdLoading: 'डेटा लोड हो रहा है…',
    crowdError: 'डेटा उपलब्ध नहीं',
    welcomeTitle: 'StadiumSense में आपका स्वागत है',
    welcomeBody: 'दिशा, भीड़, परिवहन या सुगम्यता के बारे में पूछें।',
    chip_exit: 'निकटतम निकास खोजें',
    chip_food: 'कम भीड़ वाला फूड कोर्ट',
    chip_accessible: 'मेरी सीट तक सुगम मार्ग',
    chip_transit: 'निकटतम परिवहन',
    thinking: 'सोच रहा हूँ…',
    youLabel: 'आप',
    assistantLabel: 'StadiumSense AI',
    zoneNormal: 'खाली',
    zoneCrowded: 'व्यस्त',
    zoneCritical: 'भरा हुआ',
    largertextLabel: 'बड़ा पाठ',
    highContrastLabel: 'उच्च कंट्रास्ट',
    a11yPanelTitle: 'सुगम्यता विकल्प',
    closePanel: 'बंद करें',
    liveLabel: 'लाइव',
  },
  pt: {
    appName: 'Companheiro do Torcedor',
    tagline: 'Seu guia de IA para a Copa do Mundo FIFA 2026',
    placeholder: 'Pergunte qualquer coisa sobre o estádio…',
    send: 'Enviar',
    clearChat: 'Limpar conversa',
    accessibility: 'Acessibilidade',
    language: 'Idioma',
    crowdWidget: 'Status ao vivo da multidão',
    crowdLoading: 'Carregando dados…',
    crowdError: 'Dados indisponíveis',
    welcomeTitle: 'Bem-vindo ao StadiumSense',
    welcomeBody: 'Pergunte sobre direções, multidões, transporte ou acessibilidade.',
    chip_exit: 'Saída mais próxima',
    chip_food: 'Praça de alimentação menos lotada',
    chip_accessible: 'Rota acessível para meu assento',
    chip_transit: 'Transporte mais próximo',
    thinking: 'Pensando…',
    youLabel: 'Você',
    assistantLabel: 'StadiumSense IA',
    zoneNormal: 'Livre',
    zoneCrowded: 'Movimentado',
    zoneCritical: 'Lotado',
    largertextLabel: 'Texto maior',
    highContrastLabel: 'Alto contraste',
    a11yPanelTitle: 'Opções de acessibilidade',
    closePanel: 'Fechar',
    liveLabel: 'AO VIVO',
  },
}

export default translations

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  hi: 'हिन्दी',
  pt: 'Português',
}

/** Map our Locale codes to BCP-47 tags for the backend */
export const LOCALE_TO_BCP47: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  ar: 'ar',
  hi: 'hi',
  pt: 'pt-BR',
}

/** RTL locales — used to set dir="rtl" on the chat container */
export const RTL_LOCALES = new Set<Locale>(['ar'])
