import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let pokemonData = null;
let currentTab = null;
let currentFilter = null;
const cellStates = {};

const NO_NORMAL_SHINY = new Set([
    "201", "421", "422", "423", "479", "492", "555", "585", "586", "647",
    "648", "649", "669", "670", "671", "676", "710", "711", "741", "745",
    "849", "877", "892", "905", "925", "978"
]);

let cellsForScreen = 5;
let myScreenWidth = window.screen.width;
if (myScreenWidth < 601) {
    cellsForScreen = 3;
} else if (myScreenWidth > 1024) {
    cellsForScreen = 7;
}
document.documentElement.style.setProperty('--cells-for-screen', cellsForScreen);

function showDebug(message) {
    console.error('DEBUG:', message);
    const debug = document.getElementById('debug');
    debug.innerHTML = `<!-- ${message} -->`;
}

function renderTabContent() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) {
        content.innerHTML = '<p>Something went wrong. Please try again later.</p>';
        showDebug('No Pokémon data available');
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
            section.innerHTML += `<p class="center">No Gen ${genNumber} ${currentTab.toUpperCase()} Pokémon available${currentFilter ? ` with ${currentFilter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });
}

function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

function displayPokemon(data) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) {
        container.innerHTML = '<p>Something went wrong. Please try again later.</p>';
        showDebug('No Pokémon data available');
        return;
    }

    const { tab, filter, states } = data;
    currentTab = tab;
    currentFilter = filter;
    Object.assign(cellStates, states);

    const pokemonList = pokemonData.pokemon.filter(p => {
        const id = p.id.toString().padStart(3, '0');
        return tab === 'shiny' || !NO_NORMAL_SHINY.has(id);
    });

    document.getElementById('form-filter').innerHTML = tab.toUpperCase();
    if (filter) {
        document.getElementById('form-filter').innerHTML += ` - ${filter.toUpperCase()} Filter`;
    }

    const generations = {};
    pokemonList.forEach(pokemon => {
        const gen = pokemon.generation_number;
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(pokemon);
    });

    const sortedGenKeys = Object.keys(generations).sort((a, b) => Number(a) - Number(b));

    sortedGenKeys.forEach(genNumber => {
        const pokemons = generations[genNumber].sort((a, b) => Number(a.id) - Number(b.id));
        const generationName = pokemons[0]?.generation || `Generation ${genNumber}`;
        const section = document.createElement('div');
        section.className = 'tab-content display-title';
        section.innerHTML = `<h2 data-gen="${genNumber}">Gen ${genNumber} - ${generationName}</h2>`;

        const table = document.createElement('table');
        let row;
        let cellCount = 0;

        pokemons.forEach(pokemon => {
            const formsToRender = tab === 'shiny' ? pokemon.forms : pokemon.forms.filter(f => f.form === pokemon.base_form);

            formsToRender.forEach(form => {
                if (tab === 'shiny' && NO_NORMAL_SHINY.has(pokemon.id.toString().padStart(3, '0')) && form.form === pokemon.base_form) {
                    return;
                }
                if (tab !== 'shiny' && !form[tab]) {
                    return;
                }

                const key = tab === 'shiny' ? `shiny-${form.key}` : `${tab}-${pokemon.id}`;
                const state = states[key] || 'grey';
                if (filter && state !== filter) {
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
                updateCellColor(cell, state);

                cellCount++;
            });
        });

        if (table.rows.length > 0) {
            section.appendChild(table);
            container.appendChild(section);
        } else {
            section.innerHTML += `<p class="center">No Gen ${genNumber} ${tab.toUpperCase()} Pokémon available${filter ? ` with ${filter} filter` : ''}.</p>`;
            content.appendChild(section);
        }
    });

    showDebug('Successfully rendered Pokémon data for tab: ' + tab + (filter ? ' with filter: ' + filter : ''));
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('../pokemon.json')
        .then(response => {
            document.getElementById('loading').style.display = 'block';
            if (!response.ok) {
                showDebug('HTTP error fetching pokemon.json: Status ' + response.status);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            pokemonData = data;
            if (!data || !data.pokemon || !Array.isArray(data.pokemon)) {
                showDebug('Pokemon data is empty or invalid');
                throw new Error('Pokémon data is empty or invalid');
            }
            showDebug('Successfully loaded pokemon.json with ' + data.pokemon.length + ' Pokémon');
        })
        .catch(error => {
            document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later.</p>';
            showDebug('Failed to load Pokémon data: ' + error.message);
            document.getElementById('loading').style.display = 'none';
        });

    const urlParams = new URLSearchParams(window.location.search);
    let shortCode = urlParams.toString();

    if (shortCode) {
        if (shortCode.endsWith('=')) {
            shortCode = shortCode.slice(0, -1);
        } else if (shortCode.includes('=')) {
            shortCode = urlParams.keys().next().value || shortCode;
            showDebug('Extracted shortCode from key-value: ' + shortCode);
        }

        document.getElementById('loading').style.display = 'block';
        if (window.db) {
            showDebug('Attempting to fetch Firestore document for shortCode: ' + shortCode);
            getDoc(doc(window.db, 'urls', shortCode))
                .then(docSnap => {
                    if (docSnap.exists()) {
                        const longUrl = docSnap.data().longUrl;
                        showDebug('Fetched long URL: ' + longUrl);
                        const urlParams = new URLSearchParams(new URL(longUrl).search);
                        const dataParam = urlParams.get('data');
                        if (dataParam) {
                            try {
                                const decodedData = JSON.parse(atob(dataParam));
                                showDebug('Decoded data from long URL: ' + JSON.stringify(decodedData).substring(0, 100) + '...');
                                currentTab = decodedData.tab;
                                currentFilter = decodedData.filter;
                                Object.assign(cellStates, decodedData.states);
                                displayPokemon(decodedData);
                            } catch (error) {
                                throw new Error('Invalid share data in long URL: ' + error.message);
                            }
                        } else {
                            throw new Error('No data parameter in long URL');
                        }
                    } else {
                        throw new Error('Short code not found in Firestore');
                    }
                    document.getElementById('loading').style.display = 'none';
                })
                .catch(error => {
                    document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later.</p>';
                    showDebug('Error fetching Firestore document for shortCode ' + shortCode + ': ' + error.message);
                    document.getElementById('loading').style.display = 'none';
                });
        } else {
            document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later.</p>';
            showDebug('Firestore not initialized');
            document.getElementById('loading').style.display = 'none';
        }
    } else {
        document.getElementById('content').innerHTML = '<p>Something went wrong. Please try again later.</p>';
        showDebug('No short code provided in URL');
        document.getElementById('loading').style.display = 'none';
    }
});