let pokemonData = null;
let currentTab = localStorage.getItem('currentTab') || 'shiny';
let currentFilter = null;
let cellStates = JSON.parse(localStorage.getItem('pokemonCellStates') || '{}');

const updateGrid = () => {
    let cols = window.innerWidth < 601 ? 3 : (window.innerWidth > 1024 ? 7 : 5);
    document.documentElement.style.setProperty('--cells-for-screen', cols);
    return cols;
};
let cellsForScreen = updateGrid();
window.addEventListener('resize', () => { cellsForScreen = updateGrid(); });

// Initialization
fetch('pokemon.json').then(r => r.json()).then(data => {
    pokemonData = data;
    document.getElementById('loading').style.display = 'none';
    checkIncomingShare();
    initApp();
});

async function checkIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('s');
    if (shareId && window.fs) {
        try {
            const docRef = window.fs.doc(window.db, "shares", shareId);
            const docSnap = await window.fs.getDoc(docRef);
            if (docSnap.exists()) {
                const compressed = docSnap.data().data;
                const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
                const sharedData = JSON.parse(decompressed);
                if (confirm("Load shared data? This will overwrite your current progress.")) {
                    cellStates = sharedData;
                    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
                    renderTabContent();
                    showToast("Shared data loaded!");
                }
            }
        } catch (e) { console.error("Share error:", e); }
    }
}

function initApp() {
    initMenu();
    initTabs();
    initFilters();
    initGenTabs();
    initSearch();
    initModal();
    switchTab(currentTab);
}

function initMenu() {
    const menu = document.getElementById('side-menu');
    const ham = document.getElementById('hamburger');
    const importFile = document.getElementById('importFile');

    ham.onclick = () => { menu.classList.add('active'); ham.style.visibility = 'hidden'; };
    document.getElementById('closeMenu').onclick = () => { menu.classList.remove('active'); ham.style.visibility = 'visible'; };
    
    document.getElementById('menuSaveButton').onclick = () => {
        localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
        showToast("Progress saved!");
    };

    document.getElementById('menuClearButton').onclick = () => {
        if(confirm("Erase all data?")) { localStorage.removeItem('pokemonCellStates'); location.reload(); }
    };

    document.getElementById('menuExportButton').onclick = () => {
        const dataStr = JSON.stringify(cellStates);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const dl = document.createElement('a');
        dl.href = url;
        dl.download = "pokemon_tracker.json";
        dl.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('menuImportButton').onclick = () => importFile.click();
    
    // NUCLEAR IMPORT
    importFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported) {
                    cellStates = imported;
                    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
                    renderTabContent();
                    showToast("Import successful!");
                }
            } catch (err) { console.error(err); }
            importFile.value = ""; 
        };
        reader.readAsText(file);
    };

    // Open Modal from Share button
    document.getElementById('menuShareButton').onclick = () => {
        document.getElementById('shareModal').style.display = "block";
        menu.classList.remove('active');
        ham.style.visibility = 'visible';
    };
}

function initModal() {
    const modal = document.getElementById('shareModal');
    document.getElementById('closeModal').onclick = () => modal.style.display = "none";
    
    // Outside click close
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

    document.querySelectorAll('.share-opt').forEach(btn => {
        btn.onclick = async () => {
            const selectedColor = btn.getAttribute('data-color');
            modal.style.display = "none";
            
            if (!window.fs) return alert("System still loading...");
            showToast(`Generating ${selectedColor} link...`);

            try {
                // FILTER DATA: Only share the chosen color
                const filtered = {};
                for (const [k, v] of Object.entries(cellStates)) {
                    if (v === selectedColor) filtered[k] = v;
                }

                const dataStr = JSON.stringify(filtered);
                const compressed = LZString.compressToEncodedURIComponent(dataStr);
                const shareId = Math.random().toString(36).substring(2, 10);
                
                //await window.fs.setDoc(window.fs.doc(window.db, "shares", shareId), {
                //    data: compressed,
                //    timestamp: Date.now(),
                //    color: selectedColor
                //});
                await window.fs.setDoc(window.fs.doc(window.db, "shares", shareId), {
                    longUrl: `/PokeList/display/index.html?data=${compressed}`,
                    createdAt: new Date().toISOString(),
                    color: selectedColor
                });


                // Path formatting for /display/ subdirectory
                const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                const shareUrl = `${baseUrl}display/index.html?s=${shareId}`;
                
                await navigator.clipboard.writeText(shareUrl);
                showToast(`${selectedColor.toUpperCase()} link copied!`);
            } catch (e) {
                console.error(e);
                showToast("Error generating link.");
            }
        };
    });
}

