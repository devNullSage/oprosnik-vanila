/**
 * parser.ts - Minimal version
 * Only serves to respond to requests from the background script.
 */

console.log('✅ Parser.ts loaded (minimal version)');

// Simple indicator for visual confirmation
const indicator = document.createElement('div');
indicator.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 12px;
    z-index: 99999;
`;
indicator.textContent = '✓ Oprosnik Helper';
document.body.appendChild(indicator);

// Remove indicator after 5 seconds
setTimeout(() => indicator.remove(), 5000);

// Message listener - only for ping
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ 
            status: 'pong',
            message: 'Parser is active',
            url: window.location.href
        });
        return true; // Keep the message channel open for the asynchronous response
    }
});

console.log('📡 Parser is ready.');
