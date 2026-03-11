"""
OLFATO HOUSE — Description Processor
Reads descriptions from CSV, extracts concise summaries,
generates trilingual summaries (FR/EN/AR), and adds them to products.json.
"""
import csv
import json
import os
import re

BASE = r'c:\Users\AYB\Desktop\CATAL'
CSV_PATH = os.path.join(BASE, 'descriptions', 'notion_descriptions.csv')
PRODUCTS_PATH = os.path.join(BASE, 'site', 'data', 'products.json')

# ============================================
# GENRE TERMS
# ============================================
GENRE_TR = {
    'Homme': {'en': 'men', 'ar': 'رجالي'},
    'Femme': {'en': 'women', 'ar': 'نسائي'},
    'Unisex': {'en': 'unisex', 'ar': 'للجنسين'},
}

# ============================================
# ACCORD / FAMILY TRANSLATIONS
# ============================================
FAMILY_TR = {
    'boisé': {'en': 'woody', 'ar': 'خشبي'},
    'boisée': {'en': 'woody', 'ar': 'خشبي'},
    'floral': {'en': 'floral', 'ar': 'زهري'},
    'florale': {'en': 'floral', 'ar': 'زهري'},
    'oriental': {'en': 'oriental', 'ar': 'شرقي'},
    'orientale': {'en': 'oriental', 'ar': 'شرقي'},
    'fruité': {'en': 'fruity', 'ar': 'فاكهي'},
    'fruitée': {'en': 'fruity', 'ar': 'فاكهي'},
    'épicé': {'en': 'spicy', 'ar': 'حار'},
    'épicée': {'en': 'spicy', 'ar': 'حار'},
    'frais': {'en': 'fresh', 'ar': 'منعش'},
    'fraîche': {'en': 'fresh', 'ar': 'منعش'},
    'gourmand': {'en': 'gourmand', 'ar': 'ذواقي'},
    'gourmande': {'en': 'gourmand', 'ar': 'ذواقي'},
    'musqué': {'en': 'musky', 'ar': 'مسكي'},
    'musquée': {'en': 'musky', 'ar': 'مسكي'},
    'ambré': {'en': 'amber', 'ar': 'عنبري'},
    'ambrée': {'en': 'amber', 'ar': 'عنبري'},
    'poudré': {'en': 'powdery', 'ar': 'بودري'},
    'poudrée': {'en': 'powdery', 'ar': 'بودري'},
    'aquatique': {'en': 'aquatic', 'ar': 'مائي'},
    'cuiré': {'en': 'leather', 'ar': 'جلدي'},
    'cuirée': {'en': 'leather', 'ar': 'جلدي'},
    'vert': {'en': 'green', 'ar': 'أخضر'},
    'verte': {'en': 'green', 'ar': 'أخضر'},
    'sensuel': {'en': 'sensual', 'ar': 'حسي'},
    'sensuelle': {'en': 'sensual', 'ar': 'حسي'},
    'élégant': {'en': 'elegant', 'ar': 'أنيق'},
    'élégante': {'en': 'elegant', 'ar': 'أنيق'},
    'sophistiqué': {'en': 'sophisticated', 'ar': 'راقي'},
    'sophistiquée': {'en': 'sophisticated', 'ar': 'راقي'},
    'envoutant': {'en': 'captivating', 'ar': 'آسر'},
    'envoutante': {'en': 'captivating', 'ar': 'آسر'},
    'envoûtant': {'en': 'captivating', 'ar': 'آسر'},
    'envoûtante': {'en': 'captivating', 'ar': 'آسر'},
    'mystérieux': {'en': 'mysterious', 'ar': 'غامض'},
    'mystérieuse': {'en': 'mysterious', 'ar': 'غامض'},
    'intense': {'en': 'intense', 'ar': 'كثيف'},
    'puissant': {'en': 'powerful', 'ar': 'قوي'},
    'puissante': {'en': 'powerful', 'ar': 'قوي'},
    'subtil': {'en': 'subtle', 'ar': 'رقيق'},
    'subtile': {'en': 'subtle', 'ar': 'رقيق'},
    'lumineux': {'en': 'luminous', 'ar': 'مشرق'},
    'lumineuse': {'en': 'luminous', 'ar': 'مشرق'},
    'chaleureux': {'en': 'warm', 'ar': 'دافئ'},
    'chaleureuse': {'en': 'warm', 'ar': 'دافئ'},
    'raffiné': {'en': 'refined', 'ar': 'منقح'},
    'raffinée': {'en': 'refined', 'ar': 'منقح'},
    'doux': {'en': 'soft', 'ar': 'ناعم'},
    'douce': {'en': 'soft', 'ar': 'ناعم'},
    'sucré': {'en': 'sweet', 'ar': 'حلو'},
    'sucrée': {'en': 'sweet', 'ar': 'حلو'},
    'romantique': {'en': 'romantic', 'ar': 'رومانسي'},
    'audacieux': {'en': 'bold', 'ar': 'جريء'},
    'audacieuse': {'en': 'bold', 'ar': 'جريء'},
    'vibrant': {'en': 'vibrant', 'ar': 'نابض'},
    'vibrante': {'en': 'vibrant', 'ar': 'نابض'},
    'moderne': {'en': 'modern', 'ar': 'عصري'},
    'classique': {'en': 'classic', 'ar': 'كلاسيكي'},
    'captivant': {'en': 'captivating', 'ar': 'آسر'},
    'captivante': {'en': 'captivating', 'ar': 'آسر'},
    'séduisant': {'en': 'seductive', 'ar': 'فاتن'},
    'séduisante': {'en': 'seductive', 'ar': 'فاتن'},
    'addictif': {'en': 'addictive', 'ar': 'إدماني'},
    'addictive': {'en': 'addictive', 'ar': 'إدماني'},
    'magnétique': {'en': 'magnetic', 'ar': 'مغناطيسي'},
    'luxueux': {'en': 'luxurious', 'ar': 'فاخر'},
    'luxueuse': {'en': 'luxurious', 'ar': 'فاخر'},
    'hypnotique': {'en': 'hypnotic', 'ar': 'ساحر'},
    'irrésistible': {'en': 'irresistible', 'ar': 'لا يقاوم'},
    'charismatique': {'en': 'charismatic', 'ar': 'كاريزمي'},
    'nocturne': {'en': 'nocturnal', 'ar': 'ليلي'},
    'solaire': {'en': 'solar', 'ar': 'شمسي'},
    'intemporel': {'en': 'timeless', 'ar': 'خالد'},
    'intemporelle': {'en': 'timeless', 'ar': 'خالد'},
    'exotique': {'en': 'exotic', 'ar': 'غريب'},
    'aromatique': {'en': 'aromatic', 'ar': 'عطري'},
    'hespéridé': {'en': 'citrusy', 'ar': 'حمضي'},
    'hespéridée': {'en': 'citrusy', 'ar': 'حمضي'},
    'citronné': {'en': 'citrusy', 'ar': 'حمضي'},
    'citronnée': {'en': 'citrusy', 'ar': 'حمضي'},
    'fougère': {'en': 'fern-like', 'ar': 'سرخسي'},
    'pétillant': {'en': 'sparkling', 'ar': 'فوار'},
    'pétillante': {'en': 'sparkling', 'ar': 'فوار'},
    'délicat': {'en': 'delicate', 'ar': 'رقيق'},
    'délicate': {'en': 'delicate', 'ar': 'رقيق'},
    'terreux': {'en': 'earthy', 'ar': 'ترابي'},
    'fumé': {'en': 'smoky', 'ar': 'مدخن'},
    'fumée': {'en': 'smoky', 'ar': 'مدخن'},
}

