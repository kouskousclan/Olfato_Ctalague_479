/* ============================================
   L'ARTISTE PARFUM â€” Catalogue App (i18n)
   ============================================ */

const SUPABASE_URL = 'https://mkomrppcdrgbpfybrfyu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rb21ycHBjZHJnYnBmeWJyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODQ2MzUsImV4cCI6MjA4ODc2MDYzNX0.DXJvMb2eX7Cg_FvKW-NyodaDCsLREfY_V4H5Q-IsBaI';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const NOTES_IMG_PATH = `${SUPABASE_URL}/storage/v1/object/public/notes/`;
const PRODUCTS_PER_PAGE = 30;
const SHOW_PRODUCT_DESCRIPTION = false;

let STORE_SETTINGS = {
    whatsapp_number: '212777885769',
    currency: 'MAD',
    store_name: "L'artiste Parfum"
};

let allProducts = [];
let filteredProducts = [];
let currentFilter = 'all';
let currentPage = 0;
let searchTimeout = null;

// ============================================
// UTILS
// ============================================
/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 * @param {Array} array
 * @returns {Array}
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function normalizePeriodKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// ============================================
// DATA LOADING
// ============================================
function applyStoreSettings(settingsData) {
    if (!settingsData) return;
    if (Array.isArray(settingsData)) {
        settingsData.forEach(s => { STORE_SETTINGS[s.key] = s.value; });
    } else {
        Object.assign(STORE_SETTINGS, settingsData);
    }

    const waFloat = document.getElementById('whatsapp-float');
    if (waFloat) {
        const text = encodeURIComponent(`Bonjour, je souhaite commander un parfum ${STORE_SETTINGS.store_name}`);
        waFloat.href = `https://wa.me/${STORE_SETTINGS.whatsapp_number}?text=${text}`;
    }
    document.title = `${STORE_SETTINGS.store_name} - Catalogue de Parfums`;
}

function isLocalDbDevHost() {
    return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
}

async function loadProductsFromLocalDbIfAvailable() {
    if (!isLocalDbDevHost()) return false;

    try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) return false;

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.products)) return false;

        applyStoreSettings(payload.settings);
        allProducts = payload.products;
        shuffleArray(allProducts);

        filteredProducts = [...allProducts];
        updateCatalog();
        updateProductCount();
        console.info(`Loaded ${allProducts.length} products from local SQLite database.`);
        return true;
    } catch (error) {
        console.info('Local SQLite API unavailable; falling back to Supabase.', error);
        return false;
    }
}

/**
 * Fetch all products from Supabase, transform the relational data
 * into the flat structure expected by the UI, then render the catalog.
 * @returns {Promise<void>}
 */
