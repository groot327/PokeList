import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let pokemonData = null;
let currentTab = 'shiny'; // Defaulting to shiny as the creation code sends filtered states
let currentFilter = null;
const cellStates = {};

const NO_NORMAL_SHINY = new Set([
    "201", "421", "422", "423", "479", "492", "555", "585", "586", "647",
    "648", "649", "669", "670", "671", "676", "710", "711", "741", "745",
    "849", "877", "892", "905", "925", "978"
]);

// Handle responsive grid
let cellsForScreen = 5;
const myScreenWidth = window.innerWidth;
if (myScreenWidth < 601) {
    cellsForScreen = 3;
} else if (myScreenWidth > 1024) {
    cellsForScreen = 7;
}
document.documentElement.style.setProperty('--cells-for-screen', cellsForScreen);

function showDebug(message) {
    console.log('DEBUG:', message);
    const debug = document.getElementById('debug');
    if (debug) debug.innerHTML = ``;
}

function updateCellColor(cell, state) {
    cell.classList.remove('yellow', 'blue', 'red');
    if (state === 'yellow') cell.classList.add('yellow');
    else if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

/**
 * Renders the "Not Available" view (No return link)
 */
function showNotFound(message = "This link is no longer available.") {
    const container = document.getElementById('content');
    container.innerHTML = `
        <div class="not-found-container" style="text-align: center; padding: 100px 20px; font-family: sans-serif;">
            <div style="font-size: 80px; filter: grayscale(1); margin-bottom: 20px; opacity: 0.5;">📋</div>
            <h2 style="color: #444; font-size: 22px;">List Not Available</h2>
            <p style="color: #888; max-width: 400px; margin: 0 auto; line-height: 1.5;">${message}</p>
        </div>
    `;
}

function displayPokemon(data) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    if (!pokemonData || !pokemonData.pokemon) return;

    const { tab, filter, states } = data;
    currentTab = tab;
    currentFilter = filter;
    Object.assign(cellStates, states);

    const filterDisplay = document.getElementById('form-filter');
    if (filterDisplay) {
        filterDisplay.innerHTML = tab.toUpperCase();
        if (filter) filterDisplay.innerHTML += ` - ${filter.toUpperCase()} Filter`;
    }

    const generations = {};
    pokemonData.pokemon.forEach(pokemon => {
        const gen = pokemon.generation_number;
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(pokemon);
    });

    Object.keys(generations).sort((a, b) => Number(a) - Number(b)).forEach(genNumber => {
        const pokemons = generations[genNumber].sort((a, b) => Number(a.id) - Number(b.id));
        const section = document.createElement('div');
        section.className = 'tab-content';
        const table = document.createElement('table');
        let row;
        let cellCount = 0;

        pokemons.forEach(pokemon => {
            const formsToRender = tab === 'shiny' ? pokemon.forms : pokemon.forms.filter(f => f.form === pokemon.base_form);

            formsToRender.forEach(form => {
                const paddedId = pokemon.id.toString().padStart(3, '0');
                if (tab === 'shiny' && NO_NORMAL_SHINY.has(paddedId) && form.form === pokemon.base_form) return;
                if (tab !== 'shiny' && !form[tab]) return;

                const key = tab === 'shiny' ? `shiny-${form.key}` : `${tab}-${pokemon.id}`;
                const state = states[key] || 'grey';
                
                // If sharing filtered data, only show cells that have a state in the 'states' object
                if (!states[key]) return;

                if (cellCount % cellsForScreen === 0) row = table.insertRow();

                const cell = row.insertCell();
                cell.innerHTML = `
                    <div class="pokemon-number"><strong>#${pokemon.id}</strong></div>
                    <div><img class="pokemon-image" src="${tab === 'shiny' && form.shiny ? form.shiny.image : form.normal.image}" alt="${pokemon.name}" onerror="this.style.opacity='0';"></div>
                    <div class="pokemon-name">${pokemon.name}</div>
                    <div class="pokemon-form">${form.form === pokemon.base_form ? '' : form.form}</div>
                `;
                updateCellColor(cell, state);
                cellCount++;
            });
        });

        if (cellCount > 0) {
            section.innerHTML = `<h2>Gen ${genNumber} - ${pokemons[0]?.generation}</h2>`;
            section.appendChild(table);
            container.appendChild(section);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    
    try {
        // 1. Load Local Data
        const response = await fetch('../pokemon.json');
        if (!response.ok) throw new Error('Data fetch failed');
        pokemonData = await response.json();

        // 2. Get shortcode from URL (?s=abcde)
        const urlParams = new URLSearchParams(window.location.search);
        const shortCode = urlParams.get('s');

        if (!shortCode) {
            showNotFound("A valid share code is required to view this list.");
            return;
        }

        // 3. Query Firestore 'shares' collection
        if (window.db) {
            const docSnap = await getDoc(doc(window.db, 'shares', shortCode));

            if (docSnap.exists()) {
                const docData = docSnap.data();
                const longUrl = docData.longUrl; 

                if (longUrl && longUrl.includes('data=')) {
                    // Extract the compressed string
                    const compressedData = longUrl.split('data=')[1].split('&')[0];
                    
                    // Decompress using LZString to match your creation code
                    const decompressedJSON = LZString.decompressFromEncodedURIComponent(compressedData);
                    
                    if (!decompressedJSON) {
                        throw new Error("The data payload is corrupted or incorrectly compressed.");
                    }

                    const filteredStates = JSON.parse(decompressedJSON);

                    // Reconstruct the data object for the display function
                    // Uses 'color' from the Firestore document as the filter name
                    const displayData = {
                        tab: 'shiny', 
                        filter: docData.color || null,
                        states: filteredStates
                    };

                    displayPokemon(displayData);
                } else {
                    throw new Error('This share link is missing its data payload.');
                }
            } else {
                showNotFound("The requested list could not be found.");
            }
        }
    } catch (error) {
        showDebug(error.message);
        document.getElementById('content').innerHTML = `<p class="center" style="text-align:center; margin-top:50px;">${error.message}</p>`;
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
});
