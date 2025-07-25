// Pokémon JSON data
let pokemonData = null;
let currentTab = 'shiny';
const cellStates = {};

// Load saved states from localStorage and merge with URL parameters
function loadCellStates() {
    // Load from localStorage
    const savedStates = localStorage.getItem('pokemonCellStates');
    if (savedStates) {
        Object.assign(cellStates, JSON.parse(savedStates));
    }
    // Merge with URL parameters (URL takes precedence)
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((value, key) => {
        if (['grey', 'yellow', 'blue', 'red'].includes(value)) {
            cellStates[key] = value;
        }
    });
    // Save merged states back to localStorage
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

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick="switchTab('${tab}')"]`).classList.add('active');
    renderTabContent(tab);
}

// Render tab content
function renderTabContent(tab) {
    const content = document.getElementById('content');
    content.innerHTML = '';
    
    const sortedKeys = Object.keys(pokemonData).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedKeys.forEach(fileNumber => {
        const generation = pokemonData[fileNumber];
        const generationName = generation['generation-name'];
        const data = generation[tab] || (tab === 'shiny' ? {} : []);
        
        const section = document.createElement('div');
        section.className = 'tab-content';
        section.innerHTML = `<h2>${generationName} - ${tab.toUpperCase()}</h2>`;
        const table = document.createElement('table');
        let row;
        
        if (tab === 'shiny') {
            const entries = Object.keys(data).sort();
            entries.forEach((key, index) => {
                if (index % 5 === 0) {
                    row = table.insertRow();
                }
                const [number, name, variant] = key.split('-');
                const [form, imageUrl] = data[key];
                const displayNumber = number.padStart(3, '0');
                const imageSrc = imageUrl || `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${displayNumber}.png`;
                const displayForm = form === 'normal' ? '' : form;
                
                const cell = row.insertCell();
                cell.innerHTML = `
                    <div><strong>#${displayNumber}</strong></div>
                    <div><img src="${imageSrc}" alt="${name} ${form}"></div>
                    <div>${name}</div>
                    <div>${displayForm}</div>
                `;
                cell.dataset.key = key;
                cell.dataset.tab = tab;
                // Apply saved state or default to grey
                cellStates[key] = cellStates[key] || 'grey';
                updateCellColor(cell, cellStates[key]);
                cell.addEventListener('click', () => handleCellClick(key, cell));
            });
        } else {
            data.sort().forEach((key, index) => {
                if (index % 5 === 0) {
                    row = table.insertRow();
                }
                const [number, name, variant] = key.split('-');
                const displayNumber = number.padStart(3, '0');
                const cell = row.insertCell();
                cell.innerHTML = `
                    <div><strong>#${displayNumber}</strong></div>
                    <div><img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/${displayNumber}.png" alt="${name} ${variant.toUpperCase()}"></div>
                    <div>${name}</div>
                    <div>${variant.toUpperCase()}</div>
                `;
                cell.dataset.key = key;
                cell.dataset.tab = tab;
                // Apply saved state or default to grey
                cellStates[key] = cellStates[key] || 'grey';
                updateCellColor(cell, cellStates[key]);
                cell.addEventListener('click', () => handleCellClick(key, cell));
            });
        }
        
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
    const currentState = cellStates[key];
    let nextState;
    if (currentState === 'grey') nextState = 'yellow';
    else if (currentState === 'yellow') nextState = 'blue';
    else if (currentState === 'blue') nextState = 'red';
    else nextState = 'grey';
    cellStates[key] = nextState;
    updateCellColor(cell, nextState);
    saveCellStates(); // Save to localStorage after each click
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
    if (e.target.id === 'saveButton' || e.target.id === 'topButton' || e.target.classList.contains('grip')) return;
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