async function loadProducts() {
    try {
        if (await loadProductsFromLocalDbIfAvailable()) return;
        if (!supabaseClient) throw new Error('Supabase client unavailable and local SQLite API not available.');

        // Load store settings first
        const { data: settingsData } = await supabaseClient.from('store_settings').select('*');
        if (settingsData) {
            settingsData.forEach(s => { STORE_SETTINGS[s.key] = s.value; });
            
            // Update WA Float
            const waFloat = document.getElementById('whatsapp-float');
            if (waFloat) {
                const text = encodeURIComponent(`Bonjour, je souhaite commander un parfum ${STORE_SETTINGS.store_name}`);
                waFloat.href = `https://wa.me/${STORE_SETTINGS.whatsapp_number}?text=${text}`;
            }
            // Update title
            document.title = `${STORE_SETTINGS.store_name} â€” Catalogue de Parfums`;
        }

        const { data: dbProducts, error } = await supabaseClient
            .from('products')
            .select(`
                *,
                product_accords(
                    percentage,
                    sort_order,
                    accords (label_en, label_fr, label_ar, hex_color)
                ),
                product_wear_times(
                    percentage,
                    periods (period_en, period_fr)
                ),
                product_notes(
                    level,
                    sort_order,
                    notes (note_name_en, note_name_fr, note_name_ar)
                )
            `)
            .order('id')
            .limit(1000); // Fetch all products
            
        if (error) throw error;
        
        // Transform the DB relational structure back to what the UI logic expects
        allProducts = dbProducts.map(p => {
            const accordsData = (p.product_accords || []).sort((a,b) => a.sort_order - b.sort_order);
            const notesData = (p.product_notes || []).sort((a,b) => a.sort_order - b.sort_order);
            
            // Ensure product image points to Supabase public bucket
            let imageUrl = '';
            if (p.image_path) {
                // If the path contains "Photos_VF/", strip it since we uploaded directly to the 'products' bucket
                const cleanPath = p.image_path.replace(/^Photos_VF\//, '');
                imageUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${cleanPath}`;
            }
            
            const pObj = {
                sku: p.sku,
                ref: p.ref_supp,
                genre: p.genre,
                genre_original: p.genre_original,
                inspiration: p.inspiration,
                nom: p.nom,
                image: imageUrl,
                accords: accordsData.map(a => {
                    const acc = a.accords || {};
                    return {
                        label_en: acc.label_en || '',
                        label: acc.label_fr || '',
                        color: acc.hex_color || '#cccccc',
                        percentage: a.percentage || 0
                    };
                }),
                seasons: {},
                daytime: {},
                pyramid: {},
                pyramid_fr: {},
                pyramid_ar: {}
            };
            
            // Reconstruct Periods (Seasons & Day/Night) â€” tolÃ¨re clÃ©s EN et FR
            const seasonReverseMap = {
                winter: 'Hiver',
                spring: 'Printemps',
                summer: 'Été',
                fall: 'Automne',
                hiver: 'Hiver',
                printemps: 'Printemps',
                ete: 'Été',
                automne: 'Automne'
            };
            const dayReverseMap = {
                day: 'Jour',
                night: 'Nuit',
                jour: 'Jour',
                nuit: 'Nuit'
            };

            (p.product_wear_times || []).forEach(w => {
                const perObj = w.periods;
                if (!perObj) return;
                const pct = Number(w.percentage) || 0;
                [perObj.period_en, perObj.period_fr].forEach(rawKey => {
                    const key = normalizePeriodKey(rawKey);
                    if (seasonReverseMap[key]) pObj.seasons[seasonReverseMap[key]] = pct;
                    if (dayReverseMap[key]) pObj.daytime[dayReverseMap[key]] = pct;
                });
            });
            
            // Reconstruct Pyramids with all 3 languages
            const pyramidReverseMap = { 'top': 'Notes de tÃªte', 'middle': 'Notes de cÅ“ur', 'base': 'Notes de fond' };
            notesData.forEach(n => {
                const frKey = pyramidReverseMap[n.level];
                const noteObj = n.notes;
                
                if (frKey && noteObj) {
                    // English (Fallback + Base array)
                    if (!pObj.pyramid[frKey]) pObj.pyramid[frKey] = [];
                    pObj.pyramid[frKey].push(noteObj.note_name_en);
                    
                    // French
                    if (!pObj.pyramid_fr[frKey]) pObj.pyramid_fr[frKey] = [];
                    pObj.pyramid_fr[frKey].push(noteObj.note_name_fr || noteObj.note_name_en);
                    
                    // Arabic
                    if (!pObj.pyramid_ar[frKey]) pObj.pyramid_ar[frKey] = [];
                    pObj.pyramid_ar[frKey].push(noteObj.note_name_ar || noteObj.note_name_en);
                }
            });
            
            return pObj;
        });
        
        // Randomize initial order
        shuffleArray(allProducts);
        
        filteredProducts = [...allProducts];
        updateCatalog();
        updateProductCount();
    } catch (e) {
        console.error('Failed to load products from Supabase:', e);
        alert('Erreur chargement Supabase: ' + e.message);
    }
}

// ============================================
// FILTERING
// ============================================
/**
 * Filter the catalog by genre and re-render.
 * @param {'all'|'Homme'|'Femme'|'Unisex'} genre
 */
function applyFilter(genre) {
    currentFilter = genre;
    currentPage = 0;

    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.filter === genre);
    });

    if (genre === 'all') {
        filteredProducts = [...allProducts];
        shuffleArray(filteredProducts); // Re-shuffle all for a fresh view
    } else {
        filteredProducts = allProducts.filter(p => p.genre === genre);
        shuffleArray(filteredProducts); // Shuffle the category specifically
    }

    // Reset catalog title to translated default
    document.getElementById('catalog-title').textContent = t('collection_title');

    updateCatalog();
    updateProductCount();

    const catalog = document.getElementById('catalog');
    catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Update the visible product count label. */
function updateProductCount() {
    const el = document.getElementById('product-count');
    el.textContent = tCount(filteredProducts.length);
}

// ============================================
// CATALOG RENDERING
// ============================================
/** Clear the product grid and render the first page of filteredProducts. */
function updateCatalog() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    currentPage = 0;
    renderPage();
}

/** Append the next page of product cards to the grid and update the "load more" button. */
function renderPage() {
    const grid = document.getElementById('product-grid');
    const start = currentPage * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    const slice = filteredProducts.slice(start, end);

    slice.forEach((product, idx) => {
        const card = createProductCard(product, start + idx);
        grid.appendChild(card);
    });

    const btn = document.getElementById('load-more-btn');
    const container = document.getElementById('load-more-container');
    if (end >= filteredProducts.length) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        const remaining = filteredProducts.length - end;
        btn.textContent = `${t('load_more')} (${t('remaining', { count: remaining })})`;
    }

    currentPage++;
}

/**
 * Build and return a button element representing a product card.
 * @param {object} product - Product data object
 * @param {number} index - Position index used for staggered animation delay
 * @returns {HTMLButtonElement}
 */
function createProductCard(product, index) {
    const card = document.createElement('button');
    card.className = 'product-card';
    card.type = 'button';
    card.setAttribute('aria-label', `Voir ${product.nom} â€” ${product.inspiration}`);
    card.style.animationDelay = `${(index % PRODUCTS_PER_PAGE) * 0.04}s`;
    card.onclick = () => openProductModal(product);

    let accordsHtml = '';
    if (product.accords && product.accords.length > 0) {
        const topAccords = product.accords.slice(0, 5);
        accordsHtml = '<div class="product-card-accords">' +
            topAccords.map(a => `<span style="background:${a.color};width:${a.percentage}%"></span>`).join('') +
            '</div>';
    }

    card.innerHTML = `
    <div class="product-card-img">
      <img src="${product.image}" alt="${product.nom} â€” Parfum ${product.genre} au Maroc | L'artiste Parfum" loading="lazy" decoding="async" onerror="this.style.display='none'">
      <span class="product-card-genre" data-genre="${product.genre}">${tGenre(product.genre)}</span>
      <button class="card-add-cart-btn" aria-label="${t('add_to_cart')}" onclick="event.stopPropagation(); addToCart('${product.sku}', '${product.nom.replace(/'/g, "\\'")}', '${product.image}', 50, 79);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"></path></svg>
      </button>
    </div>
    <div class="product-card-info">
      <div class="product-card-name" title="${product.nom}">${product.nom}</div>
      <div class="product-card-brand">${product.inspiration}</div>
      ${accordsHtml}
    </div>
  `;

    return card;
}

// ============================================
// SEARCH
// ============================================
/**
 * Score and rank all products against the search query.
 * Returns products sorted by relevance (name > brand > accords > notes).
 * @param {string} query
 * @returns {object[]}
 */
function getSearchResults(query) {
    if (!query || query.length < 2) return [];
    
    const terms = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return [];

    return allProducts.map(p => {
        const name = p.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const brand = p.inspiration.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const accords = (p.accords || []).map(a => {
            const translated = tAccord(a.label_en) || '';
            return (a.label_en + ' ' + translated).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }).join(' ');

        let notesArr = [];
        const lang = currentLang || 'fr';
        let displayPyramid;
        if (lang === 'ar' && p.pyramid_ar) displayPyramid = p.pyramid_ar;
        else if (lang === 'fr' && p.pyramid_fr) displayPyramid = p.pyramid_fr;
        else displayPyramid = p.pyramid;

        if (displayPyramid) {
            Object.values(displayPyramid).forEach(arr => {
                if (Array.isArray(arr)) notesArr.push(...arr);
            });
        }
        if (p.pyramid) {
             Object.values(p.pyramid).forEach(arr => {
                if (Array.isArray(arr)) notesArr.push(...arr);
            });
        }
        const notesStr = notesArr.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let descStr = [p.description_fr, p.description_en, p.description_ar].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const fullText = (name + ' ' + brand + ' ' + accords + ' ' + notesStr + ' ' + descStr);
        
        let score = 0;
        let matchesAll = true;
        
        for (const term of terms) {
            if (fullText.includes(term)) {
                score += 1;
                if (name.includes(term) || name === term) score += 5;
                if (brand.includes(term) || brand === term) score += 3;
            } else {
                matchesAll = false;
                break;
            }
        }
        
        return { product: p, score: matchesAll ? score : 0 };
    }).filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.product);
}

/**
 * Return the top 8 search results for the autocomplete dropdown.
 * @param {string} query
 * @returns {object[]}
 */
function searchProducts(query) {
    return getSearchResults(query).slice(0, 8);
}

function renderSearchDropdown(results, dropdownEl, query) {
    if (results.length === 0) {
        if (query && query.length >= 2) {
            dropdownEl.innerHTML = `<div class="search-dropdown-item no-results" style="justify-content:center; color:var(--color-text-dim); padding: 1rem;">${t('no_results')}</div>`;
            dropdownEl.classList.remove('hidden');
        } else {
            dropdownEl.classList.add('hidden');
        }
        return;
    }

    let html = results.map(p => `
    <div class="search-dropdown-item" data-sku="${p.sku}">
      <img src="${p.image}" alt="${p.nom}" loading="lazy" decoding="async" onerror="this.style.display='none'">
      <div class="sdi-info">
        <div class="sdi-name">${p.nom}</div>
        <div class="sdi-brand">${p.inspiration}</div>
      </div>
      <span class="sdi-genre" data-genre="${p.genre}">${tGenre(p.genre)}</span>
    </div>
  `).join('');

    // Add "Afficher tout" button
    html += `
    <div class="search-dropdown-item show-all-btn" style="justify-content:center; color:var(--color-accent); font-weight:600; padding:1rem; border-top:1px solid var(--color-border); text-align:center;">
        ${t('show_all')}
    </div>
    `;

    dropdownEl.innerHTML = html;
    dropdownEl.classList.remove('hidden');

    dropdownEl.querySelectorAll('.search-dropdown-item:not(.no-results):not(.show-all-btn)').forEach(item => {
        item.addEventListener('click', () => {
            const product = allProducts.find(p => p.sku === item.dataset.sku);
            if (product) {
                openProductModal(product);
                dropdownEl.classList.add('hidden');
            }
        });
    });

    const showAllBtn = dropdownEl.querySelector('.show-all-btn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            performFullSearch(query);
        });
    }
}

function setupSearch(inputEl, dropdownEl, clearBtnEl, searchBtnEl) {
    inputEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        
        const query = inputEl.value.trim();
        if (clearBtnEl) {
            if (query.length > 0) clearBtnEl.classList.remove('hidden');
            else clearBtnEl.classList.add('hidden');
        }

        searchTimeout = setTimeout(() => {
            const results = searchProducts(query);
            renderSearchDropdown(results, dropdownEl, query);
        }, 200);
    });

    inputEl.addEventListener('focus', () => {
        const query = inputEl.value.trim();
        if (clearBtnEl && query.length > 0) clearBtnEl.classList.remove('hidden');
        
        if (query.length >= 2) {
            const results = searchProducts(query);
            renderSearchDropdown(results, dropdownEl, query);
        }
    });

    if (clearBtnEl) {
        clearBtnEl.addEventListener('click', () => {
            inputEl.value = '';
            clearBtnEl.classList.add('hidden');
            dropdownEl.classList.add('hidden');
            inputEl.focus();
        });
    }

    if (searchBtnEl) {
        searchBtnEl.addEventListener('click', () => {
            performFullSearch(inputEl.value);
        });
    }

    document.addEventListener('click', (e) => {
        const isInput = inputEl.contains(e.target);
        const isDropdown = dropdownEl && dropdownEl.contains(e.target);
        const isClear = clearBtnEl && clearBtnEl.contains(e.target);
        const isSubmit = searchBtnEl && searchBtnEl.contains(e.target);
        if (!isInput && !isDropdown && !isClear && !isSubmit) {
            dropdownEl.classList.add('hidden');
        }
    });
}

/**
 * Run a full-catalog search and update the grid with results.
 * Resets the active filter and scrolls to the catalog section.
 * @param {string} query
 */
function performFullSearch(query) {
    query = query.trim();
    if (query.length >= 2) {
        filteredProducts = getSearchResults(query);
        currentFilter = 'all';
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        updateCatalog();
        updateProductCount();
        document.getElementById('catalog-title').textContent = t('results_for', { query });
        document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        
        // Hide dropdowns UI
        document.getElementById('hero-search-dropdown').classList.add('hidden');
        document.getElementById('search-dropdown').classList.add('hidden');
        // Clear input focus to hide keyboard on mobile
        document.activeElement.blur();
    }
}

// ============================================
// PRODUCT MODAL (Product Page)
// ============================================
let isModalOpen = false;
let lastFocusedElement = null;

/** Hide all body-level siblings of the modal from assistive technologies. */
function hideBackgroundFromAT() {
    document.querySelectorAll('body > *').forEach(el => {
        if (el.id !== 'product-modal' && el.tagName !== 'SCRIPT') {
            el.setAttribute('aria-hidden', 'true');
        }
    });
}

/** Restore visibility of all body-level siblings to assistive technologies. */
function restoreBackgroundToAT() {
    document.querySelectorAll('body > *').forEach(el => {
        if (el.id !== 'product-modal' && el.tagName !== 'SCRIPT') {
            el.removeAttribute('aria-hidden');
        }
    });
}

/**
 * Open the product detail modal for a given product.
 * Also updates SEO meta tags and Schema.org JSON-LD dynamically.
 * @param {object} product
 */
function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');

    lastFocusedElement = document.activeElement;

    body.innerHTML = buildProductPage(product);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    hideBackgroundFromAT();

    // Push state for mobile "back" button functionality
    history.pushState({ modalOpen: true }, '', `#${product.sku}`);
    isModalOpen = true;

    // Move focus to the close button so screen readers enter the dialog
    document.getElementById('modal-close').focus();

    // --- Dynamic SEO Updates ---
    document.title = `${product.nom} | L'artiste Parfum`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        // Fallback sequentially in case descriptions are empty depending on language config
        let desc = product.description_fr || product.description_en || product.description_ar || "DÃ©couvrez ce parfum exclusif par L'artiste Parfum.";
        // Truncate cleanly around 155 chars for SEO perfection
        if (desc.length > 155) {
            desc = desc.substring(0, 155) + '...';
        }
        metaDesc.setAttribute('content', desc);
    }
    // Update Open Graph (usually needed if crawlers run JS)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${product.nom} | L'artiste Parfum`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', metaDesc.getAttribute('content'));

    // ---- Schema.org Product dynamique ----
    let schemaEl = document.getElementById('schema-product');
    if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.type = 'application/ld+json';
        schemaEl.id = 'schema-product';
        document.head.appendChild(schemaEl);
    }
    const accords = (product.accords || []).map(a => a.label_en || a.label).join(', ');
    schemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.nom,
        "description": product.description_fr || product.description_en || `Parfum ${product.genre} â€” ${accords}`,
        "image": product.image,
        "brand": {
            "@type": "Brand",
            "name": "L'artiste Parfum"
        },
        "offers": {
            "@type": "Offer",
            "seller": { "@type": "Organization", "name": "L'artiste Parfum" },
            "priceCurrency": "MAD",
            "availability": "https://schema.org/InStock",
            "url": `https://lartisteparfum.art/#${product.sku}`
        },
        "category": `Parfum ${product.genre}`,
        "sku": product.sku
    });
    // ---------------------------

    setTimeout(() => {
        body.querySelectorAll('.accord-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

/**
 * Close the product detail modal and restore default SEO meta tags.
 * @param {boolean} [fromHistory=false] - True when triggered by browser back navigation
 */
function closeProductModal(fromHistory = false) {
    const modal = document.getElementById('product-modal');
    if (modal.classList.contains('hidden')) return;

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    isModalOpen = false;
    restoreBackgroundToAT();

    // Restore focus to the element that opened the modal
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }

    // --- Restore Default SEO ---
    document.title = "L'artiste Parfum â€” Catalogue de Parfums";
    const defaultDesc = "L'artiste Parfum - The Art of Perfume. DÃ©couvrez notre collection exclusive de parfums pour homme, femme et unisex.";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', "L'artiste Parfum â€” Catalogue de Parfums");
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', defaultDesc);
    // ---------------------------

    // If modal was closed via X button/overlay, go back to remove the pushed state
    if (!fromHistory) {
        history.back();
    }
}

function getNoteImage(noteName) {
    const cleanName = noteName.trim();
    return `${NOTES_IMG_PATH}${cleanName}.jpg`;
}

function getSeasonIcon(seasonKey) {
    const icons = {
        'winter': '&#x2744;&#xFE0F;',
        'spring': '&#x1F338;',
        'summer': '&#x2600;&#xFE0F;',
        'autumn': '&#x1F342;'
    };
    return icons[seasonKey] || '&#x1F33F;';
}

function buildProductPage(product) {
    // Main Accords
    let accordsHtml = '';
    if (product.accords && product.accords.length > 0) {
        accordsHtml = product.accords.map(a => {
            const label = tAccord(a.label_en);
            return `
        <div class="accord-bar">
          <div class="accord-track">
            <div class="accord-fill" style="background:${a.color};width:0%" data-width="${a.percentage}%">${label}</div>
          </div>
        </div>
      `;
        }).join('');
    }

    // Daytime bar
    let daytimeHtml = '';
    if (product.daytime && Object.keys(product.daytime).length > 0) {
        // Extract values using original French keys from data
        const dayPct = product.daytime['Jour'] || 50;
        const nightPct = product.daytime['Nuit'] || 50;
        const total = dayPct + nightPct;
        const dayW = (dayPct / total * 100).toFixed(0);
        const nightW = (nightPct / total * 100).toFixed(0);
        daytimeHtml = `
      <div class="info-card section-daytime">
        <div class="info-card-title">${t('daytime_title')}</div>
        <div class="daytime-bar">
          <div class="daytime-day" style="width:${dayW}%">&#x2600;&#xFE0F; ${t('day')}</div>
          <div class="daytime-night" style="width:${nightW}%">&#x1F319; ${t('night')}</div>
        </div>
      </div>
    `;
    }

    // Seasons
    let seasonsHtml = '';
    if (product.seasons && Object.keys(product.seasons).length > 0) {
        // Normalize keys to avoid accent/encoding issues (e.g. "Été", "Ete", "Ã‰tÃ©")
        const normalizedSeasons = Object.fromEntries(
            Object.entries(product.seasons).map(([k, v]) => [normalizePeriodKey(k), v])
        );

        const seasonMap = [
            { lookup: ['winter', 'hiver'], key: 'winter' },
            { lookup: ['spring', 'printemps'], key: 'spring' },
            { lookup: ['summer', 'ete'], key: 'summer' },
            { lookup: ['autumn', 'fall', 'automne'], key: 'autumn' }
        ];

        const seasonItems = seasonMap
            .map(s => {
                const matchedKey = s.lookup.find(label => normalizedSeasons[label] !== undefined);
                if (!matchedKey) return null;
                const value = Number(normalizedSeasons[matchedKey]) || 0;
                const opacity = Math.max(0.3, value / 100);
                return `
          <div class="season-item" data-season="${s.key}" style="opacity:${opacity}">
            <span class="season-icon">${getSeasonIcon(s.key)}</span>
            <span class="season-label">${t(s.key)}</span>
          </div>
        `;
            })
            .filter(Boolean)
            .join('');

        seasonsHtml = `
      <div class="info-card section-seasons">
        <div class="info-card-title">${t('seasons_title')}</div>
        <div class="seasons-grid">${seasonItems}</div>
      </div>
    `;
    }

    // Pyramid / Notes
    let pyramidHtml = '';
    if (product.pyramid && Object.keys(product.pyramid).length > 0) {
        // Map original French keys to translation keys
        const levels = [
            { dataKey: 'Notes de tÃªte', key: 'top_notes', icon: 'ðŸŽµ' },
            { dataKey: 'Notes de cÅ“ur', key: 'heart_notes', icon: 'â¤ï¸' },
            { dataKey: 'Notes de fond', key: 'base_notes', icon: 'ðŸŒ³' }
        ];

        // Select the right pyramid based on current language
        const lang = currentLang || 'fr';
        let displayPyramid;
        if (lang === 'ar' && product.pyramid_ar) {
            displayPyramid = product.pyramid_ar;
        } else if (lang === 'fr' && product.pyramid_fr) {
            displayPyramid = product.pyramid_fr;
        } else {
            displayPyramid = product.pyramid;  // English / fallback
        }

        const levelsHtml = levels
            .filter(l => product.pyramid[l.dataKey] && product.pyramid[l.dataKey].length > 0)
            .map(l => {
                const notesEn = product.pyramid[l.dataKey];     // English names (for images)
                const notesDisplay = displayPyramid[l.dataKey] || notesEn;  // Translated names
                const chips = notesEn.map((n, i) => {
                    const imgSrc = getNoteImage(n);
                    const displayName = notesDisplay[i] || n;
                    return `<span class="note-chip"><img src="${imgSrc}" alt="${n}" onerror="this.style.display='none'">${displayName}</span>`;
                }).join('');
                return `
          <div class="pyramid-level">
            <div class="pyramid-level-title">${l.icon} ${t(l.key)}</div>
            <div class="pyramid-notes">${chips}</div>
          </div>
        `;
            }).join('');

        pyramidHtml = `
      <div class="info-card section-pyramid">
        <div class="info-card-title">${t('pyramid_title')}</div>
        <div class="pyramid-section">${levelsHtml}</div>
      </div>
    `;
    }


    const genreLabel = tForGenre(product.genre);

    // Description
    let descriptionHtml = '';
    const lang = currentLang || 'fr';
    let desc = '';
    if (lang === 'ar' && product.description_ar) {
        desc = product.description_ar;
    } else if (lang === 'en' && product.description_en) {
        desc = product.description_en;
    } else if (product.description_fr) {
        desc = product.description_fr;
    }
    if (SHOW_PRODUCT_DESCRIPTION && desc) {
        descriptionHtml = `
      <div class="info-card product-description">
        <div class="info-card-title">${t('description')}</div>
        <p class="description-text">${desc}</p>
      </div>
    `;
    }

    // ADD TO CART SECTION (replaces WhatsApp direct button)
    const sizeSelectorHtml = `
      <div class="info-card">
        <div class="size-selector">
          <div class="size-option-wrapper">
            <input type="radio" name="size_${product.sku}" id="size_30_${product.sku}" value="30" class="size-option-input">
            <label for="size_30_${product.sku}" class="size-option-label">
              <span class="size-vol">${t('size_30')}</span>
              <span class="size-price">${t('price_30')}</span>
            </label>
          </div>
          <div class="size-option-wrapper">
            <input type="radio" name="size_${product.sku}" id="size_50_${product.sku}" value="50" class="size-option-input" checked>
            <label for="size_50_${product.sku}" class="size-option-label">
              <span class="size-vol">${t('size_50')}</span>
              <span class="size-price">${t('price_50')}</span>
            </label>
          </div>
        </div>
        <button class="add-to-cart-btn" onclick="addFromModal('${product.sku}', '${product.nom.replace(/'/g, "\\'")}', '${product.image}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-9.8-2h11.6a2 2 0 0 0 1.9-1.5l1.5-6A2 2 0 0 0 19.3 8H6M3 4h2l1 4"></path></svg>
          <span data-i18n="add_to_cart">${t('add_to_cart')}</span>
        </button>
      </div>
    `;

    return `
    <div class="product-page">
      <div class="product-left">
        <div class="product-title-section">
          <h2 class="product-name" id="modal-product-title">${product.nom}</h2>
          <p class="product-brand">${product.inspiration}</p>
          <span class="product-genre-tag" data-genre="${product.genre}">${genreLabel}</span>
        </div>
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.nom}" onerror="this.parentElement.innerHTML='<span style=&quot;color:var(--color-text-dim)&quot;>${t('image_unavailable')}</span>'">
        </div>
        ${pyramidHtml}
      </div>
      <div class="product-right">
        ${sizeSelectorHtml}
        ${product.accords.length > 0 ? `
          <div class="info-card section-accords">
            <div class="info-card-title">${t('main_accords')}</div>
            ${accordsHtml}
          </div>
        ` : ''}
        ${descriptionHtml}
        ${daytimeHtml}
        ${seasonsHtml}
      </div>
    </div>
  `;
}


// ============================================
// HEADER SCROLL BEHAVIOR
// ============================================
let lastScrollY = 0;
function handleScroll() {
    const header = document.getElementById('header');
    const hero = document.getElementById('hero');
    const scrollY = window.scrollY;
    const heroHeight = hero.offsetHeight;

    if (scrollY > heroHeight) {
        if (scrollY > lastScrollY && scrollY - lastScrollY > 10) {
            header.classList.add('hidden-header');
        } else if (lastScrollY - scrollY > 10) {
            header.classList.remove('hidden-header');
        }
    } else {
        header.classList.remove('hidden-header');
    }

    // Show/hide scroll-to-top button
    const scrollTopBtn = document.getElementById('scroll-to-top');
    if (scrollTopBtn) {
        if (scrollY > 500) {
            scrollTopBtn.classList.remove('hidden');
        } else {
            scrollTopBtn.classList.add('hidden');
        }
    }

    lastScrollY = scrollY;
}

// ============================================
// LANGUAGE CHANGE HANDLER
// ============================================
function onLanguageChanged() {
    const lang = window.currentLang || 'fr';

    // Update html lang + dir for SEO
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Re-render dynamic content
    updateCatalog();
    updateProductCount();

    // Close modal if open
    const modal = document.getElementById('product-modal');
    if (!modal.classList.contains('hidden')) {
        closeProductModal();
    }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n first
    initI18n();

    // Initialize Cart
    initCart();

    loadProducts();

    // Nav filter links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilter(link.dataset.filter);
        });
    });

    // Category buttons on hero
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyFilter(btn.dataset.filter);
        });
    });

    // Search setups
    setupSearch(
        document.getElementById('search-input'),
        document.getElementById('search-dropdown'),
        document.getElementById('header-clear-btn'),
        document.getElementById('header-search-btn')
    );
    setupSearch(
        document.getElementById('hero-search-input'),
        document.getElementById('hero-search-dropdown'),
        document.getElementById('hero-clear-btn'),
        document.getElementById('hero-search-btn')
    );

    // Hero search enter key
    document.getElementById('hero-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performFullSearch(e.target.value);
        }
    });

    // Header search enter key
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performFullSearch(e.target.value);
        }
    });

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', renderPage);

    // Filter hash changes on load so we don't open broken modals
    if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
    }

    // Handle back button / mobile swipe back to close modal
    window.addEventListener('popstate', () => {
        if (isModalOpen) {
            closeProductModal(true); // Closed by history
        }
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => closeProductModal(false));
    document.getElementById('modal-overlay').addEventListener('click', () => closeProductModal(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProductModal(false);
    });

    // Scroll behavior
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Floating Scroll Buttons
    const scrollTopBtn = document.getElementById('scroll-to-top');
    const scrollBottomBtn = document.getElementById('scroll-to-bottom');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', () => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
    }

    // Hero scroll indicator click
    document.querySelector('.hero-scroll-indicator').addEventListener('click', () => {
        document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });

    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
        });
    });

    // Listen for language changes
    window.addEventListener('languageChanged', onLanguageChanged);

    // ============================================
    // FLOATING WHATSAPP â€” Show only when hero CTA is out of view
    // ============================================
    const waFloat = document.getElementById('whatsapp-float');
    const heroCta = document.querySelector('.hero-whatsapp-cta');

    if (waFloat && heroCta) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    // Hero CTA visible â†’ hide float. Hero CTA gone â†’ show float.
                    if (entry.isIntersecting) {
                        waFloat.classList.remove('visible');
                    } else {
                        waFloat.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1 }
        );
        observer.observe(heroCta);
    }
});