# ============================================
# OCCASION / WHEN TO WEAR
# ============================================
OCCASION_TR = {
    'quotidien': {'en': 'everyday wear', 'ar': 'للاستخدام اليومي'},
    'soirée': {'en': 'evening events', 'ar': 'للسهرات'},
    'travail': {'en': 'work', 'ar': 'للعمل'},
    'bureau': {'en': 'office', 'ar': 'للمكتب'},
    'été': {'en': 'summer', 'ar': 'للصيف'},
    'hiver': {'en': 'winter', 'ar': 'للشتاء'},
    'printemps': {'en': 'spring', 'ar': 'للربيع'},
    'automne': {'en': 'autumn', 'ar': 'للخريف'},
    'nuit': {'en': 'night', 'ar': 'ليلي'},
    'jour': {'en': 'daytime', 'ar': 'نهاري'},
    'rendez-vous': {'en': 'date nights', 'ar': 'للمواعيد'},
    'occasion spéciale': {'en': 'special occasions', 'ar': 'للمناسبات الخاصة'},
}

# ============================================
# SEASON TERMS
# ============================================
SEASON_TR = {
    'printemps': {'en': 'spring', 'ar': 'الربيع'},
    'été': {'en': 'summer', 'ar': 'الصيف'},
    'automne': {'en': 'autumn', 'ar': 'الخريف'},
    'hiver': {'en': 'winter', 'ar': 'الشتاء'},
}


