document.addEventListener('DOMContentLoaded', () => {
    // 1. Create the modal structure dynamically
    const infoOverlay = document.createElement('div');
    infoOverlay.id = 'infoOverlay';
    infoOverlay.className = 'info-overlay';

    const infoPopup = document.createElement('div');
    infoPopup.className = 'info-popup';

    // Header container for Title and Close button
    const header = document.createElement('div');
    header.className = 'info-header';

    const title = document.createElement('h2');
    title.innerText = 'Information';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'info-close-btn';
    closeBtn.innerHTML = 'Close <span>&#10006;</span>'; // Word "Close" + X symbol
    closeBtn.onclick = closeInfo;

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content container
    const content = document.createElement('div');
    content.id = 'infoContent';
    content.className = 'info-content';
    content.innerHTML = 'Loading...';

    infoPopup.appendChild(header);
    infoPopup.appendChild(content);
    infoOverlay.appendChild(infoPopup);
    document.body.appendChild(infoOverlay);

    // 2. Wire up the menu button
    const menuBtn = document.getElementById('menuInfoButton');
    if (menuBtn) {
        menuBtn.addEventListener('click', openInfo);
    }

    // 3. Close on overlay click
    infoOverlay.addEventListener('click', (e) => {
        if (e.target === infoOverlay) closeInfo();
    });
});

async function openInfo() {
    const overlay = document.getElementById('infoOverlay');
    const contentDiv = document.getElementById('infoContent');
    const menu = document.getElementById('side-menu');
    const ham = document.getElementById('hamburger');

    // Close the side menu first
    if (menu) menu.classList.remove('active');
    if (ham) ham.style.visibility = 'visible';

    overlay.classList.add('active');

    // Fetch content from info.html
    try {
        const response = await fetch('info.html');
        if (response.ok) {
            const text = await response.text();
            contentDiv.innerHTML = text;
        } else {
            contentDiv.innerHTML = '<p>Error loading info.</p>';
        }
    } catch (e) {
        contentDiv.innerHTML = '<p>Could not load info file.</p>';
        console.error(e);
    }
}

function closeInfo() {
    document.getElementById('infoOverlay').classList.remove('active');
}
