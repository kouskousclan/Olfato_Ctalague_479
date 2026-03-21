/* ============================================
   OLFATO HOUSE — Catalogue App (i18n)
   ============================================ */

const SUPABASE_URL = 'https://mkomrppcdrgbpfybrfyu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rb21ycHBjZHJnYnBmeWJyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODQ2MzUsImV4cCI6MjA4ODc2MDYzNX0.DXJvMb2eX7Cg_FvKW-NyodaDCsLREfY_V4H5Q-IsBaI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NOTES_IMG_PATH = `${SUPABASE_URL}/storage/v1/object/public/notes/`;
const PRODUCTS_PER_PAGE = 30;

let allProducts = [];
let filteredProducts = [];
let currentFilter = 'all';
let currentPage = 0;
let searchTimeout = null;

// ============================================
// UTILS
// ============================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================
// DATA LOADING
// ============================================
async function loadProducts() {
    console.log("Executing loadProducts()...");
    try {
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
            
            // Reconstruct Periods (Seasons & Day/Night)
            const seasonReverseMap = { 'winter': 'Hiver', 'spring': 'Printemps', 'summer': 'Été', 'fall': 'Automne' };
            const dayReverseMap = { 'day': 'Jour', 'night': 'Nuit' };
            
            (p.product_wear_times || []).forEach(w => {
                const perObj = w.periods;
                if (!perObj) return;
                
                const periodEn = perObj.period_en;
                if (seasonReverseMap[periodEn]) pObj.seasons[seasonReverseMap[periodEn]] = w.percentage;
                if (dayReverseMap[periodEn]) pObj.daytime[dayReverseMap[periodEn]] = w.percentage;
            });
            
            // Reconstruct Pyramids with all 3 languages
            const pyramidReverseMap = { 'top': 'Notes de tête', 'middle': 'Notes de cœur', 'base': 'Notes de fond' };
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
        console.log("✅ Successfully mapped products. AllProducts length:", allProducts.length);
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

function updateProductCount() {
    const el = document.getElementById('product-count');
    el.textContent = tCount(filteredProducts.length);
}

// ============================================
// CATALOG RENDERING
// ============================================
function updateCatalog() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    currentPage = 0;
    renderPage();
}

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

function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'product-card';
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
      <img src="${product.image}" alt="${product.nom}" loading="lazy" onerror="this.style.display='none'">
      <span class="product-card-genre" data-genre="${product.genre}">${tGenre(product.genre)}</span>
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
      <img src="${p.image}" alt="${p.nom}" onerror="this.style.display='none'">
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

function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = buildProductPage(product);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Push state for mobile "back" button functionality
    history.pushState({ modalOpen: true }, '', `#${product.sku}`);
    isModalOpen = true;

    // --- Dynamic SEO Updates ---
    document.title = `${product.nom} | Olfato House`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        // Fallback sequentially in case descriptions are empty depending on language config
        let desc = product.description_fr || product.description_en || product.description_ar || "Découvrez ce parfum exclusif par Olfato House.";
        // Truncate cleanly around 155 chars for SEO perfection
        if (desc.length > 155) {
            desc = desc.substring(0, 155) + '...';
        }
        metaDesc.setAttribute('content', desc);
    }
    // Update Open Graph (usually needed if crawlers run JS)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${product.nom} | Olfato House`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', metaDesc.getAttribute('content'));
    // ---------------------------

    setTimeout(() => {
        body.querySelectorAll('.accord-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

function closeProductModal(fromHistory = false) {
    const modal = document.getElementById('product-modal');
    if (modal.classList.contains('hidden')) return;

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    isModalOpen = false;

    // --- Restore Default SEO ---
    document.title = "Olfato House — Catalogue de Parfums";
    const defaultDesc = "Olfato House - The Art of Perfume. Découvrez notre collection exclusive de parfums pour homme, femme et unisex.";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', "Olfato House — Catalogue de Parfums");
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
        'winter': '❄️',
        'spring': '🌸',
        'summer': '☀️',
        'autumn': '🍂'
    };
    return icons[seasonKey] || '🌿';
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
          <div class="daytime-day" style="width:${dayW}%">☀️ ${t('day')}</div>
          <div class="daytime-night" style="width:${nightW}%">🌙 ${t('night')}</div>
        </div>
      </div>
    `;
    }

    // Seasons
    let seasonsHtml = '';
    if (product.seasons && Object.keys(product.seasons).length > 0) {
        // Map original French keys to season keys
        const seasonMap = [
            { dataKey: 'Hiver', key: 'winter' },
            { dataKey: 'Printemps', key: 'spring' },
            { dataKey: 'Été', key: 'summer' },
            { dataKey: 'Automne', key: 'autumn' }
        ];

        const seasonItems = seasonMap
            .filter(s => product.seasons[s.dataKey] !== undefined)
            .map(s => {
                const pct = product.seasons[s.dataKey];
                const opacity = Math.max(0.3, pct / 100);
                return `
          <div class="season-item" data-season="${s.key}" style="opacity:${opacity}">
            <span class="season-icon">${getSeasonIcon(s.key)}</span>
            <span class="season-label">${t(s.key)}</span>
          </div>
        `;
            }).join('');

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
            { dataKey: 'Notes de tête', key: 'top_notes', icon: '🎵' },
            { dataKey: 'Notes de cœur', key: 'heart_notes', icon: '❤️' },
            { dataKey: 'Notes de fond', key: 'base_notes', icon: '🌳' }
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
    if (desc) {
        descriptionHtml = `
      <div class="info-card product-description">
        <div class="info-card-title">${t('description')}</div>
        <p class="description-text">${desc}</p>
      </div>
    `;
    }

    return `
    <div class="product-page">
      <div class="product-left">
        <div class="product-title-section">
          <h2 class="product-name">${product.nom}</h2>
          <p class="product-brand">${product.inspiration}</p>
          <span class="product-genre-tag" data-genre="${product.genre}">${genreLabel}</span>
        </div>
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.nom}" onerror="this.parentElement.innerHTML='<span style=&quot;color:var(--color-text-dim)&quot;>${t('image_unavailable')}</span>'">
        </div>
        ${pyramidHtml}
      </div>
      <div class="product-right">
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
    window.addEventListener('popstate', (e) => {
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
});
