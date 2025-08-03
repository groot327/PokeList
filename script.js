let pokemonData = null;
let currentTab = localStorage.getItem('currentTab') || 'shiny';
let currentGeneration = localStorage.getItem('currentGeneration') || null;
let currentFilter = null;
const cellStates = {};
let isProcessingTap = false;

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
    urlParams.forEach((value, key) => {
        if (['grey', 'yellow', 'blue', 'red'].includes(value)) {
            cellStates[key] = value;
        }
    });
    saveCellStates();
}

function saveCellStates() {
    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
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
        console.log('Pokémon data loaded:', data);
        loadCellStates();
        initTabs();
        initFilterButtons();
        initMenu();
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
    switchTab(currentTab);
    updateGenerationButtons();
}

function initFilterButtons() {
    const filters = ['grey', 'yellow', 'blue', 'red'];
    filters.forEach(color => {
        const button = document.getElementById(`filter${color.charAt(0).toUpperCase() + color.slice(1)}`);
        button.addEventListener('click', () => toggleFilter(color));
        const menuButton = document.getElementById(`menuFilter${color.charAt(0).toUpperCase() + color.slice(1)}`);
        menuButton.addEventListener('click', () => {
            toggleFilter(color);
            document.getElementById('side-menu').classList.remove('active');
        });
    });
}

function initMenu() {
    const hamburger = document.getElementById('hamburger');
    const sideMenu = document.getElementById('side-menu');
    const closeMenu = document.getElementById('closeMenu');

    sideMenu.classList.remove('active');
    hamburger.style.visibility = 'visible'; // Ensure hamburger is visible on load

    hamburger.addEventListener('click', () => {
        sideMenu.classList.add('active');
        hamburger.style.visibility = 'hidden'; // Hide hamburger when menu opens
    });

    closeMenu.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible'; // Show hamburger when menu closes
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
            showToast();
        });
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible'; // Show hamburger after save
    });

    document.getElementById('menuTopButton').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible'; // Show hamburger after scroll
    });

    document.getElementById('menuClearButton').addEventListener('click', () => {
        clearAllStates();
        sideMenu.classList.remove('active');
        hamburger.style.visibility = 'visible'; // Show hamburger after clear
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
        document.getElementById(`menuFilter${c.charAt(0).toUpperCase() + c.slice(1)}`).classList.remove('active');
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
            document.getElementById(`menuFilter${c.charAt(0).toUpperCase() + c.slice(1)}`).classList.remove('active');
        });
    } else {
        currentFilter = color;
        filters.forEach(c => {
            const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            const menuBtn = document.getElementById(`menuFilter${c.charAt(0).toUpperCase() + c.slice(1)}`);
            btn.classList.toggle('active', c === color);
            menuBtn.classList.toggle('active', c === color);
        });
    }
    renderTabContent(currentTab);
}

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('currentTab', tab);
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'hundo-active');
        if (btn.getAttribute('onclick') === `switchTab('${tab}')`) {
            btn.classList.add(tab === 'hundo' ? 'hundo-active' : 'active');
        }
    });
    renderTabContent(tab);
}

function scrollToGeneration(genNumber) {
    currentGeneration = genNumber;
    localStorage.setItem('currentGeneration', genNumber);
    const section = document.querySelector(`.tab-content h2[data-gen="${genNumber}"]`);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight || 180;
        const sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: sectionTop - headerHeight - 10,
            behavior: 'smooth'
        });
        updateGenerationButtons();
    }
}

function updateGenerationButtons() {
    const buttons = document.querySelectorAll('.gen-button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') === `scrollToGeneration('${currentGeneration}')`) {
            btn.classList.add('active');
        }
    });
}

function renderTabContent(tab) {
    const content = document.getElementById('content');
    content.innerHTML = '';
    
    const sortedKeys = Object.keys(pokemonData).sort((a, b) => Number(a) - Number(b));
    console.log('Rendering tab:', tab, 'Available generations:', sortedKeys); // Debug: Log available generations
    
    sortedKeys.forEach(fileNumber => {
        const generation = pokemonData[fileNumber];
        const generationName = generation['generation-name'] || `Generation ${fileNumber}`;
        const data = generation[tab] || [];
        
        console.log(`Generation ${fileNumber} (${generationName}):`, { tab, data }); // Debug: Log data for each generation
        
        const section = document.createElement('div');
        section.className = 'tab-content';
        section.innerHTML = `<h2 data-gen="${fileNumber}">Gen ${fileNumber} - ${generationName} - ${tab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;
        
        // Check if data is empty or invalid
        if (!data || (tab === 'shiny' && Object.keys(data).length === 0) || (tab !== 'shiny' && Array.isArray(data) && data.length === 0)) {
            section.innerHTML += `<p>No ${tab.toUpperCase()} data available for Gen ${fileNumber}.</p>`;
            content.appendChild(section);
            return;
        }

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
                section.innerHTML += `<p>Error: Invalid data format for ${tab.toUpperCase()} in Gen ${fileNumber}.</p>`;
                content.appendChild(section);
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

            if (cellCount % cellsForScreen === 0) {
                row = table.insertRow();
            }

            let number, name, variant, form, imageUrl, displayNumber, displayVariant, imageSrc, displayForm;
            let baseImageUrl = "https://groot327.github.io/PokeList/PokeImgs";
            if (tab === 'shiny') {
                [number, name, variant] = key.split('-');
                [form, imageUrl] = data[key] || ['normal', ''];
                displayNumber = number.padStart(3, '0');
                imageSrc = imageUrl || `${baseImageUrl}/pm${Number(displayNumber)}.s.icon.png`;
                displayForm = form === 'normal' ? '' : form;
            } else {
                [number, name, variant] = key.split('-');
                displayNumber = number.padStart(3, '0');
                displayVariant = variant ? variant.toUpperCase() : '';
                imageSrc = imageUrl || `${baseImageUrl}/pm${Number(displayNumber)}.icon.png`;
                displayForm = displayVariant;
            }

            const cell = row.insertCell();
            cell.innerHTML = `
                <div><strong>#${displayNumber}</strong></div>
                <div><img src="${imageSrc}" alt="${name} ${displayForm}"></div>
                <div style="display: block;">${name}</div>
                <div style="display: block;">${displayForm}</div>
            `;
            cell.dataset.key = key;
            cell.dataset.tab = tab;
            cellStates[key] = cellStates[key] || 'grey';
            updateCellColor(cell, cellStates[key]);
            
            cell.addEventListener('click', (e) => {
                if (isProcessingTap) return;
                isProcessingTap = true;
                handleCellClick(key, cell);
                setTimeout(() => { isProcessingTap = false; }, 100);
            });
            
            cellCount++;
        });
        
        if (table.rows.length > 0) {
            section.appendChild(table);
            content.appendChild(section);
        } else {
            section.innerHTML += `<p>No ${tab.toUpperCase()} Pokémon available for Gen ${fileNumber}${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });
    
    updateGenerationButtons();
    
    if (currentGeneration) {
        setTimeout(() => scrollToGeneration(currentGeneration), 0);
    }
}

function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

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

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.getElementById('topButton').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
    if (e.target.id === 'saveButton' || e.target.id === 'topButton' || e.target.classList.contains('grip') || e.target.classList.contains('filter-button')) return;
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