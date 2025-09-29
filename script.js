import { signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let authInitialized = false;
let pokemonData = null;
let currentTab = localStorage.getItem('currentTab') || 'shiny';
let currentFilter = null;
const cellStates = {};
let isProcessingTap = false;

// Responsive cell count
let cellsForScreen = 5;
let myScreenWidth = window.screen.width;
if (myScreenWidth < 601) {
    cellsForScreen = 3;
} else if (myScreenWidth > 1024) {
    cellsForScreen = 7;
}
document.documentElement.style.setProperty('--cells-for-screen', cellsForScreen);

function showDebug(message) {
    const debug = document.getElementById('debug');
    debug.innerHTML = `${message}`;
    setTimeout(() => {}, 5000);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function loadCellStates() {
    try {
        const savedStates = localStorage.getItem('pokemonCellStates');
        if (savedStates) {
            Object.assign(cellStates, JSON.parse(savedStates));
        }
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.forEach((value, key) => {
            if (['grey', 'yellow', 'blue', 'red'].includes(value)) {
                cellStates[key] = value;
            }
        });
        saveCellStates();
    } catch (error) {
        showDebug('Error loading saved states: ' + error.message);
        setTimeout(() => {}, 5000);
    }
}

function saveCellStates() {
    try {
        localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
    } catch (error) {
        showDebug('Error saving states to localStorage: ' + error.message);
        setTimeout(() => {}, 5000);
    }
}

fetch('pokemon.json')
    .then(response => {
        document.getElementById('loading').style.display = 'block';
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        pokemonData = data;
        if (!data || !data.pokemon || !Array.isArray(data.pokemon)) {
            throw new Error('Pokémon data is empty or invalid');
        }
        loadCellStates();
        initTabs();
        initFilterButtons();
        initMenu();
        initGenerationTabs();
        document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
        document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later. (load)</p>';
        showDebug('Error loading Pokémon data: ' + error.message);
        setTimeout(() => {}, 5000);
        document.getElementById('loading').style.display = 'none';
    });

function initGenerationTabs() {
    const buttons = document.querySelectorAll('.gen-button');
    buttons.forEach(btn => {
        let genNumber = btn.getAttribute('onclick')?.match(/scrollToGeneration\('(\d+)'\)/)?.[1];
        if (!genNumber) {
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
            const index = romanNumerals.indexOf(btn.textContent.trim());
            genNumber = index >= 0 ? String(index + 1) : null;
        }
        if (genNumber) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => {
                scrollToGeneration(genNumber);
                showDebug(`Generation tab clicked: ${genNumber}`);
            });
        } else {
            showDebug(`No valid generation number found for button: ${btn.textContent}`);
        }
    });
}

function initTabs() {
    if (!pokemonData) {
        document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later. (initt)</p>';
        showDebug('No Pokémon data available');
        return;
    }
    switchTab(currentTab);
}

function initFilterButtons() {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    filters.forEach(color => {
        const button = document.getElementById(`filter${color.charAt(0).toUpperCase() + color.slice(1)}`);
        button.addEventListener('click', () => toggleFilter(color));
    });
}

