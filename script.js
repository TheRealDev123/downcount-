// --- 1. AUTO-IMPORT DATA ON PAGE LOAD (If opened via share link) ---
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#share=')) {
    try {
      const base64Data = hash.replace('#share=', '');
      const jsonString = decodeURIComponent(atob(base64Data));
      const importedData = JSON.parse(jsonString);

      // Restore data to localStorage
      Object.keys(importedData).forEach((key) => {
        localStorage.setItem(key, importedData[key]);
      });

      // Clear hash from URL and reload app state
      window.location.hash = '';
      alert('Data imported successfully!');
      location.reload();
    } catch (err) {
      console.error('Failed to import shared data:', err);
      alert('The share link is invalid or corrupted.');
    }
  }
});

// --- 2. SETTINGS MODAL TOGGLE LOGIC ---
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');

if (openSettingsBtn && settingsModal) {
  openSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
  closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
  });
}

// --- 3. SHARE DATA BUTTON LOGIC (Inside Settings Menu) ---
const shareDataBtn = document.getElementById('share-data-btn');
const shareLinkContainer = document.getElementById('share-link-container');
const shareLinkInput = document.getElementById('share-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');

if (shareDataBtn) {
  shareDataBtn.addEventListener('click', () => {
    try {
      // Gather all configuration/data from localStorage
      const appData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        appData[key] = localStorage.getItem(key);
      }

      // Encode data into base64 URL hash
      const jsonString = JSON.stringify(appData);
      const base64Data = btoa(encodeURIComponent(jsonString));
      
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}#share=${base64Data}`;

      // Show link container and populate input
      shareLinkInput.value = shareUrl;
      shareLinkContainer.style.display = 'block';

      // Copy automatically to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link generated and copied to your clipboard!');
      }).catch(() => {
        alert('Share link generated! Copy it from the text box below.');
      });
    } catch (err) {
      console.error('Error generating share link:', err);
      alert('Could not generate share link.');
    }
  });
}

if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      alert('Link copied to clipboard!');
    });
  });
}