// ============================================
// CART LOGIC & CHECKOUT
// ============================================
let cart = [];
const DELIVERY_FEE = 30;

function initCart() {
    const saved = localStorage.getItem('olfato_cart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
        } catch(e) {
            cart = [];
        }
    }
    updateCartUI();
    
    // Bind UI Buttons
    document.getElementById('cart-header-btn').addEventListener('click', openCartSidebar);
    document.getElementById('cart-close-btn').addEventListener('click', closeCartSidebar);
    document.getElementById('cart-overlay').addEventListener('click', closeCartSidebar);
    
    document.getElementById('checkout-start-btn').addEventListener('click', () => {
        document.getElementById('cart-list-view').classList.add('hidden');
        document.getElementById('cart-form-view').classList.remove('hidden');
    });
    
    document.getElementById('back-to-cart-btn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('cart-form-view').classList.add('hidden');
        document.getElementById('cart-list-view').classList.remove('hidden');
    });
    
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
}

function saveCart() {
    localStorage.setItem('olfato_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    
    if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    
    renderCartList();
}

// Handler specifically for the modal's Add to Cart button
function addFromModal(sku, name, image) {
    const targetSize = document.querySelector(`input[name="size_${sku}"]:checked`).value;
    const price = targetSize === '50' ? 79 : 49;
    addToCart(sku, name, image, parseInt(targetSize), price);
    closeProductModal();
    setTimeout(openCartSidebar, 300); // Opens cart smoothly after modal closes
}

function addToCart(sku, name, image, size, price) {
    // Check if item of same sku and size exists
    const existing = cart.find(i => i.sku === sku && i.size === size);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ sku, name, image, size, price, qty: 1 });
    }
    saveCart();
    // Vibrate/Flash badge to give feedback if the cart sidebar isn't opened
    const badge = document.getElementById('cart-badge');
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
}

