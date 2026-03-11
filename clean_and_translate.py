"""
OLFATO HOUSE — Data Cleaner & Translator (v2)
Strategy: 
  1) Remove garbage/scraped data artifacts
  2) Keep compound notes intact (no aggressive splitting)
  3) Translate notes, accords, etc. to FR and AR
  4) Add pyramid_fr and pyramid_ar to products.json
  5) Fix accord labels that remain in English
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(BASE_DIR, 'site', 'data', 'products.json')
OUTPUT_PATH = INPUT_PATH

# ============================================
# GARBAGE NOTES (web scraping artifacts)
# ============================================
GARBAGE_EXACT = {
    'ICA', 'Abov', 'Forum', 'News', 'Perfumes', 'Perfumers', 'Fragram',
    'AGRANTICA FREE', 'ANTICA News', 'GRANTICA News', 'FREE TO CHOOSE',
    'Forum Fragram', 'Ab', 'About', 'E =', ': Sage', '= Sage',
}

def is_garbage(note):
    n = note.strip()
    if n in GARBAGE_EXACT:
        return True
    if len(n) <= 1:
        return True
    if re.match(r'^[^a-zA-Z]+$', n):
        return True
    # Fragrantica site elements
    for g in ['FRAGRANTICA', 'AGRANTICA', 'ANTICA', 'Fragram', 'Forum',
              'FREE TO', 'Perfumers', 'Perfumes']:
        if g.lower() in n.lower():
            return True
    return False

# ============================================
# COMPREHENSIVE NOTE TRANSLATIONS (EN → FR, AR)
# Covers ~500+ perfume ingredients
# ============================================
NOTE_TR = {
    # ───── CITRUS ─────
    'Bergamot': ('Bergamote', 'برغموت'),
    'Lemon': ('Citron', 'ليمون'),
    'Lime': ('Citron vert', 'ليمون أخضر'),
    'Orange': ('Orange', 'برتقال'),
    'Grapefruit': ('Pamplemousse', 'جريب فروت'),
    'Mandarin': ('Mandarine', 'ماندرين'),
    'Mandarin Orange': ('Mandarine', 'ماندرين'),
    'Tangerine': ('Tangerine', 'يوسفي'),
    'Citron': ('Cédrat', 'أترج'),
    'Yuzu': ('Yuzu', 'يوزو'),
    'Neroli': ('Néroli', 'نيرولي'),
    'Petitgrain': ('Petit grain', 'بتيجران'),
    'Citruses': ('Agrumes', 'حمضيات'),
    'Blood Orange': ('Orange sanguine', 'برتقال أحمر'),
    'Amalfi Lemon': ('Citron d\'Amalfi', 'ليمون أمالفي'),
    'Sicilian Lemon': ('Citron de Sicile', 'ليمون صقلي'),
    'Italian Lemon': ('Citron italien', 'ليمون إيطالي'),
    'Calabrian Bergamot': ('Bergamote de Calabre', 'برغموت كالابري'),
    'Italian Bergamot': ('Bergamote italienne', 'برغموت إيطالي'),
    'Lemon Zest': ('Zeste de citron', 'قشر الليمون'),
    'Lemon Verbena': ('Verveine citronnée', 'لويزة'),
    'Lemon Balm': ('Mélisse', 'ميليسا'),
    'Pink Grapefruit': ('Pamplemousse rose', 'جريب فروت وردي'),
    'Sweet Orange': ('Orange douce', 'برتقال حلو'),
    'Orange Peel': ('Écorce d\'orange', 'قشر البرتقال'),
    'Yuzu Lemon': ('Citron yuzu', 'ليمون يوزو'),
    'Clementine': ('Clémentine', 'كليمنتين'),
    'Kumquat': ('Kumquat', 'كمكوات'),

    # ───── FLORAL ─────
    'Rose': ('Rose', 'ورد'),
    'Jasmine': ('Jasmin', 'ياسمين'),
    'Lavender': ('Lavande', 'لافندر'),
    'Iris': ('Iris', 'سوسن'),
    'Violet': ('Violette', 'بنفسج'),
    'Lily': ('Lys', 'زنبق'),
    'Peony': ('Pivoine', 'فاوانيا'),
    'Magnolia': ('Magnolia', 'ماغنوليا'),
    'Orchid': ('Orchidée', 'أوركيد'),
    'Gardenia': ('Gardénia', 'غاردينيا'),
    'Carnation': ('Œillet', 'قرنفل زهري'),
    'Geranium': ('Géranium', 'جيرانيوم'),
    'Freesia': ('Freesia', 'فريزيا'),
    'Lotus': ('Lotus', 'لوتس'),
    'Tuberose': ('Tubéreuse', 'مسك الليل'),
    'Heliotrope': ('Héliotrope', 'هيليوتروب'),
    'Mimosa': ('Mimosa', 'ميموزا'),
    'Ylang-Ylang': ('Ylang-Ylang', 'يلانج يلانج'),
    'Osmanthus': ('Osmanthus', 'عثمانثوس'),
    'Hyacinth': ('Jacinthe', 'ياقوتية'),
    'Hiacynth': ('Jacinthe', 'ياقوتية'),
    'Cyclamen': ('Cyclamen', 'بخور مريم'),
    'Daisy': ('Pâquerette', 'أقحوان'),
    'Honeysuckle': ('Chèvrefeuille', 'زهرة العسل'),
    'Acacia': ('Acacia', 'أكاسيا'),
    'Pelargonium': ('Pélargonium', 'بيلارغونيوم'),
    'Narcissus': ('Narcisse', 'نرجس'),
    'Lilac': ('Lilas', 'ليلك'),
    'Amaryllis': ('Amaryllis', 'أماريليس'),
    'Hibiscus': ('Hibiscus', 'كركديه'),
    'Champaca': ('Champaca', 'شمباكا'),
    'Datura': ('Datura', 'داتورا'),
    'Hawthorn': ('Aubépine', 'زعرور'),
    'Stephanotis': ('Stéphanotis', 'استفانوتيس'),
    'Tulip': ('Tulipe', 'توليب'),
    'Bellflower': ('Campanule', 'جرس الزهور'),
    'Buddleia': ('Buddleia', 'بودليا'),
    'Strelitzia': ('Oiseau de paradis', 'عصفور الجنة'),
    'Tiare': ('Tiaré', 'تياري'),
    'Mignonette': ('Réséda', 'رزيدا'),
    'Syringa': ('Syringa', 'سرنجا'),
    'Lily-of-the-Valley': ('Muguet', 'زنبق الوادي'),
    'Lily of the Valley': ('Muguet', 'زنبق الوادي'),
    'Orange Blossom': ('Fleur d\'oranger', 'زهر البرتقال'),
    'Orange Flower': ('Fleur d\'oranger', 'زهر البرتقال'),
    'African Orange Flower': ('Fleur d\'oranger d\'Afrique', 'زهر البرتقال الأفريقي'),
    'Cactus Flower': ('Fleur de cactus', 'زهرة الصبار'),
    'Cotton Flower': ('Fleur de coton', 'زهرة القطن'),
    'Apple Blossom': ('Fleur de pommier', 'زهر التفاح'),
    'Plum Blossom': ('Fleur de prunier', 'زهر البرقوق'),
    'Pear Blossom': ('Fleur de poirier', 'زهر الإجاص'),
    'Almond Blossom': ('Fleur d\'amandier', 'زهر اللوز'),
    'Pink Rose': ('Rose rose', 'ورد وردي'),
    'Red Rose': ('Rose rouge', 'ورد أحمر'),
    'White Rose': ('Rose blanche', 'ورد أبيض'),
    'Wild Rose': ('Rose sauvage', 'ورد بري'),
    'Bulgarian Rose': ('Rose bulgare', 'ورد بلغاري'),
    'Damascus Rose': ('Rose de Damas', 'ورد دمشقي'),
    'Damask Rose': ('Rose de Damas', 'ورد دمشقي'),
    'Turkish Rose': ('Rose turque', 'ورد تركي'),
    'May Rose': ('Rose de Mai', 'ورد مايو'),
    'Tea Rose': ('Rose thé', 'ورد الشاي'),
    'Indian Rose': ('Rose indienne', 'ورد هندي'),
    'Provence Rose': ('Rose de Provence', 'ورد بروفنسي'),
    'Taif Rose': ('Rose de Taëf', 'ورد الطائف'),
    'Rose Absolute': ('Absolue de rose', 'مطلق الورد'),
    'Rose Oil': ('Huile de rose', 'زيت الورد'),
    'Rose Petal': ('Pétale de rose', 'بتلة ورد'),
    'Rose Petals': ('Pétales de rose', 'بتلات الورد'),
    'Rose Water': ('Eau de rose', 'ماء الورد'),
    'Rose Jam': ('Confiture de rose', 'مربى الورد'),
    'Night Jasmine': ('Jasmin de nuit', 'ياسمين الليل'),
    'Indian Jasmine': ('Jasmin indien', 'ياسمين هندي'),
    'Star Jasmine': ('Jasmin étoilé', 'ياسمين نجمي'),
    'Sambac Jasmine': ('Jasmin sambac', 'ياسمين سمبق'),
    'Jasmine Sambac': ('Jasmin sambac', 'ياسمين سمبق'),
    'Water Jasmine': ('Jasmin d\'eau', 'ياسمين الماء'),
    'Water Lily': ('Nénuphar', 'زنبق الماء'),
    'Water Hyacinth': ('Jacinthe d\'eau', 'ياقوتية الماء'),
    'Tiger Lily': ('Lis tigré', 'زنبق النمر'),
    'Madonna Lily': ('Lis de la Madone', 'زنبق أبيض'),
    'Blue Lotus': ('Lotus bleu', 'لوتس أزرق'),
    'White Flowers': ('Fleurs blanches', 'أزهار بيضاء'),
    'Gardenia Flowers': ('Fleurs de gardénia', 'أزهار الغاردينيا'),
    'Pepper Flower': ('Fleur de poivre', 'زهرة الفلفل'),
    'Osmanthus Flower': ('Fleur d\'osmanthus', 'زهرة العثمانثوس'),
    'Orchid Flower': ('Fleur d\'orchidée', 'زهرة الأوركيد'),
    'Immortelle': ('Immortelle', 'زهرة الخلود'),
    'Immortal Flower': ('Immortelle', 'زهرة الخلود'),
    'French Lavender': ('Lavande française', 'لافندر فرنسي'),
    'Wild Lavender': ('Lavande sauvage', 'لافندر بري'),
    'Orris': ('Orris', 'سوسن'),
    'Orris Root': ('Racine d\'iris', 'جذر السوسن'),
    'Blossom': ('Fleurs', 'أزهار'),
    'Flower': ('Fleur', 'زهرة'),
    'Flowers': ('Fleurs', 'أزهار'),
    'Petals': ('Pétales', 'بتلات'),
    'Camelia': ('Camélia', 'كاميليا'),
    'White Camelia': ('Camélia blanc', 'كاميليا بيضاء'),
    'Sambac': ('Sambac', 'سمبق'),
    'Nympheal': ('Nymphéal', 'نيمفيال'),
    'Casablanca Lily': ('Lis de Casablanca', 'زنبق كازابلانكا'),

    # ───── WOODY ─────
    'Sandalwood': ('Bois de santal', 'خشب الصندل'),
    'Cedar': ('Cèdre', 'أرز'),
    'Cedarwood': ('Bois de cèdre', 'خشب الأرز'),
    'Vetiver': ('Vétiver', 'فيتيفر'),
    'Vetyver': ('Vétiver', 'فيتيفر'),
    'Oud': ('Oud', 'عود'),
    'Agarwood': ('Bois d\'agar', 'عود'),
    'Agarwood (Oud)': ('Oud', 'عود'),
    'Patchouli': ('Patchouli', 'باتشولي'),
    'Oakmoss': ('Mousse de chêne', 'طحلب البلوط'),
    'Oak Moss': ('Mousse de chêne', 'طحلب البلوط'),
    'Birch': ('Bouleau', 'بتولا'),
    'Pine': ('Pin', 'صنوبر'),
    'Cypress': ('Cyprès', 'سرو'),
    'Teak': ('Teck', 'خشب الساج'),
    'Teak Wood': ('Bois de teck', 'خشب الساج'),
    'Bamboo': ('Bambou', 'خيزران'),
    'Ebony': ('Ébène', 'أبنوس'),
    'Guaiac Wood': ('Gaïac', 'خشب الغاياك'),
    'Guaiac': ('Gaïac', 'خشب الغاياك'),
    'Gaiac Wood': ('Gaïac', 'خشب الغاياك'),
    'White Sandalwood': ('Santal blanc', 'صندل أبيض'),
    'Virginia Cedar': ('Cèdre de Virginie', 'أرز فرجينيا'),
    'White Cedar': ('Cèdre blanc', 'أرز أبيض'),
    'Amberwood': ('Ambre boisé', 'عنبر خشبي'),
    'Cashmeran': ('Cashméran', 'كشميران'),
    'Rosewood': ('Bois de rose', 'خشب الورد'),
    'Fir': ('Sapin', 'تنوب'),
    'Balsam Fir': ('Sapin baumier', 'تنوب بلسمي'),
    'Sequoia': ('Séquoia', 'سيكويا'),
    'Mahogany': ('Acajou', 'ماهوغاني'),
    'Wood': ('Bois', 'خشب'),
    'Woods': ('Bois', 'أخشاب'),
    'Woody': ('Boisé', 'خشبي'),
    'Woody Notes': ('Notes boisées', 'نوتات خشبية'),
    'Woodsy Notes': ('Notes boisées', 'نوتات خشبية'),
    'Woodsy': ('Boisé', 'خشبي'),
    'Haitian Vetiver': ('Vétiver haïtien', 'فيتيفر هايتي'),
    'Java Vetiver': ('Vétiver de Java', 'فيتيفر جاوي'),
    'Indonesian Patchouli': ('Patchouli d\'Indonésie', 'باتشولي إندونيسي'),
    'Akigalawood': ('Akigalawood', 'أكيغالاوود'),
    'Incense Wood': ('Bois d\'encens', 'خشب البخور'),
    'Palisander': ('Palissandre', 'خشب الورد البرازيلي'),
    'Silkwood': ('Bois de soie', 'خشب الحرير'),
    'Cashmirwood': ('Bois de cachemire', 'خشب الكشمير'),

    # ───── SPICY ─────
    'Pepper': ('Poivre', 'فلفل'),
    'Black Pepper': ('Poivre noir', 'فلفل أسود'),
    'White Pepper': ('Poivre blanc', 'فلفل أبيض'),
    'Pink Pepper': ('Poivre rose', 'فلفل وردي'),
    'Sichuan Pepper': ('Poivre du Sichuan', 'فلفل سيتشوان'),
    'Cinnamon': ('Cannelle', 'قرفة'),
    'Ceylon Cinnamon': ('Cannelle de Ceylan', 'قرفة سريلانكية'),
    'Cardamom': ('Cardamome', 'هيل'),
    'Cloves': ('Clou de girofle', 'قرنفل'),
    'Clove Bud': ('Bourgeon de girofle', 'برعم القرنفل'),
    'Nutmeg': ('Noix de muscade', 'جوزة الطيب'),
    'Ginger': ('Gingembre', 'زنجبيل'),
    'Saffron': ('Safran', 'زعفران'),
    'Cumin': ('Cumin', 'كمون'),
    'Coriander': ('Coriandre', 'كزبرة'),
    'Caraway': ('Carvi', 'كراويا'),
    'Anise': ('Anis', 'يانسون'),
    'Star Anise': ('Anis étoilé', 'يانسون نجمي'),
    'Basil': ('Basilic', 'ريحان'),
    'Holy Basil': ('Basilic sacré', 'ريحان مقدس'),
    'Spices': ('Épices', 'توابل'),
    'Spicy Notes': ('Notes épicées', 'نوتات حارة'),
    'Paprika': ('Paprika', 'بابريكا'),
    'Turmeric': ('Curcuma', 'كركم'),
    'Chili Pepper': ('Piment', 'فلفل حار'),
    'Chili': ('Piment', 'فلفل حار'),
    'Pimento': ('Piment', 'فلفل حلو'),
    'Cassia': ('Casse', 'كاسيا'),

    # ───── FRUITY ─────
    'Apple': ('Pomme', 'تفاح'),
    'Green Apple': ('Pomme verte', 'تفاح أخضر'),
    'Red Apple': ('Pomme rouge', 'تفاح أحمر'),
    'Granny Smith Apple': ('Pomme Granny Smith', 'تفاح جراني سميث'),
    'Peach': ('Pêche', 'خوخ'),
    'White Peach': ('Pêche blanche', 'خوخ أبيض'),
    'Pear': ('Poire', 'إجاص'),
    'Plum': ('Prune', 'برقوق'),
    'Cherry': ('Cerise', 'كرز'),
    'Sour Cherry': ('Griotte', 'كرز حامض'),
    'Black Cherry': ('Cerise noire', 'كرز أسود'),
    'Raspberry': ('Framboise', 'توت أحمر'),
    'Blackberry': ('Mûre', 'توت أسود'),
    'Strawberry': ('Fraise', 'فراولة'),
    'Wild Strawberry': ('Fraise des bois', 'فراولة برية'),
    'Blueberry': ('Myrtille', 'توت أزرق'),
    'Cranberry': ('Canneberge', 'توت بري'),
    'Cassis': ('Cassis', 'كشمش أسود'),
    'Black Currant': ('Cassis', 'كشمش أسود'),
    'Red Currant': ('Groseille rouge', 'كشمش أحمر'),
    'Currant': ('Groseille', 'كشمش'),
    'Fig': ('Figue', 'تين'),
    'Wild Fig': ('Figue sauvage', 'تين بري'),
    'Fig Leaf': ('Feuille de figuier', 'ورق التين'),
    'Coconut': ('Noix de coco', 'جوز الهند'),
    'Coconut Milk': ('Lait de coco', 'حليب جوز الهند'),
    'Pineapple': ('Ananas', 'أناناس'),
    'Mango': ('Mangue', 'مانجو'),
    'Passionfruit': ('Fruit de la passion', 'فاكهة الشغف'),
    'Passion Fruit': ('Fruit de la passion', 'فاكهة الشغف'),
    'Lychee': ('Litchi', 'ليتشي'),
    'Litchi': ('Litchi', 'ليتشي'),
    'Pomegranate': ('Grenade', 'رمان'),
    'Watermelon': ('Pastèque', 'بطيخ'),
    'Melon': ('Melon', 'شمام'),
    'Apricot': ('Abricot', 'مشمش'),
    'Banana': ('Banane', 'موز'),
    'Grape': ('Raisin', 'عنب'),
    'Grapes': ('Raisin', 'عنب'),
    'Kiwi': ('Kiwi', 'كيوي'),
    'Dates': ('Dattes', 'تمر'),
    'Red Berries': ('Fruits rouges', 'ثمار حمراء'),
    'Red Fruits': ('Fruits rouges', 'ثمار حمراء'),
    'Wild Berries': ('Baies sauvages', 'توت بري'),
    'Berries': ('Baies', 'ثمار'),
    'Almond': ('Amande', 'لوز'),
    'Sweet Almond': ('Amande douce', 'لوز حلو'),
    'Almond Milk': ('Lait d\'amande', 'حليب اللوز'),
    'Cloudberry': ('Mûre arctique', 'توت قطبي'),
    'Davana': ('Davana', 'دافانا'),
    'Persimmon': ('Kaki', 'كاكي'),
    'Papaya': ('Papaye', 'بابايا'),
    'Guava': ('Goyave', 'جوافة'),
    'Quince': ('Coing', 'سفرجل'),
    'Nectarine': ('Nectarine', 'نكتارين'),
    'Mirabelle': ('Mirabelle', 'ميرابيل'),
    'Tamarind': ('Tamarin', 'تمر هندي'),
    'Olive': ('Olive', 'زيتون'),
    'Pistachio': ('Pistache', 'فستق'),
    'Hazelnut': ('Noisette', 'بندق'),
    'Chestnut': ('Châtaigne', 'كستناء'),
    'Fruits': ('Fruits', 'فواكه'),
    'Fruity': ('Fruité', 'فاكهي'),
    'Fruity Notes': ('Notes fruitées', 'نوتات فاكهية'),

    # ───── GOURMAND ─────
    'Vanilla': ('Vanille', 'فانيلا'),
    'Vanille': ('Vanille', 'فانيلا'),
    'Vanila': ('Vanille', 'فانيلا'),
    'Bourbon Vanilla': ('Vanille bourbon', 'فانيلا بوربون'),
    'Tahitian Vanilla': ('Vanille de Tahiti', 'فانيلا تاهيتية'),
    'Madagascar Vanilla': ('Vanille de Madagascar', 'فانيلا مدغشقرية'),
    'Vanilla Bean': ('Gousse de vanille', 'حبة الفانيلا'),
    'Caramel': ('Caramel', 'كراميل'),
    'Salted Caramel': ('Caramel salé', 'كراميل مالح'),
    'Chocolate': ('Chocolat', 'شوكولاتة'),
    'Dark Chocolate': ('Chocolat noir', 'شوكولاتة داكنة'),
    'Praline': ('Praliné', 'برالين'),
    'Praline Chocolate': ('Praliné au chocolat', 'برالين شوكولاتة'),
    'Cacao': ('Cacao', 'كاكاو'),
    'Cocoa': ('Cacao', 'كاكاو'),
    'Cacao Pod': ('Cabosse de cacao', 'ثمرة الكاكاو'),
    'Coffee': ('Café', 'قهوة'),
    'Cappuccino': ('Cappuccino', 'كابتشينو'),
    'Honey': ('Miel', 'عسل'),
    'Sugar': ('Sucre', 'سكر'),
    'Cotton Candy': ('Barbe à papa', 'غزل البنات'),
    'Candy Floss': ('Barbe à papa', 'غزل البنات'),
    'Milk': ('Lait', 'حليب'),
    'Cream': ('Crème', 'كريمة'),
    'Rum': ('Rhum', 'روم'),
    'Cognac': ('Cognac', 'كونياك'),
    'Whiskey': ('Whisky', 'ويسكي'),
    'Gin': ('Gin', 'جن'),
    'Vodka': ('Vodka', 'فودكا'),
    'Champagne': ('Champagne', 'شامبانيا'),
    'Tonka Bean': ('Fève tonka', 'فول تونكا'),
    'Tonka': ('Tonka', 'تونكا'),
    'Coumarin': ('Coumarine', 'كومارين'),
    'Toffee': ('Caramel au beurre', 'توفي'),
    'Nougat': ('Nougat', 'نوغا'),
    'Popcorn': ('Pop-corn', 'فشار'),
    'Marshmallow': ('Guimauve', 'مارشميلو'),
    'Panacotta': ('Panna cotta', 'بانا كوتا'),
    'Kulfi': ('Kulfi', 'كلفي'),
    'Bean': ('Fève', 'فول'),
    'Beans': ('Fèves', 'فول'),

    # ───── HERBAL / GREEN ─────
    'Mint': ('Menthe', 'نعناع'),
    'Water Mint': ('Menthe aquatique', 'نعناع مائي'),
    'Rosemary': ('Romarin', 'إكليل الجبل'),
    'Thyme': ('Thym', 'زعتر'),
    'Sage': ('Sauge', 'ميرمية'),
    'Clary Sage': ('Sauge sclarée', 'ميرمية متقزحة'),
    'Oregano': ('Origan', 'أوريجانو'),
    'Tarragon': ('Estragon', 'طرخون'),
    'Fennel': ('Fenouil', 'شمر'),
    'Tea': ('Thé', 'شاي'),
    'Green Tea': ('Thé vert', 'شاي أخضر'),
    'Black Tea': ('Thé noir', 'شاي أسود'),
    'White Tea': ('Thé blanc', 'شاي أبيض'),
    'Rooibos': ('Rooibos', 'رويبوس'),
    'Mate': ('Maté', 'ماتي'),
    'Green Notes': ('Notes vertes', 'نوتات خضراء'),
    'Fern': ('Fougère', 'سرخس'),
    'Grass': ('Herbe', 'عشب'),
    'Aloe Vera': ('Aloe Vera', 'صبار'),
    'Eucalyptus': ('Eucalyptus', 'أوكالبتوس'),
    'Artemisia': ('Armoise', 'شيح'),
    'Wormwood': ('Absinthe', 'أفسنتين'),
    'Chamomile': ('Camomille', 'بابونج'),
    'Bay Leaf': ('Laurier', 'ورق الغار'),
    'Bay': ('Laurier', 'غار'),
    'Laurels': ('Lauriers', 'غار'),
    'Myrtle': ('Myrte', 'آس'),
    'Verbena': ('Verveine', 'لويزة'),
    'Vervain': ('Verveine', 'لويزة'),
    'Leaf': ('Feuille', 'ورقة'),
    'Leaves': ('Feuilles', 'أوراق'),
    'Root': ('Racine', 'جذر'),
    'Herbal': ('Herbacé', 'عشبي'),
    'Green': ('Vert', 'أخضر'),
    'Galbanum': ('Galbanum', 'قنة'),
    'Licorice': ('Réglisse', 'عرق سوس'),
    'Hemp': ('Chanvre', 'قنب'),
    'Rhubarb': ('Rhubarbe', 'راوند'),
    'Rhuburb': ('Rhubarbe', 'راوند'),
    'Cucumber': ('Concombre', 'خيار'),
    'Carrot': ('Carotte', 'جزر'),
    'Tomato': ('Tomate', 'طماطم'),
    'Ivy': ('Lierre', 'لبلاب'),
    'Angelica': ('Angélique', 'أنجليكا'),
    'Seagrass': ('Herbe marine', 'عشب بحري'),
    'Shiso': ('Shiso', 'شيسو'),

    # ───── MUSK / AMBER / RESINS ─────
    'Musk': ('Musc', 'مسك'),
    'White Musk': ('Musc blanc', 'مسك أبيض'),
    'Silk Musk': ('Musc de soie', 'مسك الحرير'),
    'Musk Mallow': ('Ambrette', 'أمبريت'),
    'Amber': ('Ambre', 'عنبر'),
    'White Amber': ('Ambre blanc', 'عنبر أبيض'),
    'Ambergris': ('Ambre gris', 'عنبر رمادي'),
    'Ambroxan': ('Ambroxan', 'أمبروكسان'),
    'Ambrette': ('Ambrette', 'أمبريت'),
    'Incense': ('Encens', 'بخور'),
    'Frankincense': ('Oliban', 'لبان'),
    'Myrrh': ('Myrrhe', 'مر'),
    'Myrhh': ('Myrrhe', 'مر'),
    'Benzoin': ('Benjoin', 'بنزوين'),
    'Labdanum': ('Labdanum', 'لادنم'),
    'Opoponax': ('Opoponax', 'أوبوبوناكس'),
    'Opopanax': ('Opoponax', 'أوبوبوناكس'),
    'Tolu Balsam': ('Baume de Tolu', 'بلسم التولو'),
    'Elemi': ('Élémi', 'إيليمي'),
    'Olibanum': ('Oliban', 'لبان'),
    'Resin': ('Résine', 'راتنج'),
    'Resins': ('Résines', 'راتنجات'),
    'Beeswax': ('Cire d\'abeille', 'شمع العسل'),
    'Styrax': ('Styrax', 'عسل بر'),
    'Nagarmotha': ('Nagarmotha', 'ناغارموثا'),
    'Cypriol': ('Cypriol', 'سبريول'),
    'Balsam': ('Baume', 'بلسم'),
    'Balsamic': ('Balsamique', 'بلسمي'),
    'Mastic': ('Mastic', 'مصطكي'),

    # ───── LEATHER / ANIMALIC ─────
    'Leather': ('Cuir', 'جلد'),
    'Russian Leather': ('Cuir de Russie', 'جلد روسي'),
    'Suede': ('Daim', 'سويدي'),
    'Suede Leather': ('Cuir suédé', 'جلد سويدي'),
    'Civet': ('Civette', 'زباد'),
    'Castoreum': ('Castoreum', 'كاستوريوم'),
    'Cashmere': ('Cachemire', 'كشمير'),
    'Animal Notes': ('Notes animales', 'نوتات حيوانية'),
    'Animal': ('Animal', 'حيواني'),
    'Daim': ('Daim', 'سويدي'),

    # ───── MARINE / AQUATIC ─────
    'Sea Notes': ('Notes marines', 'نوتات بحرية'),
    'Sea Salt': ('Sel marin', 'ملح بحري'),
    'Calone': ('Calone', 'كالون'),
    'Seaweed': ('Algues', 'أعشاب بحرية'),
    'Marine': ('Marin', 'بحري'),
    'Ozonic': ('Ozonique', 'أوزوني'),
    'Watery': ('Aquatique', 'مائي'),
    'Water': ('Eau', 'ماء'),
    'Salt': ('Sel', 'ملح'),
    'Mineral': ('Minéral', 'معدني'),
    'Mineral Notes': ('Notes minérales', 'نوتات معدنية'),

    # ───── TOBACCO ─────
    'Tobacco': ('Tabac', 'تبغ'),
    'Tobacco Leaf': ('Feuille de tabac', 'ورقة التبغ'),

    # ───── MISC INGREDIENTS ─────
    'Aldehydes': ('Aldéhydes', 'ألدهيدات'),
    'Moss': ('Mousse', 'طحلب'),
    'Lentisque': ('Lentisque', 'مصطكي'),
    'Hedione': ('Hédione', 'هيديون'),
    'Iso E Super': ('Iso E Super', 'إيزو إي سوبر'),
    'Amyris': ('Amyris', 'أميريس'),
    'Saffron Crocus': ('Crocus à safran', 'زعفران'),
    'Jasmine Rice': ('Riz au jasmin', 'أرز الياسمين'),
    'Juniper': ('Genévrier', 'عرعر'),
    'Juniper Berry': ('Baie de genévrier', 'ثمرة العرعر'),
    'Absolute': ('Absolu', 'مطلق'),
    'Accord': ('Accord', 'أكورد'),
    'Extract': ('Extrait', 'مستخلص'),
    'Essence': ('Essence', 'جوهر'),
    'Tincture': ('Teinture', 'صبغة'),
    'Oil': ('Huile', 'زيت'),
    'Seed': ('Graine', 'بذرة'),
    'Seeds': ('Graines', 'بذور'),
    'Liqueur': ('Liqueur', 'ليكور'),
    'Smoke': ('Fumée', 'دخان'),
    'Flint': ('Silex', 'صوان'),
    'Sand': ('Sable', 'رمل'),
    'Caviar': ('Caviar', 'كافيار'),
    'Ice': ('Glace', 'ثلج'),
    'Rice': ('Riz', 'أرز'),
    'Sorbet': ('Sorbet', 'سوربيه'),
    'Truffle': ('Truffe', 'كمأة'),
    'Black': ('Noir', 'أسود'),
    'White': ('Blanc', 'أبيض'),
    'Red': ('Rouge', 'أحمر'),
    'Pink': ('Rose', 'وردي'),
    'Blue': ('Bleu', 'أزرق'),
    'Brown': ('Brun', 'بني'),
    'African': ('Africain', 'أفريقي'),
    'Indian': ('Indien', 'هندي'),
    'Brazilian': ('Brésilien', 'برازيلي'),
    'Indonesian': ('Indonésien', 'إندونيسي'),
    'French': ('Français', 'فرنسي'),
    'Italian': ('Italien', 'إيطالي'),
    'Turkish': ('Turc', 'تركي'),
    'Egyptian': ('Égyptien', 'مصري'),
    'Japanese': ('Japonais', 'ياباني'),
    'Chinese': ('Chinois', 'صيني'),
    'Mexican': ('Mexicain', 'مكسيكي'),
    'Moroccan': ('Marocain', 'مغربي'),
    'Australian': ('Australien', 'أسترالي'),
    'Tunisian': ('Tunisien', 'تونسي'),
    'Sicilian': ('Sicilien', 'صقلي'),
    'Bourbon': ('Bourbon', 'بوربون'),
    'Sweet': ('Sucré', 'حلو'),
    'Bitter': ('Amer', 'مر'),
    'Sour': ('Aigre', 'حامض'),
    'Dried': ('Séché', 'مجفف'),
    'Roasted': ('Torréfié', 'محمص'),
    'Tropical': ('Tropical', 'استوائي'),
    'Exotic': ('Exotique', 'غريب'),
    'Oriental': ('Oriental', 'شرقي'),
    'Precious': ('Précieux', 'ثمين'),
    'Natural': ('Naturel', 'طبيعي'),
    'Fresh': ('Frais', 'منعش'),
    'Dry': ('Sec', 'جاف'),
    'Earthy': ('Terreux', 'ترابي'),
    'Floral': ('Floral', 'زهري'),
    'Gourmand': ('Gourmand', 'ذواقي'),
    'Spicy': ('Épicé', 'حار'),
    'Herbal Notes': ('Notes herbacées', 'نوتات عشبية'),
    'Whipped Cream': ('Crème fouettée', 'كريمة مخفوقة'),
    'Creme Brulee': ('Crème brûlée', 'كريم بروليه'),
    'Dark': ('Sombre', 'داكن'),
    'Star': ('Étoile', 'نجمة'),
    'Wild': ('Sauvage', 'بري'),
    'Sweet Pea': ('Pois de senteur', 'بازلاء الزهور'),
    'Papyrus': ('Papyrus', 'بردي'),
    'Tree': ('Arbre', 'شجرة'),
    'Palo Santo': ('Palo Santo', 'بالو سانتو'),
    'Cade': ('Cade', 'كاد'),
    'Buchu': ('Buchu', 'بوتشو'),
    'Agathosma': ('Agathosma', 'أغاثوسما'),
    'Liquidambar': ('Liquidambar', 'ليكيدامبار'),
    'Kola Nut': ('Noix de kola', 'جوزة الكولا'),
    'Palm Tree': ('Palmier', 'نخلة'),
    'Vinyl': ('Vinyle', 'فينيل'),
    'Maninka': ('Maninka', 'مانينكا'),
    'Massoia': ('Massoia', 'ماسويا'),
    
    # ───── MODIFIERS / ADJECTIVES ─────
    'Clary': ('Sclarée', 'متقزحة'),
    'Calabrian': ('Calabrais', 'كالابري'),
    'Virginia': ('Virginie', 'فرجينيا'),
    'Virginian': ('Virginien', 'فرجيني'),
    'Tahitian': ('Tahitien', 'تاهيتي'),
    'Tuscan': ('Toscan', 'توسكاني'),
    'Spanish': ('Espagnol', 'إسباني'),
    'Nigerian': ('Nigérian', 'نيجيري'),
    'Haitian': ('Haïtien', 'هايتي'),
    'Grasse': ('Grasse', 'غراس'),
    'Californian': ('Californien', 'كاليفورني'),
    'Ceylon': ('Ceylan', 'سيلاني'),
    'Siam': ('Siam', 'سيام'),
    'West': ('Ouest', 'غربي'),
    'Taif': ('Taëf', 'الطائف'),
    'Bulgarian': ('Bulgare', 'بلغاري'),
    'Damask': ('Damas', 'دمشقي'),
    'Madagascar': ('Madagascar', 'مدغشقر'),
    'Amalfi': ('Amalfi', 'أمالفي'),
    'Rangoon': ('Rangoun', 'رانغون'),
    'Big': ('Grand', 'كبير'),
    'Super': ('Super', 'سوبر'),
    'Iso': ('Iso', 'إيزو'),
    'Candied': ('Confit', 'مسكر'),
    'Whipped': ('Fouetté', 'مخفوق'),
    'CHOOSE': ('', ''),
    'Parma': ('Parme', 'بارما'),
    'Dulce': ('Douce', 'حلوة'),
    'Cactus': ('Cactus', 'صبار'),
    'cannabis': ('Cannabis', 'قنب'),
    'locust': ('Caroube', 'خروب'),
    'dark': ('Sombre', 'داكن'),
    'floral': ('Floral', 'زهري'),
    'cream': ('Crème', 'كريمة'),
    'water': ('Eau', 'ماء'),
    'oil': ('Huile', 'زيت'),
    'tree': ('Arbre', 'شجرة'),
    'woodsy': ('Boisé', 'خشبي'),
    'clary': ('Sclarée', 'متقزحة'),
    'balsam': ('Baume', 'بلسم'),
    'leche': ('Lait', 'حليب'),
    'Hip': ('Églantier', 'ورد بري'),
    'Husk': ('Balle', 'قشرة'),
    'Pod': ('Gousse', 'قرن'),
    'Candy': ('Bonbon', 'حلوى'),
    'Cupcake': ('Cupcake', 'كب كيك'),
    'Meringue': ('Meringue', 'مرنغ'),
    'Passion': ('Passion', 'شغف'),
    'Mai': ('Mai', 'مايو'),
    'Karo': ('Karo', 'كارو'),
    'Karounde': ('Karoundé', 'كاروندي'),
    'Calypsone': ('Calypsone', 'كاليبسون'),
    'Aquozone': ('Aquozone', 'أكوازون'),
    'Pitosporum': ('Pittosporum', 'بيتوسبوروم'),
    'Mahonia': ('Mahonia', 'ماهونيا'),
    'Mahonial': ('Mahonia', 'ماهونيا'),
    'Lentisque': ('Lentisque', 'مصطكي'),
    'Nympheal"': ('Nymphéal', 'نيمفيال'),
    'Ambermax"': ('Ambermax', 'أمبرماكس'),
    'Ambrofix"': ('Ambrofix', 'أمبروفيكس'),
    'Evernyl': ('Évernyl', 'إفرنيل'),
    'Petalia': ('Pétalia', 'بيتاليا'),
    'Camation': ('Œillet', 'قرنفل زهري'),
    'Caration': ('Œillet', 'قرنفل زهري'),
    '~Ginger': ('Gingembre', 'زنجبيل'),
    'Mallow)': ('Mauve', 'خبيزة'),
    '(Musk': ('Musc', 'مسك'),
    '(Oud)': ('Oud', 'عود'),
}

# Accord FR translations
ACCORD_FR_FIX = {
    "powdery musky": "Poudré musqué",
    "amber patchouli": "Ambre patchouli",
    "fruity sweet": "Fruité sucré",
    "lavender herbal": "Lavande herbacée",
    "tum": "Rhum",
}


def translate_note(note_en):
    """Get (FR, AR) translations for a note"""
    n = note_en.strip().rstrip('"').lstrip('~')
    if n in NOTE_TR:
        return NOTE_TR[n]
    # Case-insensitive fallback
    for key, val in NOTE_TR.items():
        if key.lower() == n.lower():
            return val
    return (n, n)  # untranslated


def split_and_translate(note_str):
    """
    For a note string, try to translate it directly.
    If it's not in the dictionary, try splitting into known notes.
    Returns list of (en, fr, ar) tuples.
    """
    note_str = note_str.strip()
    if not note_str or is_garbage(note_str):
        return []

    # Direct translation?
    fr, ar = translate_note(note_str)
    if fr != note_str:
        return [(note_str, fr, ar)]

    # Try greedy longest-match splitting
    known_keys = sorted(NOTE_TR.keys(), key=len, reverse=True)
    result = []
    remaining = note_str

    while remaining.strip():
        remaining = remaining.strip()
        found = False

        for key in known_keys:
            if remaining.startswith(key):
                rest = remaining[len(key):]
                # Make sure we match at word boundary
                if rest == '' or rest[0] == ' ':
                    fr_part, ar_part = NOTE_TR[key]
                    result.append((key, fr_part, ar_part))
                    remaining = rest.strip()
                    found = True
                    break

        if not found:
            # Take first word, try case-insensitive single-word match
            parts = remaining.split(None, 1)
            word = parts[0]
            wfr, war = translate_note(word)
            if not is_garbage(word) and len(word) > 1:
                result.append((word, wfr, war))
            remaining = parts[1] if len(parts) > 1 else ''

    return result if result else [(note_str, note_str, note_str)]


def process():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        products = json.load(f)

    stats = {'products': 0, 'notes_original': 0, 'notes_after': 0,
             'garbage_removed': 0, 'translated': 0, 'untranslated': 0}
    untranslated = set()

    for product in products:
        stats['products'] += 1

        # --- Clean and split pyramid notes ---
        new_pyramid = {}
        pyramid_fr = {}
        pyramid_ar = {}

        for level_key, notes in product.get('pyramid', {}).items():
            en_list = []
            fr_list = []
            ar_list = []

            for note in notes:
                note = note.strip()
                stats['notes_original'] += 1

                if is_garbage(note):
                    stats['garbage_removed'] += 1
                    continue

                parts = split_and_translate(note)
                for en, fr, ar in parts:
                    if en not in en_list:  # dedup
                        en_list.append(en)
                        fr_list.append(fr)
                        ar_list.append(ar)
                        stats['notes_after'] += 1

                        if fr == en:
                            untranslated.add(en)
                            stats['untranslated'] += 1
                        else:
                            stats['translated'] += 1

            new_pyramid[level_key] = en_list
            pyramid_fr[level_key] = fr_list
            pyramid_ar[level_key] = ar_list

        product['pyramid'] = new_pyramid
        product['pyramid_fr'] = pyramid_fr
        product['pyramid_ar'] = pyramid_ar

        # --- Fix accord labels in FR ---
        for accord in product.get('accords', []):
            label_en = accord.get('label_en', '').lower()
            if accord.get('label') == accord.get('label_en') or label_en in ACCORD_FR_FIX:
                fix = ACCORD_FR_FIX.get(label_en)
                if fix:
                    accord['label'] = fix

    # Save
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print("OLFATO HOUSE — Data Cleaning & Translation Report v2")
    print("=" * 60)
    print(f"Products: {stats['products']}")
    print(f"Original notes: {stats['notes_original']}")
    print(f"After split/clean: {stats['notes_after']}")
    print(f"Garbage removed: {stats['garbage_removed']}")
    print(f"Translated: {stats['translated']}")
    print(f"Untranslated: {stats['untranslated']}")

    if untranslated:
        print(f"\n⚠️  Still untranslated ({len(untranslated)}):")
        for n in sorted(untranslated):
            print(f"  - {n}")

    return products


if __name__ == '__main__':
    process()

