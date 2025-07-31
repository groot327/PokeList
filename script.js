let pokemonData = null;
let currentTab = localStorage.getItem('currentTab') || 'shiny';
let currentGeneration = localStorage.getItem('currentGeneration') || null;
let currentFilter = null;
const cellStates = {};
let isProcessingTap = false;
let sortedEntriesCache = {};

let cellsForScreen = 5;
let myScreenWidth = window.screen.width;
if (myScreenWidth < 601) {
    cellsForScreen = 3;
} else if (myScreenWidth > 1024) {
    cellsForScreen = 7;
}
document.documentElement.style.setProperty('--cells-for-screen', cellsForScreen);

function loadCellStates() {
    const savedStates = localStorage.getItem('pokemonCellStates');
    if (savedStates) {
        Object.assign(cellStates, JSON.parse(savedStates));
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('states')) {
        try {
            Object.assign(cellStates, JSON.parse(atob(urlParams.get('states'))));
        } catch (e) {
            console.error('Error parsing URL states:', e);
            document.getElementById('debug').innerHTML = `Error parsing URL states: ${e.message}`;
            document.getElementById('debug').style.display = 'block';
        }
    }
    saveCellStates();
}

function saveCellStates() {
    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
}

function cacheSortedEntries() {
    Object.keys(pokemonData).forEach(fileNumber => {
        sortedEntriesCache[fileNumber] = {};
        ['shiny', 'xxl', 'xxs', 'hundo'].forEach(tab => {
            const data = pokemonData[fileNumber][tab] || [];
            sortedEntriesCache[fileNumber][tab] = (tab === 'shiny' ? Object.keys(data) : data)
                .sort((a, b) => parseInt(a.split('-')[0], 10) - parseInt(b.split('-')[0], 10));
        });
    });
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
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Pokémon data is empty or invalid');
        }
        currentGeneration = currentGeneration || Object.keys(pokemonData)[0] || '1';
        localStorage.setItem('currentGeneration', currentGeneration);
        cacheSortedEntries();
        loadCellStates();
        initTabs();
        initFilterButtons();
        initMenu();
        initSearch();
        renderTabContent(currentTab);
        document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
        console.error('Error loading Pokémon data:', error);
        document.getElementById('content').innerHTML = '<p>Failed to load Pokémon data. Please check the JSON file or network connection.</p>';
        document.getElementById('debug').innerHTML = `Error: ${error.message}`;
        document.getElementById('debug').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    });

function initTabs() {
    if (!pokemonData) {
        document.getElementById('content').innerHTML = '<p>No Pokémon data available.</p>';
        document.getElementById('debug').innerHTML = 'No Pokémon data available';
        document.getElementById('debug').style.display = 'block';
        return;
    }
    const tabMap = {
        'shiny': 'tabShiny',
        'xxl': 'tabXXL',
        'xxs': 'tabXXS',
        'hundo': 'tabHundo'
    };
    Object.entries(tabMap).forEach(([tab, buttonId]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.toggle('active', tab === currentTab);
        } else {
            console.warn(`Tab button #${buttonId} not found`);
            document.getElementById('debug').innerHTML = `Warning: Tab button #${buttonId} not found`;
            document.getElementById('debug').style.display = 'block';
            setTimeout(() => {
                document.getElementById('debug').style.display = 'none';
            }, 3000);
        }
    });
    updateGenerationButtons();
    renderTabContent(currentTab);
}

function initFilterButtons() {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    filters.forEach(color => {
        const button = document.getElementById(`filter${color.charAt(0).toUpperCase() + color.slice(1)}`);
        if (button) {
            button.addEventListener('click', () => toggleFilter(color));
        } else {
            console.warn(`Filter button #filter${color.charAt(0).toUpperCase() + color.slice(1)} not found`);
            document.getElementById('debug').innerHTML = `Warning: Filter button #filter${color.charAt(0).toUpperCase() + color.slice(1)} not found`;
            document.getElementById('debug').style.display = 'block';
            setTimeout(() => {
                document.getElementById('debug').style.display = 'none';
            }, 3000);
        }
    });
}