function initMenu() {
    const hamburger = document.getElementById('hamburger');
    const sideMenu = document.getElementById('side-menu');
    const closeMenu = document.getElementById('closeMenu');
    const filterPrompt = document.getElementById('filterPrompt');

    sideMenu.classList.remove('active');
    hamburger.style.visibility = 'visible';

    hamburger.addEventListener('click', () => {
        sideMenu.classList.add('active');
        hamburger.style.visibility = 'hidden';
    });

    closeMenu.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuSaveButton').addEventListener('click', () => {
        const params = new URLSearchParams();
        Object.keys(cellStates).forEach(key => {
            if (cellStates[key] !== 'grey') {
                params.set(key, cellStates[key]);
            }
        });
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('URL copied to clipboard');
        }).catch(error => {
            showDebug('Failed to copy URL to clipboard: ' + error.message);
        });
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuClearButton').addEventListener('click', () => {
        clearAllStates();
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuExportButton').addEventListener('click', () => {
        try {
            const dataStr = JSON.stringify(cellStates, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pokemon_states.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('States exported successfully');
        } catch (error) {
            console.error('Error exporting states:', error);
            showDebug('Failed to export states: ' + error.message);
        }
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuImportButton').addEventListener('click', () => {
        document.getElementById('importFile').click();
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuShareButton').addEventListener('click', () => {
        if (!currentFilter) {
            filterPrompt.style.display = 'block';
            sideMenu.classList.remove('active');
            hamburger.style.visibility = 'visible';
        } else {
            initializeFirebaseForShare(currentFilter);
        }
    });

    ['Grey', 'Yellow', 'Blue', 'Red'].forEach(color => {
        document.getElementById(`prompt${color}`).addEventListener('click', () => {
            filterPrompt.style.display = 'none';
            initializeFirebaseForShare(color.toLowerCase());
        });
    });
    document.getElementById('promptCancel').addEventListener('click', () => {
        filterPrompt.style.display = 'none';
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    function initializeFirebaseForShare(filter) {
        if (!window.db || !window.auth) {
            showDebug('Firebase not initialized');
            fallbackToLongUrl(filter);
            return;
        }
        attemptAuth(filter);
    }

    function attemptAuth(filter) {
        if (authInitialized) {
            generateShareUrl(filter);
            return;
        }
        signInAnonymously(window.auth)
            .then((userCredential) => {
                authInitialized = true;
                showDebug('Firebase authenticated anonymously with UID: ' + userCredential.user.uid);
                generateShareUrl(filter);
            })
            .catch(error => {
                authInitialized = false;
                showDebug('Firebase authentication failed: ' + error.message);
                fallbackToLongUrl(filter);
            });
    }

    function generateShareUrl(filter) {
        const shareData = { tab: currentTab, filter: filter, states: {} };
        Object.keys(cellStates).forEach(key => {
            if (cellStates[key] === filter) {
                shareData.states[key] = cellStates[key];
            }
        });
        let encodedData = btoa(JSON.stringify(shareData));
        if (typeof LZString !== 'undefined') {
            const compressed = LZString.compressToBase64(JSON.stringify(shareData));
            encodedData = compressed;
        }
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const longUrl = `${window.location.origin}${basePath}display/?data=${encodeURIComponent(encodedData)}`;
        showDebug('Generated long URL: ' + longUrl);
        setTimeout(() => {}, 5000);
        navigator.clipboard.writeText(longUrl).then(() => {
            showToast('Long URL copied (use for sharing if short fails)');
        }).catch(error => {
            showDebug('Clipboard copy failed: ' + error.message);
            setTimeout(() => {}, 5000);
        });
        (async () => {
            try {
                const shortUrl = await shortenUrl(longUrl, window.db);
                await navigator.clipboard.writeText(shortUrl);
                showToast('Share URL copied to clipboard');
            } catch (error) {
                showDebug('Shortening error: ' + error.message);
                setTimeout(() => {}, 5000);
                await navigator.clipboard.writeText(longUrl).catch(error => {
                    showDebug('Clipboard copy failed: ' + error.message);
                    setTimeout(() => {}, 5000);
                });
                showToast('URL shortening failed. Long URL copied instead.');
            } finally {
                sideMenu.classList.remove('active');
                hamburger.style.visibility = 'visible';
            }
        })();
    }

    function fallbackToLongUrl(filter) {
        const shareData = { tab: currentTab, filter: filter, states: {} };
        Object.keys(cellStates).forEach(key => {
            if (cellStates[key] === filter) {
                shareData.states[key] = cellStates[key];
            }
        });
        let encodedData = btoa(JSON.stringify(shareData));
        if (typeof LZString !== 'undefined') {
            const compressed = LZString.compressToBase64(JSON.stringify(shareData));
            encodedData = compressed;
        }
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const longUrl = `${window.location.origin}${basePath}display/?data=${encodeURIComponent(encodedData)}`;
        showDebug('Falling back to long URL: ' + longUrl);
        setTimeout(() => {}, 5000);
        navigator.clipboard.writeText(longUrl).then(() => {
            showToast('Share failed, long URL copied to clipboard');
        }).catch(error => {
            showDebug('Failed to copy fallback URL to clipboard: ' + error.message);
            setTimeout(() => {}, 5000);
        });
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    }

    document.getElementById('importFile').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedStates = JSON.parse(e.target.result);
                    Object.keys(importedStates).forEach(key => {
                        if (['grey', 'yellow', 'blue', 'red'].includes(importedStates[key])) {
                            cellStates[key] = importedStates[key];
                        }
                    });
                    saveCellStates();
                    renderTabContent(currentTab);
                    showToast('States imported successfully');
                } catch (error) {
                    showDebug('Failed to import states: ' + error.message);
                    setTimeout(() => {}, 5000);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }
    });
}

async function shortenUrl(longUrl, db) {
    if (!validateUrl(longUrl)) throw new Error('Invalid URL');
    const newShortCode = generateShortCode();
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'display';
    const shortUrl = `${window.location.origin}${basePath}?${newShortCode}`;
    try {
        if (db && authInitialized) {
            showDebug('Attempting Firestore save for code: ' + newShortCode);
            setTimeout(() => {}, 5000)
            showDebug(`longUrl length: ${longUrl.length}`);
            setTimeout(() => {}, 5000)
            showDebug(`Document size: ${JSON.stringify({ longUrl, createdAt: new Date().toISOString() }).length}`);
            setTimeout(() => {}, 5000)
            await setDoc(doc(db, 'urls', newShortCode), {
                longUrl: longUrl,
                createdAt: new Date().toISOString()
            });
            return shortUrl;
        } else {
            showDebug('Firestore not available or not authenticated');
            return longUrl;
        }
    } catch (error) {
        showDebug('Firestore save failed: ' + error.message);
        setTimeout(() => {}, 5000);
        throw error;
    }
}

