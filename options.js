// LockedIn Settings/Options Script

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
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
  // Back to app button (avoid inline JS per CSP)
  const backBtn = document.getElementById('backToAppBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    });
  }
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

// Save API key
async function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showMessage('Please enter your Gemini API key.', 'warning');
    return;
  }

  try {
    await chrome.storage.local.set({ apiKey: apiKey });
    showMessage('API key saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving API key:', error);
    showMessage('Error saving API key. Please try again.', 'error');
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