def extract_summary_from_description(desc_text, product_name):
    """
    Extract a meaningful summary paragraph from the markdown description.
    Strategy: find descriptive sentences that characterize the perfume.
    """
    lines = desc_text.split('\n')
    
    # Collect candidate sentences
    candidates = []
    for line in lines:
        line = line.strip()
        # Skip headers, bullets, structured data
        if not line or line.startswith('#') or line.startswith('-') or line.startswith('*'):
            continue
        if line.startswith('Marque') or line.startswith('Réf') or line.startswith('Genre'):
            continue
        if line.startswith('**') and line.endswith('**'):
            continue
        # Keep prose sentences (>50 chars, no structured format)
        if len(line) > 50 and ':' not in line[:25]:
            candidates.append(line)
    
    if not candidates:
        # Fallback: try to find any sentences > 30 chars
        for line in lines:
            line = line.strip()
            if len(line) > 30 and not line.startswith('#') and not line.startswith('-'):
                candidates.append(line)
    
    if not candidates:
        return None
    
    # Take the best candidates (first 2-3 descriptive sentences)
    summary_parts = []
    total_len = 0
    for c in candidates:
        if total_len > 400:
            break
        # Clean up markdown formatting
        c = re.sub(r'\*\*([^*]+)\*\*', r'\1', c)
        c = re.sub(r'\*([^*]+)\*', r'\1', c)
        c = c.strip()
        if c:
            summary_parts.append(c)
            total_len += len(c)
    
    if summary_parts:
        summary = ' '.join(summary_parts)
        # Truncate to ~2-3 sentences if too long
        sentences = re.split(r'(?<=[.!?])\s+', summary)
        result = []
        length = 0
        for s in sentences:
            if length > 350:
                break
            result.append(s)
            length += len(s)
        return ' '.join(result)
    
    return None


def translate_summary_to_english(fr_summary, product_name, product_data):
    """
    Generate an English summary from the French one.
    Uses keyword replacement and pattern-based translation.
    """
    if not fr_summary:
        return None
    
    # Build a template-based English description from product data
    accords = product_data.get('accords', [])
    pyramid = product_data.get('pyramid', {})
    genre = product_data.get('genre', '')
    inspiration = product_data.get('inspiration', '')
    
    # Extract key adjectives from the French text
    adjectives_en = []
    for word, tr in FAMILY_TR.items():
        if word.lower() in fr_summary.lower():
            if tr['en'] not in adjectives_en:
                adjectives_en.append(tr['en'])
    
    # Get top accords
    accord_names = []
    if accords:
        for a in accords[:3]:
            accord_names.append(a.get('label_en', a.get('label', '')))
    
    # Get top notes
    top_notes = []
    for key in ['Notes de tête', 'Notes de cœur']:
        notes = pyramid.get(key, [])
        top_notes.extend(notes[:2])
    
    # Build English summary
    genre_en = GENRE_TR.get(genre, {}).get('en', 'unisex')
    
    parts = []
    
    # Opening
    if adjectives_en:
        adj_str = ', '.join(adjectives_en[:3])
        parts.append(f"{product_name} is a {adj_str} fragrance for {genre_en}, inspired by {inspiration}.")
    else:
        parts.append(f"{product_name} is an exquisite fragrance for {genre_en}, inspired by {inspiration}.")
    
    # Accords
    if accord_names:
        parts.append(f"Its main accords feature {', '.join(accord_names[:3])} notes.")
    
    # Key notes
    if top_notes:
        parts.append(f"The composition opens with {', '.join(top_notes[:3])}")
        base_notes = pyramid.get('Notes de fond', [])[:3]
        if base_notes:
            parts[-1] += f" and settles on a base of {', '.join(base_notes)}."
        else:
            parts[-1] += "."
    
    return ' '.join(parts)