function generateShortCode() {
    const code = Math.random().toString(36).substring(2, 8);
    showDebug('Generated short code: ' + code);
    setTimeout(() => {}, 5000);
    return code;
}

function validateUrl(url) {
    try {
        if (!url || typeof url !== 'string') return false;
        const maxLength = 30000;
        if (url.length > maxLength) {
            showDebug('Validation failed: URL exceeds ' + maxLength + ' characters');
            setTimeout(() => {}, 5000):
            return false;
        }
        return true;
    } catch (error) {
        showDebug('Validation error: ' + error.message);
        setTimeout(() => {}, 5000):
        return false;
    }
}

function clearAllStates() {
    Object.keys(cellStates).forEach(key => {
        cellStates[key] = 'grey';
    });
    currentFilter = null;
    const filters = ['grey', 'yellow', 'blue', 'red'];
    filters.forEach(c => {
        document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`).classList.remove('active');
    });
    saveCellStates();
    renderTabContent(currentTab);
}

function toggleFilter(color) {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    if (currentFilter === color) {
        currentFilter = null;
        filters.forEach(c => {
            document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`).classList.remove('active');
        });
    } else {
        currentFilter = color;
        filters.forEach(c => {
            const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            btn.classList.toggle('active', c === color);
        });
    }
    applyFilter(currentFilter);
    // renderTabContent(currentTab);
}

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('currentTab', tab);
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') === `switchTab('${tab}')`) {
            btn.classList.add('active');
        }
    });
    renderTabContent(tab);
    // window.scrollTo({ top: 0, behavior: 'instant' });
}

function applyFilter(filter) {
    const cells = document.querySelectorAll('.pokemon-cell');
    cells.forEach(cell => {
        const state = cellStates[cell.dataset.key] || 'grey';
        cell.style.display = filter ? (state === filter ? 'table-cell' : 'none') : 'table-cell';
    });
}

function scrollToGeneration(genNumber) {
    const section = document.querySelector(`.tab-content h2[data-gen="${genNumber}"]`);
    if (section) {
        const headerHeigh5 = document.querySelector('.header').offsetHeight : 130;
        const sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: sectionTop - headerHeight - 10,
            behavior: 'smooth'
        });
        const buttons = document.querySelectorAll('.gen-button');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick') === `scrollToGeneration('${genNumber}')`) {
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 1000);
            }
        });
    } else {
        showDebug(`Section for gen ${genNumber} not found`);
        setTimeout(() => {}, 1000);
    }
}

