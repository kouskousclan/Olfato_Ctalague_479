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
// DATA LOADING
// ============================================
async function loadProducts() {
    console.log("Executing loadProducts()...");
    try {
        const { data: dbProducts, error } = await supabaseClient
            .from('products')
            .select(`
                *,
                product_accords(*),
                product_wear_times(*),
                product_notes(*)
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
                accords: accordsData.map(a => ({
                    label_en: a.label_en,
                    label: a.label_fr,
                    color: a.hex_color,
                    percentage: a.percentage
                })),
                seasons: {},
                daytime: {},
                pyramid: {}
            };
            
            // Reconstruct Periods (Seasons & Day/Night)
            const seasonReverseMap = { 'winter': 'Hiver', 'spring': 'Printemps', 'summer': 'Été', 'fall': 'Automne' };
            const dayReverseMap = { 'day': 'Jour', 'night': 'Nuit' };
            
            (p.product_wear_times || []).forEach(w => {
                if (seasonReverseMap[w.period]) pObj.seasons[seasonReverseMap[w.period]] = w.percentage;
                if (dayReverseMap[w.period]) pObj.daytime[dayReverseMap[w.period]] = w.percentage;
            });
            
            // Reconstruct Pyramids
            const pyramidReverseMap = { 'top': 'Notes de tête', 'middle': 'Notes de cœur', 'base': 'Notes de fond' };
            notesData.forEach(n => {
                const frKey = pyramidReverseMap[n.level];
                if (frKey) {
                    if (!pObj.pyramid[frKey]) pObj.pyramid[frKey] = [];
                    pObj.pyramid[frKey].push(n.note_name);
                }
            });
            
            return pObj;
        });
        
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
    } else {
        filteredProducts = allProducts.filter(p => p.genre === genre);
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
function searchProducts(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allProducts.filter(p => {
        const name = p.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const brand = p.inspiration.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const accords = (p.accords || []).map(a => {
            const translated = tAccord(a.label_en);
            return (a.label_en + ' ' + translated).toLowerCase();
        }).join(' ');
        return name.includes(q) || brand.includes(q) || accords.includes(q);
    }).slice(0, 8);
}

function renderSearchDropdown(results, dropdownEl) {
    if (results.length === 0) {
        dropdownEl.classList.add('hidden');
        return;
    }

    dropdownEl.innerHTML = results.map(p => `
    <div class="search-dropdown-item" data-sku="${p.sku}">
      <img src="${p.image}" alt="${p.nom}" onerror="this.style.display='none'">
      <div class="sdi-info">
        <div class="sdi-name">${p.nom}</div>
        <div class="sdi-brand">${p.inspiration}</div>
      </div>
      <span class="sdi-genre" data-genre="${p.genre}">${tGenre(p.genre)}</span>
    </div>
  `).join('');

    dropdownEl.classList.remove('hidden');

    dropdownEl.querySelectorAll('.search-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const product = allProducts.find(p => p.sku === item.dataset.sku);
            if (product) {
                openProductModal(product);
                dropdownEl.classList.add('hidden');
            }
        });
    });
}

function setupSearch(inputEl, dropdownEl) {
    inputEl.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const results = searchProducts(inputEl.value);
            renderSearchDropdown(results, dropdownEl);
        }, 200);
    });

    inputEl.addEventListener('focus', () => {
        if (inputEl.value.length >= 2) {
            const results = searchProducts(inputEl.value);
            renderSearchDropdown(results, dropdownEl);
        }
    });

    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
            dropdownEl.classList.add('hidden');
        }
    });
}

// ============================================
// PRODUCT MODAL (Product Page)
// ============================================
function openProductModal(product) {
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = buildProductPage(product);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        body.querySelectorAll('.accord-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 100);
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
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
      <div class="info-card">
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
      <div class="info-card">
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
      <div class="info-card">
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
          <div class="info-card">
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
        document.getElementById('search-dropdown')
    );
    setupSearch(
        document.getElementById('hero-search-input'),
        document.getElementById('hero-search-dropdown')
    );

    // Hero search enter key
    document.getElementById('hero-search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                filteredProducts = allProducts.filter(p => {
                    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const name = p.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const brand = p.inspiration.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return name.includes(q) || brand.includes(q);
                });
                currentFilter = 'all';
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                updateCatalog();
                updateProductCount();
                document.getElementById('catalog-title').textContent = t('results_for', { query });
                document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('hero-search-dropdown').classList.add('hidden');
            }
        }
    });

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', renderPage);

    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeProductModal);
    document.getElementById('modal-overlay').addEventListener('click', closeProductModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProductModal();
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