function initMenu() {
    const hamburger = document.getElementById('hamburger');
    const sideMenu = document.getElementById('side-menu');
    const closeMenu = document.getElementById('closeMenu');
    if (!hamburger || !sideMenu || !closeMenu) {
        console.error('Menu elements missing');
        document.getElementById('debug').innerHTML = 'Error: Menu elements (hamburger, side-menu, or closeMenu) missing';
        document.getElementById('debug').style.display = 'block';
        return;
    }
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
    const saveButton = document.getElementById('menuSaveButton');
    const clearButton = document.getElementById('menuClearButton');
    const exportButton = document.getElementById('menuExportButton');
    const importButton = document.getElementById('menuImportButton');
    if (!saveButton || !clearButton || !exportButton || !importButton) {
        console.error('Side menu buttons missing');
        document.getElementById('debug').innerHTML = 'Error: Side menu buttons missing';
        document.getElementById('debug').style.display = 'block';
        return;
    }
    saveButton.addEventListener('click', () => {
        const params = new URLSearchParams();
        params.set('states', btoa(JSON.stringify(cellStates)));
        const url = `${window.location.origin}${window.location.pathname}?${params}`;
        navigator.clipboard.writeText(url).then(() => showToast());
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });
    clearButton.addEventListener('click', () => {
        clearAllStates();
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });
    exportButton.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(cellStates)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokemon-states.json';
        a.click();
        URL.revokeObjectURL(url);
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible';
    });
    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    Object.assign(cellStates, JSON.parse(event.target.result));
                    saveCellStates();
                    renderTabContent(currentTab);
                } catch (e) {
                    console.error('Error importing states:', e);
                    document.getElementById('debug').innerHTML = `Error importing states: ${e.message}`;
                    document.getElementById('debug').style.display = 'block';
                }
                sideMenu.classList.remove('active');
                hamburger.style.visibility = 'visible';
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.error('Search input not found');
        document.getElementById('debug').innerHTML = 'Error: Search input not found';
        document.getElementById('debug').style.display = 'block';
        return;
    }
    searchInput.addEventListener('input', e => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) return;
        let found = false;
        Object.keys(pokemonData).some(fileNumber => {
            const tabs = Object.keys(pokemonData[fileNumber]).filter(key => key !== 'generation-name');
            return tabs.some(tab => {
                const entries = sortedEntriesCache[fileNumber][tab] || [];
                return entries.some(key => {
                    const [number, name] = key.split('-');
                    if (name.toLowerCase().includes(query) || number.includes(query)) {
                        const cell = document.querySelector(`td[data-key="${key}"][data-tab="${tab}"]`);
                        if (cell) {
                            const headerHeight = document.querySelector('.header').offsetHeight || 120;
                            const cellTop = cell.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                            window.scrollTo({ top: cellTop, behavior: 'smooth' });
                            found = true;
                            return true;
                        }
                    }
                    return false;
                });
            });
        });
        if (!found) {
            document.getElementById('debug').innerHTML = `No Pokémon found matching "${query}"`;
            document.getElementById('debug').style.display = 'block';
            setTimeout(() => {
                document.getElementById('debug').style.display = 'none';
            }, 3000);
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
        const button = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
        if (button) {
            button.classList.remove('active');
        }
    });
    saveCellStates();
    renderTabContent(currentTab);
}

function toggleFilter(color) {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    if (currentFilter === color) {
        currentFilter = null;
        filters.forEach(c => {
            const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            if (btn) {
                btn.classList.remove('active');
            }
        });
    } else {
        currentFilter = color;
        filters.forEach(c => {
            const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            if (btn) {
                btn.classList.toggle('active', c === color);
            }
        });
    }
    renderTabContent(currentTab);
}

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('currentTab', tab);
    const tabMap = {
        'shiny': 'tabShiny',
        'xxl': 'tabXXL',
        'xxs': 'tabXXS',
        'hundo': 'tabHundo'
    };
    Object.entries(tabMap).forEach(([t, buttonId]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.toggle('active', t === tab);
        }
    });
    renderTabContent(tab);
}

function scrollToGeneration(genNumber) {
    currentGeneration = genNumber;
    localStorage.setItem('currentGeneration', genNumber);
    const section = document.querySelector(`.tab-content h2[data-gen="${genNumber}"]`);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight || 120;
        const sectionTop = section.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({
            top: sectionTop,
            behavior: 'smooth'
        });
        updateGenerationButtons();
    }
}

function updateGenerationButtons() {
    const buttons = document.querySelectorAll('.gen-button');
    buttons.forEach(btn => {
        const gen = btn.textContent.replace('Gen ', '');
        btn.classList.toggle('active', gen === currentGeneration);
    });
}

function generateCellContent(key, tab) {
    const [number, name, variant] = key.split('-');
    const baseImageUrl = "https://groot327.github.io/PokeList/PokeImgs";
    let imageSrc, displayForm;
    if (tab === 'shiny') {
        const [form, imageUrl] = pokemonData[currentGeneration][tab][key] || ['normal', ''];
        imageSrc = imageUrl || `${baseImageUrl}/pm${Number(number)}.s.icon.png`;
        displayForm = form === 'normal' ? '' : form;
    } else {
        imageSrc = `${baseImageUrl}/pm${Number(number)}.icon.png`;
        displayForm = variant ? variant.toUpperCase() : '';
    }
    return `
        <div><strong>#${number.padStart(3, '0')}</strong></div>
        <div><img src="${imageSrc}" alt="${name} ${displayForm}" loading="lazy"></div>
        <div style="display: block;">${name}</div>
        <div style="display: block;">${displayForm}</div>
    `;
}

