// Pokémon JSON data
const pokemonData = {
    "001": { "name": "Bulbasaur", "generation-number": 1, "generation-name": "Kanto", "in-game": true },
    // ... (include the full JSON data from your previous response here for brevity)
    "151": { "name": "Mew", "generation-number": 1, "generation-name": "Kanto", "in-game": true }
};

// State to track cell colors
const cellStates = {};

// Initialize table
function initTable() {
    const table = document.getElementById('pokemonTable');
    let row;
    let cellCount = 0;

    // Create rows and cells
    Object.keys(pokemonData).forEach((number, index) => {
        if (index % 5 === 0) {
            row = table.insertRow();
        }
        const cell = row.insertCell();
        cell.innerHTML = `
            <div><strong>#${number}</strong></div>
            <div>${pokemonData[number].name}</div>
            <div>${pokemonData[number]["generation-name"]}</div>
        `;
        cell.dataset.number = number;
        // Restore state from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get(number);
        cellStates[number] = state || 'grey';
        updateCellColor(cell, cellStates[number]);
        cell.addEventListener('click', () => handleCellClick(number, cell));
    });
}

// Update cell border color based on state
function updateCellColor(cell, state) {
    cell.classList.remove('blue', 'red');
    if (state === 'blue') cell.classList.add('blue');
    else if (state === 'red') cell.classList.add('red');
}

// Handle cell click to cycle colors
function handleCellClick(number, cell) {
    const currentState = cellStates[number];
    let nextState;
    if (currentState === 'grey') nextState = 'blue';
    else if (currentState === 'blue') nextState = 'red';
    else nextState = 'grey';
    cellStates[number] = nextState;
    updateCellColor(cell, nextState);
}

// Save button to generate URL and copy to clipboard
document.getElementById('saveButton').addEventListener('click', () => {
    const params = new URLSearchParams();
    Object.keys(cellStates).forEach(number => {
        if (cellStates[number] !== 'grey') {
            params.set(number, cellStates[number]);
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

// Initialize on page load
window.onload = initTable;