function updateQuantity(idx, act) {
    if (cart[idx]) {
        if (act === 'inc') cart[idx].qty++;
        else if (act === 'dec') cart[idx].qty--;
        
        if (cart[idx].qty <= 0) {
            cart.splice(idx, 1);
        }
    }
    saveCart();
}

function removeFromCart(idx) {
    if (cart[idx]) {
        cart.splice(idx, 1);
    }
    saveCart();
}

function renderCartList() {
    const listEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-start-btn');
    
    listEl.innerHTML = '';
    
    if (cart.length === 0) {
        listEl.innerHTML = `<div class="empty-cart-msg">${t('empty_cart')}</div>`;
        subtotalEl.innerText = '0 MAD';
        totalEl.innerText = '0 MAD';
        checkoutBtn.disabled = true;
        return;
    }
    
    checkoutBtn.disabled = false;
    let subtotal = 0;
    
    cart.forEach((item, idx) => {
        subtotal += item.price * item.qty;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.style.display='none'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-size-price">${item.size} ml â€” <span class="cart-price">${item.price} MAD</span></div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateQuantity(${idx}, 'dec')">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQuantity(${idx}, 'inc')">+</button>
                    <button class="rm-cart-item" onclick="removeFromCart(${idx})" aria-label="Supprimer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        listEl.appendChild(itemEl);
    });
    
    subtotalEl.innerText = `${subtotal} MAD`;
    totalEl.innerText = `${subtotal + DELIVERY_FEE} MAD`;
}

