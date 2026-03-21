/* ============================================
   OLFATO HOUSE — Internationalization (i18n)
   Supports: Français (fr), English (en), العربية (ar)
   ============================================ */

let currentLang = localStorage.getItem('olfato_lang') || 'fr';

// ============================================
// TRANSLATIONS DICTIONARY
// ============================================
const TRANSLATIONS = {
    // ─── FRANÇAIS ───
    fr: {
        // Navigation
        nav_all: "Tous",
        nav_homme: "Homme",
        nav_femme: "Femme",
        nav_unisex: "Unisex",

        // Hero
        hero_subtitle: "L'Art du Parfum",
        search_placeholder: "Rechercher par nom, marque ou accord...",
        search_header_placeholder: "Rechercher un parfum...",
        discover: "Découvrir",

        // Catalog
        collection_title: "Notre Collection",
        load_more: "Voir plus",
        remaining: "{count} restants",

        // Product Modal
        main_accords: "Accords principaux",
        daytime_title: "Moment de la journée",
        day: "Jour",
        night: "Nuit",
        seasons_title: "Saisons",
        winter: "Hiver",
        spring: "Printemps",
        summer: "Été",
        autumn: "Automne",
        pyramid_title: "Pyramide Olfactive",
        top_notes: "Notes de tête",
        heart_notes: "Notes de cœur",
        base_notes: "Notes de fond",
        for_men: "Pour Homme",
        for_women: "Pour Femme",
        unisex_label: "Unisex",
        image_unavailable: "Image non disponible",
        description: "Description",
        results_for: "Résultats pour \"{query}\"",
        no_results: "Aucun résultat trouvé",

        // Footer
        footer_text: "© 2026 Olfato House — The Art of Perfume",

        // Genre badges
        genre_homme: "Homme",
        genre_femme: "Femme",
        genre_unisex: "Unisex",

        // Perfume count
        perfumes_singular: "parfum",
        perfumes_plural: "parfums",

        // Accords
        accords: {
            "citrus": "Agrumes",
            "aromatic": "Aromatique",
            "marine": "Marin",
            "fresh spicy": "Épicé frais",
            "floral": "Floral",
            "woody": "Boisé",
            "fresh": "Frais",
            "sweet": "Sucré",
            "warm spicy": "Épicé chaud",
            "musky": "Musqué",
            "powdery": "Poudré",
            "fruity": "Fruité",
            "amber": "Ambré",
            "vanilla": "Vanillé",
            "green": "Vert",
            "tropical": "Tropical",
            "coconut": "Noix de coco",
            "soft spicy": "Épicé doux",
            "balsamic": "Balsamique",
            "leather": "Cuir",
            "oud": "Oud",
            "rose": "Rose",
            "mossy": "Moussu",
            "smoky": "Fumé",
            "earthy": "Terreux",
            "animalic": "Animal",
            "patchouli": "Patchouli",
            "herbal": "Herbacé",
            "white floral": "Floral blanc",
            "aquatic": "Aquatique",
            "creamy": "Crémeux",
            "tobacco": "Tabac",
            "cacao": "Cacao",
            "gourmand": "Gourmand",
            "ozonic": "Ozonique",
            "salty": "Salé",
            "nutty": "Noisette",
            "aldehydic": "Aldéhydé",
            "honey": "Miel",
            "lactonic": "Lactonique",
            "synthetic": "Synthétique",
            "airy": "Aérien",
            "caramel": "Caramel",
            "coffee": "Café",
            "metallic": "Métallique",
            "rum": "Rhum",
            "cherry": "Cerise",
            "lavender": "Lavande",
            "cinnamon": "Cannelle",
            "soapy": "Savonneux",
            "iris": "Iris",
            "mineral": "Minéral",
            "violet": "Violette",
            "tuberose": "Tubéreuse"
        }
    },

    // ─── ENGLISH ───
    en: {
        nav_all: "All",
        nav_homme: "Men",
        nav_femme: "Women",
        nav_unisex: "Unisex",

        hero_subtitle: "The Art of Perfume",
        search_placeholder: "Search by name, brand or accord...",
        search_header_placeholder: "Search a perfume...",
        discover: "Discover",

        collection_title: "Our Collection",
        load_more: "See more",
        remaining: "{count} remaining",

        main_accords: "Main Accords",
        daytime_title: "Time of Day",
        day: "Day",
        night: "Night",
        seasons_title: "Seasons",
        winter: "Winter",
        spring: "Spring",
        summer: "Summer",
        autumn: "Autumn",
        pyramid_title: "Fragrance Pyramid",
        top_notes: "Top Notes",
        heart_notes: "Heart Notes",
        base_notes: "Base Notes",
        for_men: "For Men",
        for_women: "For Women",
        unisex_label: "Unisex",
        image_unavailable: "Image not available",
        description: "Description",
        results_for: "Results for \"{query}\"",
        no_results: "No results found",

        footer_text: "© 2026 Olfato House — The Art of Perfume",

        genre_homme: "Men",
        genre_femme: "Women",
        genre_unisex: "Unisex",

        perfumes_singular: "perfume",
        perfumes_plural: "perfumes",

        accords: {
            "citrus": "Citrus",
            "aromatic": "Aromatic",
            "marine": "Marine",
            "fresh spicy": "Fresh Spicy",
            "floral": "Floral",
            "woody": "Woody",
            "fresh": "Fresh",
            "sweet": "Sweet",
            "warm spicy": "Warm Spicy",
            "musky": "Musky",
            "powdery": "Powdery",
            "fruity": "Fruity",
            "amber": "Amber",
            "vanilla": "Vanilla",
            "green": "Green",
            "tropical": "Tropical",
            "coconut": "Coconut",
            "soft spicy": "Soft Spicy",
            "balsamic": "Balsamic",
            "leather": "Leather",
            "oud": "Oud",
            "rose": "Rose",
            "mossy": "Mossy",
            "smoky": "Smoky",
            "earthy": "Earthy",
            "animalic": "Animalic",
            "patchouli": "Patchouli",
            "herbal": "Herbal",
            "white floral": "White Floral",
            "aquatic": "Aquatic",
            "creamy": "Creamy",
            "tobacco": "Tobacco",
            "cacao": "Cacao",
            "gourmand": "Gourmand",
            "ozonic": "Ozonic",
            "salty": "Salty",
            "nutty": "Nutty",
            "aldehydic": "Aldehydic",
            "honey": "Honey",
            "lactonic": "Lactonic",
            "synthetic": "Synthetic",
            "airy": "Airy",
            "caramel": "Caramel",
            "coffee": "Coffee",
            "metallic": "Metallic",
            "rum": "Rum",
            "cherry": "Cherry",
            "lavender": "Lavender",
            "cinnamon": "Cinnamon",
            "soapy": "Soapy",
            "iris": "Iris",
            "mineral": "Mineral",
            "violet": "Violet",
            "tuberose": "Tuberose"
        }
    },

    // ─── العربية ───
    ar: {
        nav_all: "الكل",
        nav_homme: "رجالي",
        nav_femme: "نسائي",
        nav_unisex: "للجنسين",

        hero_subtitle: "فن العطور",
        search_placeholder: "البحث بالاسم أو الماركة أو النوتة...",
        search_header_placeholder: "البحث عن عطر...",
        discover: "اكتشف",

        collection_title: "مجموعتنا",
        load_more: "عرض المزيد",
        remaining: "{count} متبقي",

        main_accords: "النوتات الرئيسية",
        daytime_title: "وقت الارتداء",
        day: "نهاري",
        night: "ليلي",
        seasons_title: "الفصول",
        winter: "شتاء",
        spring: "ربيع",
        summer: "صيف",
        autumn: "خريف",
        pyramid_title: "هرم العطر",
        top_notes: "نوتات الرأس",
        heart_notes: "نوتات القلب",
        base_notes: "نوتات القاعدة",
        for_men: "للرجال",
        for_women: "للنساء",
        unisex_label: "للجنسين",
        image_unavailable: "الصورة غير متوفرة",
        description: "الوصف",
        results_for: "نتائج البحث عن \"{query}\"",
        no_results: "لا توجد نتائج",

        footer_text: "© 2026 Olfato House — فن العطور",

        genre_homme: "رجالي",
        genre_femme: "نسائي",
        genre_unisex: "للجنسين",

        perfumes_singular: "عطر",
        perfumes_plural: "عطور",

        accords: {
            "citrus": "حمضي",
            "aromatic": "عطري",
            "marine": "بحري",
            "fresh spicy": "حار منعش",
            "floral": "زهري",
            "woody": "خشبي",
            "fresh": "منعش",
            "sweet": "حلو",
            "warm spicy": "حار دافئ",
            "musky": "مسكي",
            "powdery": "بودري",
            "fruity": "فاكهي",
            "amber": "عنبري",
            "vanilla": "فانيلا",
            "green": "أخضر",
            "tropical": "استوائي",
            "coconut": "جوز الهند",
            "soft spicy": "حار ناعم",
            "balsamic": "بلسمي",
            "leather": "جلدي",
            "oud": "عود",
            "rose": "ورد",
            "mossy": "طحلبي",
            "smoky": "مُدخّن",
            "earthy": "ترابي",
            "animalic": "حيواني",
            "patchouli": "باتشولي",
            "herbal": "عشبي",
            "white floral": "زهري أبيض",
            "aquatic": "مائي",
            "creamy": "كريمي",
            "tobacco": "تبغ",
            "cacao": "كاكاو",
            "gourmand": "ذواقي",
            "ozonic": "أوزوني",
            "salty": "مالح",
            "nutty": "جوزي",
            "aldehydic": "ألدهيدي",
            "honey": "عسل",
            "lactonic": "لاكتوني",
            "synthetic": "صناعي",
            "airy": "هوائي",
            "caramel": "كراميل",
            "coffee": "قهوة",
            "metallic": "معدني",
            "rum": "روم",
            "cherry": "كرز",
            "lavender": "لافندر",
            "cinnamon": "قرفة",
            "soapy": "صابوني",
            "iris": "سوسن",
            "mineral": "معدني",
            "violet": "بنفسج",
            "tuberose": "مسك الليل"
        }
    }
};

