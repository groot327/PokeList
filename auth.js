/* --- auth.js --- */
(async function() {
    // 1. Check if already authenticated for this session
    if (sessionStorage.getItem('tracker_auth') === 'true') {
        return; // Exit and let the page load
    }

    // 2. Hide the body immediately so no data flashes
    document.documentElement.style.display = 'none';

    try {
        // 3. Fetch the password from your JSON file
        const response = await fetch('config.json');
        const config = await response.json();
        const correctPassword = config.access_key;

        // 4. Prompt the user
        let authenticated = false;
        while (!authenticated) {
            const entry = prompt("Please enter the access code to use the Tracker:");
            
            if (entry === null) {
                // User pressed cancel
                document.body.innerHTML = "<h1>Access Denied</h1><p>A valid code is required to view this page.</p>";
                document.documentElement.style.display = 'block';
                return;
            }

            if (entry === correctPassword) {
                sessionStorage.setItem('tracker_auth', 'true');
                authenticated = true;
                document.documentElement.style.display = 'block';
            } else {
                alert("Incorrect code. Please try again.");
            }
        }
    } catch (e) {
        console.error("Auth error:", e);
        alert("System error: Could not verify access.");
    }
})();
