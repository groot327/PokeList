let pokemonData = null;
let currentTab = localStorage.getItem('currentTab') || 'shiny';
let currentFilter = null;
const cellStates = {};
let isProcessingTap = false;

// NO_NORMAL_SHINY with leading zeros to match JSON id
const NO_NORMAL_SHINY = new Set([
    "201", "421", "422", "423", "479", "492", "555", "585", "586", "647",
    "648", "649", "669", "670", "671", "676", "710", "711", "741", "745",
    "849", "877", "892", "905", "925", "978"
]);

// Responsive cell count
let cellsForScreen = 5;
let myScreenWidth = window.screen.width;
if (myScreenWidth < 601) {
    cellsForScreen = 3;
} else if (myScreenWidth > 1024) {
    cellsForScreen = 7;
}
document.documentElement.style.setProperty('--cells-for-screen', cellsForScreen);

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
        console.error('Error loading cell states:', error);
        showDebug('Error loading saved states. Using default states.');
    }
}

function saveCellStates() {
    try {
        localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
    } catch (error) {
        console.error('Error saving cell states:', error);
        showDebug('Error saving states to localStorage. Storage may be full.');
    }
}

function showDebug(message) {
    const debug = document.getElementById('debug');
    debug.innerHTML = message;
    debug.style.display = 'block';
    setTimeout(() => {
        debug.style.display = 'none';
    }, 5000); // Hide after 5 seconds
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

fetch('pokemon.json') // Update to your actual JSON file name
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
        document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
        console.error('Error loading Pokémon data:', error);
        document.getElementById('content').innerHTML = '<p>Failed to load Pokémon data. Please check the JSON file or network connection.</p>';
        showDebug(`Error: ${error.message}`);
        document.getElementById('loading').style.display = 'none';
    });

function initTabs() {
    if (!pokemonData) {
        document.getElementById('content').innerHTML = '<p>No Pokémon data available.</p>';
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
        if (params.toString().length > 2000) {
            showDebug('Warning: URL may be too long for some browsers. Consider exporting instead.');
        }
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('URL copied to clipboard');
        }).catch(() => {
            showDebug('Failed to copy URL to clipboard');
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
            showDebug('Failed to export states');
        }
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

    document.getElementById('menuImportButton').addEventListener('click', () => {
        document.getElementById('importFile').click();
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });

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
                    console.error('Error importing states:', error);
                    showDebug('Failed to import states: Invalid file format');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }
    });
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
    if (currentFilter === color) {
        currentFilter = null;
        const filters = ['grey', 'yellow', 'blue', 'red'];
        filters.forEach(c => {
            document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`).classList.remove('active');
        });
    } else {
        currentFilter = color;
        const filters = ['grey', 'yellow', 'blue', 'red'];
        filters.forEach(c => {
            const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            btn.classList.toggle('active', c === color);
        });
    }
    renderTabContent(currentTab);
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
}

function scrollToGeneration(genNumber) {
    const section = document.querySelector(`.tab-content h2[data-gen="${genNumber}"]`);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight || 130;
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
    }
}

function renderTabContent(tab) {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) {
        content.innerHTML = '<p>No Pokémon data available.</p>';
        showDebug('No Pokémon data available');
        return;
    }

    // Group Pokémon by generation_number
    const generations = {};
    pokemonData.pokemon.forEach(pokemon => {
        const gen = pokemon.generation_number;
        if (!generations[gen]) {
            generations[gen] = [];
        }
        generations[gen].push(pokemon);
    });

    // Sort generations numerically
    const sortedGenKeys = Object.keys(generations).sort((a, b) => Number(a) - Number(b));

    sortedGenKeys.forEach(genNumber => {
        const pokemons = generations[genNumber].sort((a, b) => Number(a.id) - Number(b.id));
        const generationName = pokemons[0]?.generation || `Generation ${genNumber}`;
        const section = document.createElement('div');
        section.className = 'tab-content';
        section.innerHTML = `<h2 data-gen="${genNumber}">Gen ${genNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;

        const table = document.createElement('table');
        let row;
        let cellCount = 0;

        pokemons.forEach(pokemon => {
            // For Shiny tab, show all forms; for XXS/XXL/Hundo, show only base form
            const formsToRender = tab === 'shiny' ? pokemon.forms : pokemon.forms.filter(f => f.form === pokemon.base_form);

            formsToRender.forEach(form => {
                // Skip base form in shiny tab for NO_NORMAL_SHINY Pokémon
                if (tab === 'shiny' && NO_NORMAL_SHINY.has(pokemon.id) && form.form === pokemon.base_form) {
                    return;
                }
                // Skip forms that don't apply to xxs/xxl/hundo tabs
                if (tab !== 'shiny' && !form[tab]) {
                    return;
                }

                // Use tab-specific key: shiny-<form.key> for shiny, <tab>-<id> for xxs/xxl/hundo
                const key = tab === 'shiny' ? `shiny-${form.key}` : `${tab}-${pokemon.id}`;
                const state = cellStates[key] || 'grey';
                if (currentFilter && state !== currentFilter) {
                    return;
                }

                if (cellCount % cellsForScreen === 0) {
                    row = table.insertRow();
                }

                const displayNumber = pokemon.id;
                const displayName = pokemon.name;
                const displayForm = form.form === pokemon.base_form ? '' : form.form;
                const imageSrc = tab === 'shiny' && form.shiny ? form.shiny.image : form.normal.image;

                const cell = row.insertCell();
                cell.innerHTML = `
                    <div class="pokemon-number"><strong>#${displayNumber}</strong></div>
                    <div><img src="${imageSrc}" alt="${displayName} ${displayForm || form.form}" onerror="this.classList.add('error');"></div>
                    <div class="pokemon-name">${displayName}</div>
                    <div class="pokemon-form">${displayForm}</div>
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
            section.appendChild(table);
            content.appendChild(section);
        } else {
            section.innerHTML += `<p>No ${tab.toUpperCase()} Pokémon available for Gen ${genNumber}${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });

    // Add search functionality
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