function initTabs() {
    ['shiny', 'xxl', 'xxs', 'hundo'].forEach(t => {
        const id = `tab${t.charAt(0).toUpperCase() + t.slice(1)}`;
        const btn = document.getElementById(id);
        if(btn) btn.onclick = () => switchTab(t);
    });
}

function initFilters() {
    ['Grey', 'Yellow', 'Blue', 'Red'].forEach(c => {
        const btn = document.getElementById(`filter${c}`);
        if(btn) btn.onclick = () => toggleFilter(c.toLowerCase());
    });
}

function initGenTabs() {
    document.querySelectorAll('.gen-button').forEach((btn, idx) => {
        btn.onclick = () => {
            const target = document.querySelector(`h2[data-gen="${idx+1}"]`);
            if (target) {
                const offset = document.querySelector('.header').offsetHeight;
                window.scrollTo({ top: target.offsetTop - offset - 10, behavior: 'smooth' });
            }
        };
    });
}

function initSearch() {
    const input = document.getElementById('searchInput');
    input.oninput = () => {
        const query = input.value.toLowerCase().trim();
        document.querySelectorAll('td').forEach(td => {
            td.style.display = td.innerText.toLowerCase().includes(query) ? "" : "none";
        });
    };
}

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('currentTab', tab);
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.toggle('active', b.id.toLowerCase().includes(tab));
    });
    renderTabContent();
}

function toggleFilter(color) {
    currentFilter = (currentFilter === color) ? null : color;
    ['grey', 'yellow', 'blue', 'red'].forEach(c => {
        const btn = document.getElementById(`filter${c.charAt(0).toUpperCase() + c.slice(1)}`);
        if(btn) btn.classList.toggle('active', c === currentFilter);
    });
    renderTabContent();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) {
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => { t.classList.remove('show'); }, 3000);
    }
}

function renderTabContent() {
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
        const section = document.createElement('div');
        section.innerHTML = `<h2 data-gen="${num}" style="margin-top:20px;">Gen ${num} - ${pks[0].generation}</h2>`;
        const table = document.createElement('table');
        let row = table.insertRow();
        let cellCount = 0;

        pks.forEach(p => {
            let forms = (currentTab === 'shiny') ? p.forms : p.forms.filter(f => f.form === p.base_form);
            forms.forEach(f => {
                const key = (currentTab === 'shiny') ? `shiny-${f.key}` : `${currentTab}-${p.id}`;
                const state = cellStates[key] || 'grey';
                if (currentFilter && state !== currentFilter) return;

                if (cellCount > 0 && cellCount % cellsForScreen === 0) row = table.insertRow();
                const cell = row.insertCell();
                cell.className = state;
                const img = (currentTab === 'shiny') ? f.shiny.image : f.normal.image;
                
                cell.innerHTML = `
                    <div class="pokemon-number">#${p.id}</div>
                    <img class="pokemon-image" src="${img}" loading="lazy">
                    <div class="pokemon-name">${p.name}</div>
                    <div class="pokemon-form">${f.form === 'normal' ? '' : f.form}</div>
                `;

                cell.onclick = () => {
                    const cycle = {'grey':'yellow','yellow':'blue','blue':'red','red':'grey'};
                    cellStates[key] = cycle[cellStates[key] || 'grey'];
                    cell.className = cellStates[key];
                    localStorage.setItem('pokemonCellStates', JSON.stringify(cellStates));
                };
                cellCount++;
            });
        });
        if (cellCount > 0) { section.appendChild(table); content.appendChild(section); }
    });
}
