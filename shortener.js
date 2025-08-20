// URL Shortener Logic with Minimal Validation and Firestore
function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

function validateUrl(url) {
    try {
        if (!url || typeof url !== 'string') {
            console.warn('Validation failed: URL is not a string or is null');
            return false;
        }
        const maxLength = 10000; // Prevent excessively long URLs from potential bugs
        if (url.length > maxLength) {
            console.warn('Validation failed: URL exceeds ' + maxLength + ' characters');
            return false;
        }
        return true; // Assume internally generated URLs are safe
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

async function shortenUrl(longUrl, db) {
    if (!validateUrl(longUrl)) throw new Error('Invalid URL');
    const newShortCode = generateShortCode();
    const shortUrl = `${window.location.origin}${window.location.pathname}?short=${newShortCode}`;
    try {
        if (db) {
            await db.collection('urls').doc(newShortCode).set({
                longUrl: longUrl,
                createdAt: new Date().toISOString()
            });
            console.log('Firestore save successful for code:', newShortCode);
        } else {
            console.warn('Firestore not available, URL not saved externally.');
        }
    } catch (error) {
        console.error('Firestore save failed:', error);
        throw new Error('Failed to save URL to Firestore');
    }
    return shortUrl;
}

// Export for use in script.js
if (typeof module === 'undefined') {
    window.shortenUrl = shortenUrl;
    window.validateUrl = validateUrl;
    window.generateShortCode = generateShortCode;
}