function renderTabContent(tab) {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) {
        content.innerHTML = '<p>Something went wrong. Please try again later. (rentab)</p>';
        showDebug('No Pokémon data available');
        setTimeout(() => {}, 5000);
        return;
    }

    const generations = {};
    pokemonData.pokemon.forEach(pokemon => {
        const gen = pokemon.generation_number;
        if (!generations[gen]) {
            generations[gen] = [];
        }
        generations[gen].push(pokemon);
    });

    const sortedGenKeys = Object.keys(generations).sort((a, b) => Number(a) - Number(b));

    sortedGenKeys.forEach(genNumber => {
        const pokemons = generations[genNumber].sort((a, b) => Number(a.id) - Number(b.id));
        const generationName = pokemons[0]?.generation || `Generation ${genNumber}`;
        const section = document.createElement('div');
        section.className = 'tab-content';
        section.innerHTML = `<h2 data-gen="${genNumber}">Gen ${genNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;

        const fragment = document.createDocumentFragment();
        const table = document.createElement('table');
        fragment.appendChild(table);
        let row;
        let cellCount = 0;

        pokemons.forEach(pokemon => {
            let formsToRender = tab === 'shiny'
                ? pokemon.forms.filter(f => f.shiny && f.shiny.image && f.form)
                : pokemon.forms.filter(f => f.form === pokemon.base_form);

            if (tab === 'shiny' && pokemon.id === '201') {
                formsToRender = formsToRender.sort((a, b) => {
                    const getFormOrder = (form) => {
                        const suffix = form.form.replace('Unown ', '').toUpperCase();
                        if (/^[A-Z]$/.test(suffix)) return suffix.charCodeAt(0);
                        if (suffix === '?') return 91;
                        if (suffix === '!') return 92;
                        return 999;
                    };
                    return getFormOrder(a) - getFormOrder(b);
                });
            }

            formsToRender.forEach(form => {
                if (tab !== 'shiny' && !pokemon[tab]) {
                    return;
                }

                showDebug(`Rendering form for #${pokemon.id}: ${form.form} with shiny image ${form.shiny?.image || 'none'}`);

                const key = tab === 'shiny' ? `shiny-${form.key}` : `${tab}-${pokemon.id}`;
                const state = cellStates[key] || 'grey';
                if (currentFilter && state !== currentFilter) {
                    return;
                }

                // Debug: Log each form being rendered
                showDebug(`Rendering form for #${pokemon.id}: ${form.form} with shiny image ${form.shiny?.image || 'none'}`);
                setTimeout(() => {}, 1000);

                if (cellCount % cellsForScreen === 0) {
                    row = table.insertRow();
                }

                const displayNumber = pokemon.id;
                const displayName = pokemon.name;
                let displayForm = '';
                if (tab === 'shiny') {
                    displayForm = (form.form === pokemon.base_form && pokemon.base_form === 'normal') ? '' : form.form;
                }

                const imageSrc = tab === 'shiny' ? form.shiny.image : form.normal.image;

                const cell = row.insertCell();
                cell.className = 'pokemon-cell';
                cell.innerHTML = `
                    <div class="pokemon-number"><strong>#${displayNumber}</strong></div>
                    <div><img class="pokemon-image" src="${imageSrc}" alt="${displayName}${displayForm ? ' ' + displayForm : ''}" loading="lazy" onerror="this.classList.add('error');"></div>
                    <div class="pokemon-name">${displayName}</div>
                    <div class="pokemon-form">${displayForm || ''}</div>
                `;
                cell.dataset.key = key;
                cell.dataset.tab = tab;
                cellStates[key] = cellStates[key] || 'grey';
                updateCellColor(cell, cellStates[key]);

                cell.addEventListener('click', () => {
                    if (isProcessingTap) return;
                    isProcessingTap = true;
                    handleCellClick(key, cell);
                    isProcessingTap = false;
                });

                cellCount++;
            });
        });

        if (table.rows.length > 0) {
            section.appendChild(fragment);
            content.appendChild(section);
        } else {
            section.innerHTML += `<p>No ${tab.toUpperCase()} Pokémon available for Gen ${genNumber}${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.removeEventListener('input', searchInput._inputHandler);
    searchInput._inputHandler = () => {
        const query = searchInput.value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
        if (query) {
            const cells = document.querySelectorAll('td');
            let matchedCell = null;
            cells.forEach(cell => {
                const nameDiv = cell.querySelector('.pokemon-name');
                const formDiv = cell.querySelector('.pokemon-form');
                const numberDiv = cell.querySelector('.pokemon-number');
                const normalizedName = nameDiv?.textContent.toLowerCase().replace(/[^a-z0-9\s]/g, '');
                const normalizedForm = formDiv?.textContent.toLowerCase().replace(/[^a-z0-9\s]/g, '');
                const normalizedNumber = numberDiv?.textContent.toLowerCase().replace(/[^a-z0-9\s]/g, '');
                if (
                    normalizedName?.includes(query) ||
                    normalizedForm?.includes(query) ||
                    normalizedNumber?.includes(query.replace('#', ''))
                ) {
                    matchedCell = cell;
                    return;
                }
            });
            if (matchedCell) {
                const headerHeight = document.querySelector('.header').offsetHeight || 130;
                const cellTop = matchedCell.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: cellTop - headerHeight - 10,
                    behavior: 'smooth'
                });
            }
        }
    };
    searchInput.addEventListener('input', searchInput._inputHandler);
    applyFilter(currentFilter);
}

function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

function handleCellClick(key, cell) {
    const scrollY = window.pageYOffset;
    const currentState = cellStates[key] || 'grey';
    const nextState = {
        'grey': 'yellow',
        'yellow': 'blue',
        'blue': 'red',
        'red': 'grey'
    }[currentState];
    cellStates[key] = nextState;
    updateCellColor(cell, nextState);
    saveCellStates();
    window.scrollTo({ top: scrollY, behavior: 'instant' });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        showDebug('DOM fully loaded');
        ['shiny', 'xxs', 'xxl', 'hundo'].forEach(tab => {
            const tabElement = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            if (tabElement) {
                tabElement.addEventListener('click', () => {
                    switchTab(tab);
                    showDebug(`Tab clicked: ${tab}`);
                    setTimeout(() => {}, 5000);
                });
            } else {
                showDebug(`Tab element tab${tab.charAt(0).toUpperCase() + tab.slice(1)} not found`);
                setTimeout(() => {}, 5000);
            }
        });
        initGenerationTabs();
        switchTab('shiny');
    } catch (error) {
        document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later. (domcatch)</p>';
        showDebug('Initialization error: ' + error.message);
        setTimeout(() => {}, 5000);
    }
});