function renderTabContent(tab) {
    if (!pokemonData || !pokemonData[currentGeneration]) {
        console.error('Invalid pokemonData or currentGeneration');
        document.getElementById('content').innerHTML = '<p>Invalid Pokémon data or generation.</p>';
        document.getElementById('debug').innerHTML = `Error: Invalid pokemonData or currentGeneration ${currentGeneration}`;
        document.getElementById('debug').style.display = 'block';
        return;
    }
    const content = document.getElementById('content');
    const existingSections = Array.from(content.querySelectorAll('.tab-content'));
    const fragment = document.createDocumentFragment();
    const sortedKeys = Object.keys(pokemonData).sort((a, b) => Number(a) - Number(b));

    sortedKeys.forEach(fileNumber => {
        const generation = pokemonData[fileNumber];
        const generationName = generation['generation-name'] || `Generation ${fileNumber}`;
        const data = generation[tab] || [];
        let section = existingSections.find(s => s.querySelector(`h2[data-gen="${fileNumber}"]`));
        if (!section) {
            section = document.createElement('div');
            section.className = 'tab-content';
            section.innerHTML = `<h2 data-gen="${fileNumber}">Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;
        } else {
            section.querySelector('h2').textContent = `Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}`;
        }

        if (!data || (tab === 'shiny' && Object.keys(data).length === 0) || (tab !== 'shiny' && data.length === 0)) {
            section.innerHTML = `<h2 data-gen="${fileNumber}">Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}</h2><p>No ${tab.toUpperCase()} data available.</p>`;
            fragment.appendChild(section);
            return;
        }

        let table = section.querySelector('table');
        if (!table) {
            table = document.createElement('table');
            section.appendChild(table);
        } else {
            table.innerHTML = '';
        }

        let row, cellCount = 0;
        let entries = sortedEntriesCache[fileNumber][tab] || [];
        entries.forEach((key, index) => {
            const state = cellStates[key] || 'grey';
            if (currentFilter && state !== currentFilter) return;
            if (cellCount % cellsForScreen === 0) row = table.insertRow();
            const existingCell = document.querySelector(`td[data-key="${key}"][data-tab="${tab}"]`);
            let cell;
            if (existingCell && existingCell.dataset.tab === tab) {
                cell = existingCell;
                cell.innerHTML = generateCellContent(key, tab);
                cell.className = state;
            } else {
                cell = row.insertCell();
                cell.dataset.key = key;
                cell.dataset.tab = tab;
                cell.innerHTML = generateCellContent(key, tab);
                cell.className = state;
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `Toggle state for ${key.split('-')[1]} ${tab === 'shiny' ? (pokemonData[fileNumber][tab][key]?.[0] || '') : key.split('-')[2] || ''}`);
                cell.tabIndex = 0;
                cell.onclick = () => {
                    if (isProcessingTap) return;
                    isProcessingTap = true;
                    handleCellClick(key, cell);
                    setTimeout(() => { isProcessingTap = false; }, 100);
                };
                cell.onkeydown = e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCellClick(key, cell);
                    }
                };
            }
            cellCount++;
        });

        if (table.rows.length > 0) {
            section.appendChild(table);
        } else {
            section.innerHTML = `<h2 data-gen="${fileNumber}">Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}</h2><p>No ${tab.toUpperCase()} Pokémon available${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
        }
        fragment.appendChild(section);
    });

    content.innerHTML = '';
    content.appendChild(fragment);
}

function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

function handleCellClick(key, cell) {
    if (!cell) {
        console.error('Cell is null in handleCellClick');
        document.getElementById('debug').innerHTML = 'Error: Cell is null in handleCellClick';
        document.getElementById('debug').style.display = 'block';
        return;
    }
    const currentState = cellStates[key] || 'grey';
    let nextState;
    if (currentState === 'grey') nextState = 'yellow';
    else if (currentState === 'yellow') nextState = 'blue';
    else if (currentState === 'blue') nextState = 'red';
    else nextState = 'grey';
    cellStates[key] = nextState;
    cell.className = nextState;
    updateCellColor(cell, nextState);
    saveCellStates();
}

function showToast() {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        document.getElementById('debug').innerHTML = 'Error: Toast element not found';
        document.getElementById('debug').style.display = 'block';
        return;
    }
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}