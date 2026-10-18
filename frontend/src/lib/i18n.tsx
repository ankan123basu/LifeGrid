"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type SupportedLanguage = "en" | "hi" | "pa" | "bn" | "ta";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "bn", label: "Bengali", native: "বাংলা", flag: "🇮🇳" },
  { code: "ta", label: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navbar
    nav_brand_subtitle: "Emergency Blood Network",
    nav_find_blood: "Find Blood",
    nav_donate: "Donate",
    nav_check_eligibility: "Check Eligibility",
    nav_eligibility_sub: "1-min clinical pre-screening",
    nav_register_donor: "Register as Donor",
    nav_donor_sub: "Join voluntary lifesaver registry",
    nav_hospitals: "Hospitals",
    nav_how_it_works: "How It Works",
    nav_sign_in: "Sign in",
    nav_request_blood: "Request blood",
    nav_notifications: "Notifications",
    nav_emergency_call: "Emergency? Call 112",

    // Hero
    hero_badge: "Live emergency blood network across {cities} cities",
    hero_title_1: "Find blood fast.",
    hero_title_2: "Save a life.",
    hero_desc: "Find nearby blood availability instantly and get matched with nearby donors across partner hospital blood banks.",

    // Search Card
    search_card_step1: "1. SELECT BLOOD GROUP NEEDED:",
    search_card_step2: "2. LOCATION OR HOSPITAL:",
    search_placeholder: "Enter your city or hospital",
    search_use_location: "Use Location",
    search_detecting: "Detecting...",
    search_urgency_immediate: "Immediate (<1h)",
    search_urgency_scheduled: "Scheduled Surgery",
    search_btn_find: "Find blood now",

    // Stats
    stat_units_stock: "Units in Stock",
    stat_partner_banks: "Partner Blood Banks",
    stat_donations: "Donations Coordinated",

    // Footer
    footer_tagline: "India's real-time emergency blood network connecting voluntary lifesavers, partner hospital blood banks, and critical patients in real-time.",
    footer_emergency_title: "National Emergency Service",
    footer_support_desk: "Contact Support Desk",
    footer_data_notice: "Data Protection Notice",
    footer_copyright: "LifeGrid Emergency Resource Network. All rights reserved.",

    // Chatbot
    chat_title: "LifeGrid Assistant",
    chat_support: "24/7 Support • Emergency? Call 112",
    chat_critical_banner: "Critical emergency?",
    chat_dial: "Dial 112",
    chat_welcome: "Hi! I'm LifeGrid's emergency care assistant. How can I help you find blood, locate a partner hospital, or check donor eligibility today?",
    chat_placeholder: "Ask a question...",
    chat_quick_1: "Where is O- blood available?",
    chat_quick_2: "Am I eligible to donate?",
    chat_quick_3: "How fast is dispatch?",
  },

  hi: {
    // Navbar
    nav_brand_subtitle: "आपातकालीन रक्त नेटवर्क",
    nav_find_blood: "रक्त खोजें",
    nav_donate: "रक्तदान",
    nav_check_eligibility: "पात्रता जांचें",
    nav_eligibility_sub: "1 मिनट में क्लिनिकल प्री-स्क्रीनिंग",
    nav_register_donor: "दाता के रूप में पंजीकरण करें",
    nav_donor_sub: "स्वैच्छिक जीवनरक्षक नेटवर्क से जुड़ें",
    nav_hospitals: "अस्पताल",
    nav_how_it_works: "यह कैसे काम करता है",
    nav_sign_in: "साइन इन",
    nav_request_blood: "रक्त का अनुरोध करें",
    nav_notifications: "सूचनाएं",
    nav_emergency_call: "आपातकाल? डायल 112",

    // Hero
    hero_badge: "{cities} शहरों में लाइव आपातकालीन रक्त नेटवर्क",
    hero_title_1: "तेज़ी से रक्त खोजें।",
    hero_title_2: "जीवन बचाएं।",
    hero_desc: "आस-पास रक्त उपलब्धता तुरंत देखें और पार्टनर अस्पताल ब्लड बैंकों में निकटतम रक्तदाताओं से तुरंत जुड़ें।",

    // Search Card
    search_card_step1: "1. आवश्यक रक्त समूह चुनें:",
    search_card_step2: "2. स्थान या अस्पताल दर्ज करें:",
    search_placeholder: "अपना शहर या अस्पताल दर्ज करें",
    search_use_location: "वर्तमान स्थान",
    search_detecting: "स्थान खोज रहे हैं...",
    search_urgency_immediate: "अति आवश्यक (<1 घंटा)",
    search_urgency_scheduled: "नियोजित सर्जरी",
    search_btn_find: "तुरंत रक्त खोजें",

    // Stats
    stat_units_stock: "उपलब्ध रक्त यूनिट",
    stat_partner_banks: "पार्टनर ब्लड बैंक",
    stat_donations: "सफल रक्तदान",

    // Footer
    footer_tagline: "भारत का रियल-टाइम आपातकालीन रक्त नेटवर्क जो स्वैच्छिक रक्तदाताओं, अस्पताल ब्लड बैंकों और गंभीर मरीजों को तुरंत जोड़ता है।",
    footer_emergency_title: "राष्ट्रीय आपातकालीन सेवा",
    footer_support_desk: "सपोर्ट डेस्क से संपर्क करें",
    footer_data_notice: "डेटा संरक्षण सूचना",
    footer_copyright: "LifeGrid इमरजेंसी नेटवर्क। सर्वाधिकार सुरक्षित।",

    // Chatbot
    chat_title: "LifeGrid सहायक",
    chat_support: "24/7 सहायता • आपातकाल? डायल 112",
    chat_critical_banner: "गंभीर आपातकाल?",
    chat_dial: "डायल 112",
    chat_welcome: "नमस्ते! मैं LifeGrid का आपातकालीन स्वास्थ्य सहायक हूँ। रक्त खोजने, अस्पताल ढूँढने या पात्रता जाँचने में मैं कैसे मदद कर सकता हूँ?",
    chat_placeholder: "सवाल पूछें...",
    chat_quick_1: "O- रक्त कहाँ उपलब्ध है?",
    chat_quick_2: "क्या मैं रक्तदान के योग्य हूँ?",
    chat_quick_3: "रक्त कितनी तेज़ी से पहुँचेगा?",
  },

  pa: {
    // Navbar
    nav_brand_subtitle: "ਐਮਰਜੈਂਸੀ ਬਲੱਡ ਨੈੱਟਵਰਕ",
    nav_find_blood: "ਖੂਨ ਲੱਭੋ",
    nav_donate: "ਖੂਨਦਾਨ",
    nav_check_eligibility: "ਯੋਗਤਾ ਜਾਂਚੋ",
    nav_eligibility_sub: "1 ਮਿੰਟ ਦੀ ਕਲੀਨਿਕਲ ਪ੍ਰੀ-ਸਕ੍ਰੀਨਿੰਗ",
    nav_register_donor: "ਖੂਨਦਾਨੀ ਬਣੋ",
    nav_donor_sub: "ਸਵੈ-ਇੱਛੁਕ ਜੀਵਨ-ਰੱਖਿਅਕ ਨੈੱਟਵਰਕ ਨਾਲ ਜੁੜੋ",
    nav_hospitals: "ਹਸਪਤਾਲ",
    nav_how_it_works: "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
    nav_sign_in: "ਸਾਈਨ ਇਨ",
    nav_request_blood: "ਖੂਨ ਦੀ ਮੰਗ ਕਰੋ",
    nav_notifications: "ਸੂਚਨਾਵਾਂ",
    nav_emergency_call: "ਐਮਰਜੈਂਸੀ? ਕਾਲ 112",

    // Hero
    hero_badge: "{cities} ਸ਼ਹਿਰਾਂ ਵਿੱਚ ਲਾਈਵ ਐਮਰਜੈਂਸੀ ਬਲੱਡ ਨੈੱਟਵਰਕ",
    hero_title_1: "ਤੇਜ਼ੀ ਨਾਲ ਖੂਨ ਲੱਭੋ।",
    hero_title_2: "ਜ਼ਿੰਦਗੀ ਬਚਾਓ।",
    hero_desc: "ਨੇੜਲੇ ਖੂਨ ਦੀ ਉਪਲਬਧਤਾ ਤੁਰੰਤ ਦੇਖੋ ਅਤੇ ਪਾਰਟਨਰ ਹਸਪਤਾਲਾਂ ਦੇ ਬਲੱਡ ਬੈਂਕਾਂ ਰਾਹੀਂ ਦਾਨੀਆਂ ਨਾਲ ਤੁਰੰਤ ਜੁੜੋ।",

    // Search Card
    search_card_step1: "1. ਲੋੜੀਂਦਾ ਬਲੱਡ ਗਰੁੱਪ ਚੁਣੋ:",
    search_card_step2: "2. ਸ਼ਹਿਰ ਜਾਂ ਹਸਪਤਾਲ ਦਾ ਨਾਮ:",
    search_placeholder: "ਆਪਣਾ ਸ਼ਹਿਰ ਜਾਂ ਹਸਪਤਾਲ ਲਿਖੋ",
    search_use_location: "ਮੌਜੂਦਾ ਸਥਾਨ",
    search_detecting: "ਸਥਾਨ ਲੱਭ ਰਿਹਾ ਹੈ...",
    search_urgency_immediate: "ਤੁਰੰਤ ਐਮਰਜੈਂਸੀ (<1 ਘੰਟਾ)",
    search_urgency_scheduled: "ਨਿਰਧਾਰਿਤ ਸਰਜਰੀ",
    search_btn_find: "ਹੁਣੇ ਖੂਨ ਲੱਭੋ",

    // Stats
    stat_units_stock: "ਸਟਾਕ ਵਿੱਚ ਉਪਲਬਧ ਯੂਨਿਟ",
    stat_partner_banks: "ਪਾਰਟਨਰ ਬਲੱਡ ਬੈਂਕ",
    stat_donations: "ਕੀਤੇ ਗਏ ਖੂਨਦਾਨ",

    // Footer
    footer_tagline: "ਭਾਰਤ ਦਾ ਰੀਅਲ-ਟਾਈਮ ਐਮਰਜੈਂਸੀ ਬਲੱਡ ਨੈੱਟਵਰਕ ਜੋ ਖੂਨਦਾਨੀਆਂ, ਹਸਪਤਾਲਾਂ ਅਤੇ ਮਰੀਜ਼ਾਂ ਨੂੰ ਤੁਰੰਤ ਜੋੜਦਾ ਹੈ।",
    footer_emergency_title: "ਰਾਸ਼ਟਰੀ ਐਮਰਜੈਂਸੀ ਸੇਵਾ",
    footer_support_desk: "ਸਹਾਇਤਾ ਡੈਸਕ ਨਾਲ ਸੰਪਰਕ ਕਰੋ",
    footer_data_notice: "ਡੇਟਾ ਸੁਰੱਖਿਆ ਸੂਚਨਾ",
    footer_copyright: "LifeGrid ਐਮਰਜੈਂਸੀ ਰਿਸੋਰਸ ਨੈੱਟਵਰਕ। ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ।",

    // Chatbot
    chat_title: "LifeGrid ਸਹਾਇਕ",
    chat_support: "24/7 ਸਹਾਇਤਾ • ਐਮਰਜੈਂਸੀ? ਕਾਲ 112",
    chat_critical_banner: "ਗੰਭੀਰ ਐਮਰਜੈਂਸੀ?",
    chat_dial: "ਡਾਇਲ 112",
    chat_welcome: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ LifeGrid ਐਮਰਜੈਂਸੀ ਕੇਅਰ ਸਹਾਇਕ ਹਾਂ। ਖੂਨ ਲੱਭਣ, ਹਸਪਤਾਲ ਲੱਭਣ ਜਾਂ ਯੋਗਤਾ ਜਾਂਚਣ ਵਿੱਚ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    chat_placeholder: "ਸਵਾਲ ਪੁੱਛੋ...",
    chat_quick_1: "O- ਖੂਨ ਕਿੱਥੇ ਉਪਲਬਧ ਹੈ?",
    chat_quick_2: "ਕੀ ਮੈਂ ਖੂਨਦਾਨ ਕਰਨ ਦੇ ਯੋਗ ਹਾਂ?",
    chat_quick_3: "ਖੂਨ ਕਿੰਨੀ ਤੇਜ਼ੀ ਨਾਲ ਪਹੁੰਚੇਗਾ?",
  },

  bn: {
    // Navbar
    nav_brand_subtitle: "জরুরী ব্লাড নেটওয়ার্ক",
    nav_find_blood: "রক্ত খুঁজুন",
    nav_donate: "রক্তদান",
    nav_check_eligibility: "যোগ্যতা যাচাই",
    nav_eligibility_sub: "১ মিনিটে ক্লিনিকাল প্রি-স্ক্রিনিং",
    nav_register_donor: "রক্তদাতা হিসেবে যুক্ত হন",
    nav_donor_sub: "স্বেচ্ছাসেবী জীবনরক্ষক নেটওয়ার্কে যোগ দিন",
    nav_hospitals: "হাসপাতাল",
    nav_how_it_works: "কীভাবে কাজ করে",
    nav_sign_in: "সাইন ইন",
    nav_request_blood: "রক্তের অনুরোধ",
    nav_notifications: "বিজ্ঞপ্তি",
    nav_emergency_call: "জরুরী? কল করুন ১১২",

    // Hero
    hero_badge: "{cities}টি শহরে লাইভ জরুরী ব্লাড নেটওয়ার্ক",
    hero_title_1: "দ্রুত রক্ত খুঁজুন।",
    hero_title_2: "জীবন বাঁচান।",
    hero_desc: "কাছাকাছি রক্তের প্রাপ্যতা অবিলম্বে যাচাই করুন এবং পার্টনার হাসপাতালের রক্তদাতাদের সাথে দ্রুত সংযুক্ত হন।",

    // Search Card
    search_card_step1: "১. প্রয়োজনীয় রক্তের গ্রুপ নির্বাচন করুন:",
    search_card_step2: "২. অবস্থান বা হাসপাতালের নাম:",
    search_placeholder: "আপনার শহর বা হাসপাতালের নাম লিখুন",
    search_use_location: "বর্তমান অবস্থান",
    search_detecting: "অবস্থান খোঁজা হচ্ছে...",
    search_urgency_immediate: "তাৎক্ষণিক জরুরী (<১ ঘণ্টা)",
    search_urgency_scheduled: "নির্ধারিত সার্জারি",
    search_btn_find: "রক্ত অনুসন্ধান করুন",

    // Stats
    stat_units_stock: "মজুদ রক্তের ইউনিট",
    stat_partner_banks: "পার্টনার ব্লাড ব্যাংক",
    stat_donations: "সমন্বিত রক্তদান",

    // Footer
    footer_tagline: "ভারতের রিয়েল-টাইম জরুরী রক্তের নেটওয়ার্ক যা স্বেচ্ছাসেবী রক্তদাতা, হাসপাতাল ব্লাড ব্যাংক এবং রোগীদের অবিলম্বে সংযুক্ত করে।",
    footer_emergency_title: "জাতীয় জরুরী পরিষেবা",
    footer_support_desk: "সাপোর্ট ডেস্কে যোগাযোগ",
    footer_data_notice: "উপাত্ত সুরক্ষা বিজ্ঞপ্তি",
    footer_copyright: "LifeGrid ইমার্জেন্সি রিসোর্স নেটওয়ার্ক। সর্বস্বত্ব সংরক্ষিত।",

    // Chatbot
    chat_title: "LifeGrid সহায়ক",
    chat_support: "২৪/৭ সহায়তা • জরুরী? কল করুন ১১২",
    chat_critical_banner: "মারাত্মক জরুরী অবস্থা?",
    chat_dial: "ডায়াল ১১২",
    chat_welcome: "নমস্কার! আমি LifeGrid জরুরী স্বাস্থ্য সহায়ক। রক্ত খুঁজতে, হাসপাতাল চিহ্নিত করতে বা রক্তদানের যোগ্যতা যাচাইয়ে আপনাকে কীভাবে সাহায্য করতে পারি?",
    chat_placeholder: "প্রশ্ন জিজ্ঞাসা করুন...",
    chat_quick_1: "O- রক্ত কোথায় পাওয়া যাবে?",
    chat_quick_2: "আমি কি রক্ত দিতে পারব?",
    chat_quick_3: "রক্ত কত দ্রুত পৌঁছাবে?",
  },

  ta: {
    // Navbar
    nav_brand_subtitle: "அவசர இரத்த கட்டமைப்பு",
    nav_find_blood: "இரத்தம் தேடுங்கள்",
    nav_donate: "இரத்த தானம்",
    nav_check_eligibility: "தகுதியை சோதிக்கவும்",
    nav_eligibility_sub: "1 நிமிட மருத்துவ முன் பரிசோதனை",
    nav_register_donor: "கொடையாளராக பதிவு செய்க",
    nav_donor_sub: "தன்னார்வ உயிர்காக்கும் அமைப்பில் இணையுங்கள்",
    nav_hospitals: "மருத்துவமனைகள்",
    nav_how_it_works: "எவ்வாறு செயல்படுகிறது",
    nav_sign_in: "உள்நுழைய",
    nav_request_blood: "இரத்தம் கோரவும்",
    nav_notifications: "அறிவிப்புகள்",
    nav_emergency_call: "அவசரமா? அழையுங்கள் 112",

    // Hero
    hero_badge: "{cities} நகரங்களில் நேரலை அவசர இரத்த கட்டமைப்பு",
    hero_title_1: "விரைவாக இரத்தம் தேடுங்கள்.",
    hero_title_2: "உயிர் காப்போம்.",
    hero_desc: "அருகிலுள்ள இரத்த இருப்பை உடனுக்குடன் அறிந்து, பங்குதாரர் மருத்துவமனை இரத்த வங்கிகள் மூலம் கொடையாளர்களுடன் உடனடியாக இணையுங்கள்.",

    // Search Card
    search_card_step1: "1. தேவையான இரத்த வகையைத் தேர்வுசெய்க:",
    search_card_step2: "2. இருப்பிடம் அல்லது மருத்துவமனை:",
    search_placeholder: "நகரம் அல்லது மருத்துவமனை பெயரை உள்ளிடவும்",
    search_use_location: "தற்போதைய இருப்பிடம்",
    search_detecting: "இருப்பிடம் கண்டறியப்படுகிறது...",
    search_urgency_immediate: "உடனடி அவசரம் (<1 மணி நேரம்)",
    search_urgency_scheduled: "திட்டமிட்ட அறுவை சிகிச்சை",
    search_btn_find: "இரத்தத்தைத் தேடுக",

    // Stats
    stat_units_stock: "இருப்பில் உள்ள அலகுகள்",
    stat_partner_banks: "இணைந்த இரத்த வங்கிகள்",
    stat_donations: "ஒருங்கிணைக்கப்பட்ட இரத்த தானங்கள்",

    // Footer
    footer_tagline: "தன்னார்வ இரத்தக் கொடையாளர்கள், மருத்துவமனைகள் மற்றும் அவசர நோயாளிகளை நிகழ்நேரத்தில் இணைக்கும் இந்தியாவின் நம்பகமான அவசர இரத்த கட்டமைப்பு.",
    footer_emergency_title: "தேசிய அவசர சேவை",
    footer_support_desk: "உதவி மையத்தைத் தொடர்பு கொள்ள",
    footer_data_notice: "தரவு பாதுகாப்பு அறிவிப்பு",
    footer_copyright: "LifeGrid அவசர வள கட்டமைப்பு. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",

    // Chatbot
    chat_title: "LifeGrid உதவியாளர்",
    chat_support: "24/7 உதவி • அவசரமா? அழையுங்கள் 112",
    chat_critical_banner: "உயிர் ஆபத்தான அவசரமா?",
    chat_dial: "அழைப்பு 112",
    chat_welcome: "வணக்கம்! நான் LifeGrid அவசர மருத்துவ உதவியாளர். இரத்தம் கண்டறிய, மருத்துவமனை முகவரி பெற அல்லது தகுதி சோதிக்க நான் எவ்வாறு உதவ முடியும்?",
    chat_placeholder: "கேள்வி கேட்கவும்...",
    chat_quick_1: "O- இரத்தம் எங்கு கிடைக்கும்?",
    chat_quick_2: "நான் இரத்த தானம் செய்யலாமா?",
    chat_quick_3: "இரத்தம் எவ்வளவு விரைவில் கிடைக்கும்?",
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lifegrid_lang") as SupportedLanguage;
      if (saved && TRANSLATIONS[saved]) {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("lifegrid_lang", lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