def translate_summary_to_arabic(fr_summary, product_name, product_data):
    """
    Generate an Arabic summary from the French one.
    """
    if not fr_summary:
        return None
    
    accords = product_data.get('accords', [])
    pyramid = product_data.get('pyramid', {})
    pyramid_ar = product_data.get('pyramid_ar', {})
    genre = product_data.get('genre', '')
    inspiration = product_data.get('inspiration', '')
    
    # Extract adjectives in Arabic
    adjectives_ar = []
    for word, tr in FAMILY_TR.items():
        if word.lower() in fr_summary.lower():
            if tr['ar'] not in adjectives_ar:
                adjectives_ar.append(tr['ar'])
    
    # Get Arabic accord names
    accord_names_ar = []
    if accords:
        for a in accords[:3]:
            accord_names_ar.append(a.get('label_ar', a.get('label_en', '')))
    
    # Get Arabic top notes
    top_notes_ar = []
    for key in ['Notes de tête', 'Notes de cœur']:
        notes = pyramid_ar.get(key, [])
        top_notes_ar.extend(notes[:2])
    
    genre_ar = GENRE_TR.get(genre, {}).get('ar', 'للجنسين')
    
    parts = []
    
    # Opening
    if adjectives_ar:
        adj_str = '، '.join(adjectives_ar[:3])
        parts.append(f"{product_name} عطر {adj_str} {genre_ar}، مستوحى من {inspiration}.")
    else:
        parts.append(f"{product_name} عطر فاخر {genre_ar}، مستوحى من {inspiration}.")
    
    # Accords
    if accord_names_ar:
        parts.append(f"يتميز بأكورد {' و'.join(accord_names_ar[:3])}.")
    
    # Key notes
    if top_notes_ar:
        parts.append(f"يفتتح بنوتات {'، '.join(top_notes_ar[:3])}")
        base_notes = pyramid_ar.get('Notes de fond', [])[:3]
        if base_notes:
            parts[-1] += f" ويستقر على قاعدة من {'، '.join(base_notes)}."
        else:
            parts[-1] += "."
    
    return ' '.join(parts)


def process():
    # Load products
    with open(PRODUCTS_PATH, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    # Build lookup by name
    product_by_name = {}
    for p in products:
        product_by_name[p['nom'].lower().strip()] = p
    
    # Load descriptions CSV
    descriptions = {}
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['Nom du Parfum'].strip()
            desc = row['Description'].strip()
            if name and desc:
                descriptions[name.lower()] = (name, desc)
    
    matched = 0
    unmatched = 0
    no_summary = 0
    
    for product in products:
        name_lower = product['nom'].lower().strip()
        
        if name_lower in descriptions:
            orig_name, desc_text = descriptions[name_lower]
            
            # Extract French summary
            fr_summary = extract_summary_from_description(desc_text, product['nom'])
            
            if fr_summary:
                product['description_fr'] = fr_summary
                product['description_en'] = translate_summary_to_english(
                    fr_summary, product['nom'], product
                )
                product['description_ar'] = translate_summary_to_arabic(
                    fr_summary, product['nom'], product
                )
                matched += 1
            else:
                no_summary += 1
        else:
            unmatched += 1
    
    # Save updated products
    with open(PRODUCTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print("OLFATO HOUSE — Description Processing Report")
    print("=" * 60)
    print(f"Total products: {len(products)}")
    print(f"Descriptions in CSV: {len(descriptions)}")
    print(f"Matched & summarized: {matched}")
    print(f"No summary extracted: {no_summary}")
    print(f"Unmatched products: {unmatched}")
    
    # List unmatched
    if unmatched > 0:
        unmatched_list = [p['nom'] for p in products if 'description_fr' not in p]
        if unmatched_list:
            print(f"\nUnmatched products ({len(unmatched_list)}):")
            for name in sorted(unmatched_list)[:20]:
                print(f"  - {name}")
            if len(unmatched_list) > 20:
                print(f"  ... and {len(unmatched_list) - 20} more")


if __name__ == '__main__':
    process()