// ============================================
// TRANSLATION API
// ============================================

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g. 'nav_all')
 * @param {object} params - Optional parameters for template strings
 */
function t(key, params = {}) {
    const lang = currentLang;
    let text = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['fr']?.[key] ?? key;
    // Replace template params like {count}, {query}
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

/**
 * Get translated accord label from English key
 */
function tAccord(labelEn) {
    const lang = currentLang;
    const accords = TRANSLATIONS[lang]?.accords ?? TRANSLATIONS['fr']?.accords ?? {};
    const key = labelEn.toLowerCase();
    return accords[key] || labelEn.charAt(0).toUpperCase() + labelEn.slice(1);
}

/**
 * Get translated season name
 */
function tSeason(seasonKey) {
    const map = { winter: 'winter', spring: 'spring', summer: 'summer', fall: 'autumn', autumn: 'autumn' };
    const normalizedKey = map[seasonKey.toLowerCase()] || seasonKey.toLowerCase();
    return t(normalizedKey);
}

/**
 * Get translated genre label
 */
function tGenre(genre) {
    const map = { 'Homme': 'genre_homme', 'Femme': 'genre_femme', 'Unisex': 'genre_unisex' };
    return t(map[genre] || 'genre_unisex');
}

/**
 * Get translated "for" genre label (Pour Homme, For Men, للرجال)
 */
function tForGenre(genre) {
    const map = { 'Homme': 'for_men', 'Femme': 'for_women', 'Unisex': 'unisex_label' };
    return t(map[genre] || 'unisex_label');
}

/**
 * Get product count text
 */
function tCount(count) {
    const word = count > 1 ? t('perfumes_plural') : t('perfumes_singular');
    return `${count} ${word}`;
}

/**
 * Check if current language is RTL
 */
function isRTL() {
    return currentLang === 'ar';
}

/**
 * Set language and apply changes
 */
function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('olfato_lang', lang);

    // Set dir and lang attributes on html
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');

    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Update all data-i18n-placeholder elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    // Update lang switcher active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Trigger custom event for app.js to re-render dynamic content
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

/**
 * Initialize i18n on page load
 */
function initI18n() {
    setLanguage(currentLang);
}
