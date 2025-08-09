let pokemonData = null;
let currentTab = null;
let currentFilter = null;
const cellStates = {};

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
    // Load states from URL's base64-encoded data parameter
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            const decoded = JSON.parse(atob(data));
            currentTab = decoded.tab;
            currentFilter = decoded.filter;
            Object.assign(cellStates, decoded.states);
        } catch (error) {
            document.getElementById('content').innerHTML = '<p>Invalid share data.</p>';
        }
    } else {
        document.getElementById('content').innerHTML = '<p>No share data provided.</p>';
    }
}

function renderTabContent() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) {
        content.innerHTML = '<p>No Pokémon data available.</p>';
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
        section.innerHTML = `<h2 data-gen="${genNumber}">Gen ${genNumber} - ${generationName} - ${currentTab.toUpperCase()}${currentFilter ? ` (${currentFilter.toUpperCase()} Filter)` : ''}</h2>`;

        const table = document.createElement('table');
        let row;
        let cellCount = 0;

        pokemons.forEach(pokemon => {
            const formsToRender = currentTab === 'shiny' ? pokemon.forms : pokemon.forms.filter(f => f.form === pokemon.base_form);

            formsToRender.forEach(form => {
                if (currentTab === 'shiny' && NO_NORMAL_SHINY.has(pokemon.id) && form.form === pokemon.base_form) {
                    return;
                }
                if (currentTab !== 'shiny' && !form[currentTab]) {
                    return;
                }

                const key = currentTab === 'shiny' ? `shiny-${form.key}` : `${currentTab}-${pokemon.id}`;
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
                const imageSrc = currentTab === 'shiny' && form.shiny ? form.shiny.image : form.normal.image;

                const cell = row.insertCell();
                cell.innerHTML = `
                    <div class="pokemon-number"><strong>#${displayNumber}</strong></div>
                    <div><img src="${imageSrc}" alt="${displayName} ${displayForm || form.form}" onerror="this.classList.add('error');"></div>
                    <div class="pokemon-name">${displayName}</div>
                    <div class="pokemon-form">${displayForm}</div>
                `;
                cell.dataset.key = key;
                cell.dataset.tab = currentTab;
                updateCellColor(cell, state);

                cellCount++;
            });
        });

        if (table.rows.length > 0) {
            section.appendChild(table);
            content.appendChild(section);
        } else {
            section.innerHTML += `<p>No ${currentTab.toUpperCase()} Pokémon available for Gen ${genNumber}${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });

    // Add search functionality (read-only)
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
        renderTabContent();
        document.getElementById('loading').style.display = 'none';
    })
    .catch(error => {
        document.getElementById('content').innerHTML = '<p>Failed to load Pokémon data. Please check the JSON file or network connection.</p>';
        document.getElementById('loading').style.display = 'none';
    });