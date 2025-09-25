// LockedIn Settings/Options Script

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  await loadBlacklist();
});

// Load all settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'weeklyReports',
      'emailAddress',
      'geminiApiKey',
      'enableAI',
      'personalizedPrompt',
      'enableFallback',
      'trackInactive',
      'minSessionTime',
      'focusTracking',
      'behaviorTracking',
      'breakReminders',
      'distractionAlerts',
      'sessionComplete'
    ]);

    // Update UI with saved settings
    document.getElementById('weeklyReports').checked = result.weeklyReports || false;
    document.getElementById('emailAddress').value = result.emailAddress || '';
    document.getElementById('geminiApiKey').value = result.geminiApiKey || '';
    document.getElementById('enableAI').checked = result.enableAI !== false; // Default true
    document.getElementById('personalizedPrompt').value = result.personalizedPrompt || '';
    document.getElementById('enableFallback').checked = result.enableFallback !== false; // Default true
    document.getElementById('trackInactive').checked = result.trackInactive || false;
    
    // Set minimum session time dropdown
    const minSessionSelect = document.getElementById('minSessionTime');
    if (minSessionSelect) {
      minSessionSelect.value = result.minSessionTime || '5';
    }
    
    document.getElementById('focusTracking').checked = result.focusTracking !== false; // Default true
    document.getElementById('behaviorTracking').checked = result.behaviorTracking !== false; // Default true
    document.getElementById('breakReminders').checked = result.breakReminders !== false; // Default true
    document.getElementById('distractionAlerts').checked = result.distractionAlerts !== false; // Default true
    document.getElementById('sessionComplete').checked = result.sessionComplete !== false; // Default true

    // Show/hide settings based on toggles
    toggleEmailSettings();
    toggleAISettings();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Weekly reports toggle
  document.getElementById('weeklyReports').addEventListener('change', (e) => {
    saveSettings();
    toggleEmailSettings();
  });

  // Email address save
  document.getElementById('saveEmail').addEventListener('click', saveEmailAddress);
  document.getElementById('emailAddress').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEmailAddress();
  });

  // AI Settings
  const enableAIToggle = document.getElementById('enableAI');
  if (enableAIToggle) {
    enableAIToggle.addEventListener('change', (e) => {
      saveSettings();
      toggleAISettings();
    });
  }

  // Gemini API key and test
  const testApiBtn = document.getElementById('testApiBtn');
  if (testApiBtn) {
    testApiBtn.addEventListener('click', testGeminiAPI);
  }

  const geminiApiKey = document.getElementById('geminiApiKey');
  if (geminiApiKey) {
    geminiApiKey.addEventListener('input', saveSettings);
  }

  const personalizedPrompt = document.getElementById('personalizedPrompt');
  if (personalizedPrompt) {
    personalizedPrompt.addEventListener('input', saveSettings);
  }

  // All other toggles
  const toggles = ['enableFallback', 'trackInactive', 'focusTracking', 'behaviorTracking', 'breakReminders', 'distractionAlerts', 'sessionComplete'];
  toggles.forEach(toggleId => {
    const element = document.getElementById(toggleId);
    if (element) {
      element.addEventListener('change', saveSettings);
    }
  });

  // Minimum session time dropdown
  const minSessionTime = document.getElementById('minSessionTime');
  if (minSessionTime) {
    minSessionTime.addEventListener('change', saveSettings);
  }

  // Blacklist management
  document.getElementById('addRule').addEventListener('click', addBlacklistRule);
  document.getElementById('newRule').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlacklistRule();
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const site = e.target.dataset.site;
      addToBlacklist(site);
    });
  });

  // Data management buttons
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('clearData').addEventListener('click', clearData);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
}

// Toggle email settings visibility
function toggleEmailSettings() {
  const emailSettings = document.getElementById('emailSettings');
  const weeklyReports = document.getElementById('weeklyReports').checked;
  
  if (weeklyReports) {
    emailSettings.style.display = 'flex';
  } else {
    emailSettings.style.display = 'none';
  }
}

// Toggle AI settings visibility
function toggleAISettings() {
  const geminiApiSettings = document.getElementById('geminiApiSettings');
  const enableAI = document.getElementById('enableAI').checked;
  
  if (geminiApiSettings) {
    if (enableAI) {
      geminiApiSettings.style.display = 'flex';
    } else {
      geminiApiSettings.style.display = 'none';
    }
  }
}

// Test Gemini API connection
async function testGeminiAPI() {
  const apiKey = document.getElementById('geminiApiKey').value;
  const statusDiv = document.getElementById('apiStatus');
  const testBtn = document.getElementById('testApiBtn');
  
  if (!apiKey) {
    statusDiv.innerHTML = '<span style="color: #e53e3e;">Please enter an API key first</span>';
    return;
  }
  
  testBtn.textContent = 'Testing...';
  testBtn.disabled = true;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Test connection' }] }]
      })
    });
    
    if (response.ok) {
      statusDiv.innerHTML = '<span style="color: #38a169;">✓ API connection successful!</span>';
    } else {
      statusDiv.innerHTML = '<span style="color: #e53e3e;">✗ API connection failed. Check your key.</span>';
    }
  } catch (error) {
    statusDiv.innerHTML = '<span style="color: #e53e3e;">✗ Connection error. Check your internet.</span>';
  }
  
  testBtn.textContent = 'Test Connection';
  testBtn.disabled = false;
}

