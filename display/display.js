/* --- display/display.js --- */

function debugLog(msg, isError = false) {
    const logDiv = document.getElementById('loading');
    if (logDiv) {
        const span = document.createElement('div');
        span.style.color = isError ? '#ff4444' : '#2ecc71';
        span.style.fontSize = '13px';
        span.innerText = `> ${msg}`;
        logDiv.appendChild(span);
    }
}

let pokemonData = null;
let sharedKeys = [];
let activeTab = 'shiny';
let sharedColor = 'grey';

const updateGrid = () => {
    let cols = window.innerWidth < 601 ? 3 : (window.innerWidth > 1024 ? 7 : 5);
    document.documentElement.style.setProperty('--cells-for-screen', cols);
    return cols;
};
let cellsForScreen = updateGrid();
window.addEventListener('resize', () => { cellsForScreen = updateGrid(); });

const fixImagePath = (p) => p && p.startsWith('http') ? p : '../' + p.replace(/^\//, '');

fetch('../pokemon.json')
    .then(r => r.json())
    .then(data => {
        pokemonData = data;
        loadSharedData();
    })
    .catch(err => debugLog("Failed to load pokemon.json", true));

async function loadSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('s');
    if (!shareId || !window.fs) {
        if (!shareId) debugLog("No Share ID", true);
        else setTimeout(loadSharedData, 500);
        return;
    }

    try {
        const docRef = window.fs.doc(window.db, "shares", shareId);
        const docSnap = await window.fs.getDoc(docRef);
        
        if (docSnap.exists()) {
            const fb = docSnap.data();
            const stateObject = JSON.parse(LZString.decompressFromEncodedURIComponent(fb.data));
            
            activeTab = fb.tab;
            sharedKeys = Object.keys(stateObject);
            sharedColor = fb.color;
            
            document.getElementById('status-subtitle').innerText = `Type: ${activeTab.toUpperCase()}`;
            document.getElementById('loading').style.display = 'none';
            renderSharedContent();
        } else {
            debugLog("Link invalid or expired", true);
        }
    } catch (e) { debugLog("Error loading share", true); }
}

function renderSharedContent() {
    const content = document.getElementById('content');
    if(!content || !pokemonData) return;
    content.innerHTML = '';

    const generations = {};
    pokemonData.pokemon.forEach(p => {
        if (!generations[p.generation_number]) generations[p.generation_number] = [];
        generations[p.generation_number].push(p);
    });

    Object.keys(generations).sort((a,b)=>a-b).forEach(num => {
        const pks = generations[num];
        const table = document.createElement('table');
        let row = table.insertRow();
        let cellCount = 0;

        pks.forEach(p => {
            let forms = (activeTab === 'shiny') ? p.forms : p.forms.filter(f => f.form === p.base_form);
            
            forms.forEach(f => {
                const key = `${activeTab}-${f.key}`;
                
                if (sharedKeys.includes(key)) {
                    if (cellCount > 0 && cellCount % cellsForScreen === 0) row = table.insertRow();
                    const cell = row.insertCell();
                    cell.className = sharedColor; 
                    
                    const img = (activeTab === 'shiny') ? f.shiny.image : f.normal.image;
                    cell.innerHTML = `
                        <div class="pokemon-number">#${p.id}</div>
                        <img class="pokemon-image" src="${fixImagePath(img)}" loading="lazy">
                        <div class="pokemon-name">${p.name}</div>
                        <div class="pokemon-form">${f.form === 'normal' ? '' : f.form}</div>
                    `;
                    cellCount++;
                }
            });
        });

        if (cellCount > 0) {
            const h2 = document.createElement('h2');
            h2.innerText = `Gen ${num}`;
            content.appendChild(h2);
            content.appendChild(table);
        }
    });
}