function openCartSidebar() {
    document.getElementById('cart-list-view').classList.remove('hidden');
    document.getElementById('cart-form-view').classList.add('hidden');
    document.getElementById('cart-sidebar').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    document.getElementById('cart-sidebar').classList.add('hidden');
    document.body.style.overflow = '';
}

async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return;
    
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const city = document.getElementById('order-city').value;
    const address = document.getElementById('order-address').value;
    
    let itemsText = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        itemsText += `- ${item.qty} x ðŸŒ¸ ${item.name} (${item.size} ml) [Ref: ${item.sku}]\n`;
        subtotal += (item.qty * item.price);
    });
    
    const total = subtotal + DELIVERY_FEE;
    
    // Save to Database
    try {
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'CrÃ©ation de la commande...';
        }

        const orderData = {
            nom_client: name,
            phone: phone,
            ville: city,
            adresse: address,
            total: total,
            items: cart
        };

        const { error } = await supabaseClient.from('orders').insert([orderData]);
        if (error) console.error("Erreur enregistrement commande:", error);

    } catch (err) {
        console.error("Database connection error during checkout", err);
    }

    const message = `Bonjour, je souhaite passer une commande :

ðŸ“¦ *DÃ‰TAILS DE LA COMMANDE*
${itemsText}
Sous-total : ${subtotal} MAD
Livraison : ${DELIVERY_FEE} MAD
*Total Ã  payer : ${total} MAD*

ðŸ‘¤ *INFORMATIONS CLIENT*
Nom: ${name}
TÃ©lÃ©phone: ${phone}
Ville: ${city}
Adresse: ${address}

Merci de confirmer l'expÃ©dition de ma commande.`;

    const waUrl = `https://wa.me/${STORE_SETTINGS.whatsapp_number}?text=${encodeURIComponent(message)}`;
    
    // Clear cart
    cart = [];
    saveCart();
    closeCartSidebar();
    
    // Reset Form
    document.getElementById('checkout-form').reset();
    
    // Go to WA
    window.open(waUrl, '_blank');
}