// Save general settings
async function saveSettings() {
  try {
    const settings = {
      weeklyReports: document.getElementById('weeklyReports').checked,
      enableAI: document.getElementById('enableAI')?.checked !== false,
      geminiApiKey: document.getElementById('geminiApiKey')?.value || '',
      personalizedPrompt: document.getElementById('personalizedPrompt')?.value || '',
      enableFallback: document.getElementById('enableFallback')?.checked !== false,
      trackInactive: document.getElementById('trackInactive')?.checked || false,
      minSessionTime: document.getElementById('minSessionTime')?.value || '5',
      focusTracking: document.getElementById('focusTracking').checked,
      behaviorTracking: document.getElementById('behaviorTracking').checked,
      breakReminders: document.getElementById('breakReminders').checked,
      distractionAlerts: document.getElementById('distractionAlerts').checked,
      sessionComplete: document.getElementById('sessionComplete').checked
    };

    await chrome.storage.local.set(settings);
    showMessage('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showMessage('Error saving settings. Please try again.', 'error');
  }
}

// Save email address
async function saveEmailAddress() {
  const email = document.getElementById('emailAddress').value.trim();
  
  if (!email) {
    showMessage('Please enter an email address.', 'warning');
    return;
  }

  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address.', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ emailAddress: email });
    showMessage('Email address saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving email:', error);
    showMessage('Error saving email address. Please try again.', 'error');
  }
}

// Load and display blacklist
async function loadBlacklist() {
  try {
    const result = await chrome.storage.local.get(['blacklist']);
    const blacklist = result.blacklist || [];
    
    const rulesList = document.getElementById('rulesList');
    rulesList.innerHTML = '';

    if (blacklist.length === 0) {
      rulesList.innerHTML = '<p class="no-rules">No blacklisted websites yet. Add some to get started!</p>';
      return;
    }

    blacklist.forEach((site, index) => {
      const ruleItem = document.createElement('div');
      ruleItem.className = 'rule-item';
      ruleItem.innerHTML = `
        <span class="rule-site">${site}</span>
        <button class="remove-rule" data-index="${index}" title="Remove this rule">×</button>
      `;
      rulesList.appendChild(ruleItem);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-rule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        removeFromBlacklist(index);
      });
    });
  } catch (error) {
    console.error('Error loading blacklist:', error);
  }
}

// Add blacklist rule
async function addBlacklistRule() {
  const newRule = document.getElementById('newRule').value.trim();
  
  if (!newRule) {
    showMessage('Please enter a website to blacklist.', 'warning');
    return;
  }

  await addToBlacklist(newRule);
  document.getElementById('newRule').value = '';
}

// Add to blacklist (helper function)
async function addToBlacklist(site) {
  try {
    // Clean up the site URL
    let cleanSite = site.toLowerCase().trim();
    cleanSite = cleanSite.replace(/^https?:\/\//, '');
    cleanSite = cleanSite.replace(/^www\./, '');
    cleanSite = cleanSite.split('/')[0]; // Remove path

    const result = await chrome.storage.local.get(['blacklist']);
    const blacklist = result.blacklist || [];

    if (blacklist.includes(cleanSite)) {
      showMessage('This website is already blacklisted.', 'warning');
      return;
    }

    blacklist.push(cleanSite);
    await chrome.storage.local.set({ blacklist: blacklist });
    
    showMessage(`${cleanSite} added to blacklist!`, 'success');
    await loadBlacklist();
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    showMessage('Error adding website to blacklist.', 'error');
  }
}

// Remove from blacklist
async function removeFromBlacklist(index) {
  try {
    const result = await chrome.storage.local.get(['blacklist']);
    const blacklist = result.blacklist || [];

    if (index >= 0 && index < blacklist.length) {
      const removedSite = blacklist[index];
      blacklist.splice(index, 1);
      await chrome.storage.local.set({ blacklist: blacklist });
      
      showMessage(`${removedSite} removed from blacklist!`, 'success');
      await loadBlacklist();
    }
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    showMessage('Error removing website from blacklist.', 'error');
  }
}

// Export data
async function exportData() {
  try {
    const result = await chrome.storage.local.get(null);
    const dataBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `lockedin-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showMessage('Error exporting data. Please try again.', 'error');
  }
}

// Clear all data
async function clearData() {
  if (!confirm('Are you sure you want to clear ALL your LockedIn data? This action cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.clear();
    showMessage('All data cleared successfully!', 'success');
    
    // Reload the page to reset UI
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Error clearing data:', error);
    showMessage('Error clearing data. Please try again.', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to their defaults?')) {
    return;
  }

  try {
    const defaultSettings = {
      weeklyReports: false,
      emailAddress: '',
      focusTracking: true,
      behaviorTracking: true,
      breakReminders: true,
      distractionAlerts: true,
      sessionComplete: true
    };

    await chrome.storage.local.set(defaultSettings);
    showMessage('Settings reset to defaults!', 'success');
    
    // Reload settings
    setTimeout(() => {
      loadSettings();
      loadBlacklist();
    }, 1000);
  } catch (error) {
    console.error('Error resetting settings:', error);
    showMessage('Error resetting settings. Please try again.', 'error');
  }
}

// Show message to user
function showMessage(text, type = 'info') {
  const messageContainer = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  
  messageText.textContent = text;
  messageContainer.className = `message-container ${type}`;
  messageContainer.classList.remove('hidden');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    messageContainer.classList.add('hidden');
  }, 3000);
}

// Validate email address
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}