import csv
import json
import os
import glob

BASE_DIR = r"c:\Users\AYB\Desktop\CATAL"
CSV_PATH = os.path.join(BASE_DIR, "Final_List_V2.csv")
JSON_DIR = os.path.join(BASE_DIR, "json_all")
OUTPUT_PATH = os.path.join(BASE_DIR, "site", "data", "products.json")

# Translation map for accords and notes
TRANSLATE = {
    # Accords
    "citrus": "Agrumes", "aromatic": "Aromatique", "marine": "Marin",
    "fresh spicy": "Épicé frais", "floral": "Floral", "woody": "Boisé",
    "fresh": "Frais", "sweet": "Sucré", "warm spicy": "Épicé chaud",
    "musky": "Musqué", "powdery": "Poudré", "fruity": "Fruité",
    "amber": "Ambré", "vanilla": "Vanillé", "green": "Vert",
    "tropical": "Tropical", "coconut": "Noix de coco", "soft spicy": "Épicé doux",
    "balsamic": "Balsamique", "leather": "Cuir", "oud": "Oud",
    "rose": "Rose", "mossy": "Moussu", "smoky": "Fumé",
    "earthy": "Terreux", "animalic": "Animal", "patchouli": "Patchouli",
    "herbal": "Herbacé", "white floral": "Floral blanc", "aquatic": "Aquatique",
    "creamy": "Crémeux", "tobacco": "Tabac", "cacao": "Cacao",
    "gourmand": "Gourmand", "ozonic": "Ozonique", "salty": "Salé",
    "nutty": "Noisette", "aldehydic": "Aldéhydé", "honey": "Miel",
    "lactonic": "Lactonique", "synthetic": "Synthétique", "airy": "Aérien",
    "caramel": "Caramel", "coffee": "Café", "metallic": "Métallique",
    "rum": "Rhum", "cherry": "Cerise", "lavender": "Lavande",
    "cinnamon": "Cannelle", "soapy": "Savonneux", "iris": "Iris",
    "mineral": "Minéral", "violet": "Violette", "tuberose": "Tubéreuse",
    # Seasons/times
    "winter": "Hiver", "spring": "Printemps", "summer": "Été",
    "fall": "Automne", "day": "Jour", "night": "Nuit",
    # Pyramid notes
    "top_notes": "Notes de tête", "middle_notes": "Notes de cœur", "base_notes": "Notes de fond"
}

def translate(text):
    return TRANSLATE.get(text.lower(), text.capitalize())

def find_json_file(sku, suffix):
    """Find JSON file by SKU and suffix within json_all directory"""
    pattern = os.path.join(JSON_DIR, "**", f"{sku}_{suffix}.json")
    files = glob.glob(pattern, recursive=True)
    if files:
        return files[0]
    return None

def load_json(path):
    if path and os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

# Map Genre values
GENRE_MAP = {
    "Homme": "Homme",
    "Femme": "Femme",
    "Unisex": "Unisex",
    "Orientaux": "Unisex"  # Orientaux mapped to Unisex for category filtering
}

products = []

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row['SKU'].strip()
        ref = row['Ref_Supp'].strip()
        genre = row['Genre'].strip()
        inspiration = row['Inspiration'].strip()
        nom = row['Nom du Parfum'].strip()
        
        # Load JSON data
        main_accords_data = load_json(find_json_file(sku, "Main_Accords"))
        when_to_wear_data = load_json(find_json_file(sku, "When_To_Wear"))
        pyramid_data = load_json(find_json_file(sku, "Perfume_Pyramid"))
        
        # Process main accords
        accords = []
        if main_accords_data and "main_accords" in main_accords_data:
            for acc in main_accords_data["main_accords"]:
                accords.append({
                    "label": translate(acc["label"]),
                    "label_en": acc["label"],
                    "color": acc["hex_color"],
                    "percentage": acc["percentage"]
                })
        
        # Process when to wear
        seasons = {}
        daytime = {}
        if when_to_wear_data and "when_to_wear" in when_to_wear_data:
            for item in when_to_wear_data["when_to_wear"]:
                s = item["season"]
                if s in ["winter", "spring", "summer", "fall"]:
                    seasons[translate(s)] = item["percentage"]
                elif s in ["day", "night"]:
                    daytime[translate(s)] = item["percentage"]
        
        # Process pyramid
        pyramid = {}
        if pyramid_data and "perfume_pyramid" in pyramid_data:
            pd = pyramid_data["perfume_pyramid"]
            for key in ["top_notes", "middle_notes", "base_notes"]:
                if key in pd:
                    pyramid[translate(key)] = pd[key]
        
        product = {
            "sku": sku,
            "ref": ref,
            "genre": GENRE_MAP.get(genre, genre),
            "genre_original": genre,
            "inspiration": inspiration,
            "nom": nom,
            "image": f"Photos_VF/{ref}.avif",
            "accords": accords,
            "seasons": seasons,
            "daytime": daytime,
            "pyramid": pyramid,
        }
        
        products.append(product)

# Sort by name
products.sort(key=lambda x: x['nom'])

# Ensure output directory exists
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"✅ {len(products)} products exported to {OUTPUT_PATH}")
