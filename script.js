// Pokémon JSON data
let pokemonData = null;
let currentTab = 'shiny';
let currentFilter = null; // Track active filter (grey, yellow, blue, red, or null)
const cellStates = {};
let isProcessingTap = false; // Flag to prevent double taps

// Load saved states from localStorage and merge with URL parameters
function loadCellStates() {
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
}

// Save cell states to localStorage
function saveCellStates() {
    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
}

// Fetch data and initialize tabs
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
        loadCellStates();
        initTabs();
        initFilterButtons();
        initClearButton();
        document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
        console.error('Error loading JSON:', error);
        document.getElementById('content').innerHTML = '<p>Failed to load Pokémon data.</p>';
        document.getElementById('debug').innerText = `Error: ${error.message}`;
        document.getElementById('loading').style.display = 'none';
    });

// Initialize tabs
function initTabs() {
    if (!pokemonData) {
        document.getElementById('content').innerHTML = '<p>No Pokémon data available.</p>';
        document.getElementById('debug').innerText = 'No Pokémon data available';
        return;
    }
    switchTab(currentTab);
}

// Initialize filter buttons
function initFilterButtons() {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    filters.forEach(color => {
        const button = document.getElementById(`filter${color.charAt(0).toUpperCase() + color.slice(1)}`);
        button.addEventListener('click', () => toggleFilter(color));
    });
}

// Initialize clear button
function initClearButton() {
    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', clearAllStates);
}

// Clear all cell states and filters
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

// Toggle filter
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
    renderTabContent(currentTab);
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'hundo-active');
        if (btn.getAttribute('onclick') === `switchTab('${tab}')`) {
            btn.classList.add(tab === 'hundo' ? 'hundo-active' : 'active');
        }
    });
    renderTabContent(tab);
}

// Render tab content
function renderTabContent(tab) {
    const content = document.getElementById('content');
    content.innerHTML = '';
    
    const sortedKeys = Object.keys(pokemonData).sort((a, b) => Number(a) - Number(b));
    
    sortedKeys.forEach(fileNumber => {
        const generation = pokemonData[fileNumber];
        const generationName = generation['generation-name'] || `Generation ${fileNumber}`;
        const data = generation[tab] || [];
        
        const section = document.createElement('div');
        section.className = 'tab-content';
        section.innerHTML = `<h2>Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;
        const table = document.createElement('table');
        let row;
        let cellCount = 0;
        
        let entries = [];
        if (tab === 'shiny') {
            entries = Object.keys(data).sort((a, b) => {
                const numA = parseInt(a.split('-')[0], 10);
                const numB = parseInt(b.split('-')[0], 10);
                return numA - numB;
            });
        } else {
            if (!Array.isArray(data)) {
                console.warn(`Data for tab "${tab}" in generation ${generationName} is not an array.`);
                return;
            }
            entries = data.sort((a, b) => {
                const numA = parseInt(a.split('-')[0], 10);
                const numB = parseInt(b.split('-')[0], 10);
                return numA - numB;
            });
        }

        entries.forEach((key, index) => {
            const state = cellStates[key] || 'grey';
            if (currentFilter && state !== currentFilter) {
                return;
            }

            if (cellCount % 5 === 0) {
                row = table.insertRow();
            }

            let number, name, variant, form, imageUrl, displayNumber, displayVariant, imageSrc, displayForm;
            if (tab === 'shiny') {
                [number, name, variant] = key.split('-');
                [form, imageUrl] = data[key] || ['normal', ''];
                displayNumber = number.padStart(3, '0');
                imageSrc = imageUrl || `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${displayNumber}.png`;
                displayForm = form === 'normal' ? '' : form;
            } else {
                [number, name, variant] = key.split('-');
                displayNumber = number.padStart(3, '0');
                displayVariant = variant ? variant.toUpperCase() : '';
                imageSrc = `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${displayNumber}.png`;
                displayForm = displayVariant;
            }

            const cell = row.insertCell();
            cell.innerHTML = `
                <div><strong>#${displayNumber}</strong></div>
                <div><img src="${imageSrc}" alt="${name} ${displayForm}"></div>
                <div>${name}</div>
                <div>${displayForm}</div>
            `;
            cell.dataset.key = key;
            cell.dataset.tab = tab;
            cellStates[key] = cellStates[key] || 'grey';
            updateCellColor(cell, cellStates[key]);
            
            // Single event listener for click, with touchstart fallback
            cell.addEventListener('click', (e) => {
                if (isProcessingTap) return;
                isProcessingTap = true;
                handleCellClick(key, cell);
                setTimeout(() => { isProcessingTap = false; }, 100); // Reset flag after 100ms
            });
            
            cellCount++;
        });
        
        if (table.rows.length > 0) {
            section.appendChild(table);
            content.appendChild(section);
        }
    });
}

// Update cell border color based on state
function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

// Handle cell click to cycle colors
function handleCellClick(key, cell) {
    const currentState = cellStates[key] || 'grey';
    let nextState;
    if (currentState === 'grey') nextState = 'yellow';
    else if (currentState === 'yellow') nextState = 'blue';
    else if (currentState === 'blue') nextState = 'red';
    else nextState = 'grey';
    cellStates[key] = nextState;
    updateCellColor(cell, nextState);
    saveCellStates();
    renderTabContent(currentTab);
}

// Save button to generate URL and copy to clipboard
document.getElementById('saveButton').addEventListener('click', () => {
    const params = new URLSearchParams();
    Object.keys(cellStates).forEach(key => {
        if (cellStates[key] !== 'grey') {
            params.set(key, cellStates[key]);
        }
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast();
    });
});

// Show toast notification
function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Top button to scroll to top
document.getElementById('topButton').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Draggable bar functionality
const draggableBar = document.getElementById('draggableBar');
let isDragging = false;
let currentX;
let initialX;
let xOffset = 0;

draggableBar.addEventListener('mousedown', startDragging);
draggableBar.addEventListener('touchstart', startDragging);
document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);
document.addEventListener('mouseup', stopDragging);
document.addEventListener('touchend', stopDragging);

function startDragging(e) {
    if (e.target.id === 'saveButton' || e.target.id === 'topButton' || e.target.id === 'clearButton' || e.target.classList.contains('grip') || e.target.classList.contains('filter-button')) return;
    initialX = e.type === 'touchstart' ? e.touches[0].clientX - xOffset : e.clientX - xOffset;
    isDragging = true;
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        xOffset = currentX - initialX;
        const barWidth = draggableBar.offsetWidth;
        const maxX = window.innerWidth - barWidth - 10;
        xOffset = Math.max(10, Math.min(xOffset, maxX));
        draggableBar.style.left = xOffset + 'px';
    }
}

function stopDragging() {
    isDragging = false;
}