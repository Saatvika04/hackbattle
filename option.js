// Options page script for FocusTracker
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadSettings();
    setupEventListeners();
    console.log('Options page loaded successfully');
  } catch (error) {
    console.error('Error loading options page:', error);
  }
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      weeklyReports: true,
      emailAddress: '',
      focusGoal: 80,
      trackInactive: false,
      minSessionTime: 5,
      dataRetention: 90,
      customRules: [],
      enableAI: true,
      geminiApiKey: '',
      enableFallback: true
    });

    // Apply settings to UI
    document.getElementById('weeklyReports').checked = settings.weeklyReports;
    document.getElementById('emailAddress').value = settings.emailAddress;
    document.getElementById('focusGoal').value = settings.focusGoal;
    document.getElementById('focusGoalValue').textContent = settings.focusGoal + '%';
    document.getElementById('trackInactive').checked = settings.trackInactive;
    document.getElementById('minSessionTime').value = settings.minSessionTime;
    document.getElementById('dataRetention').value = settings.dataRetention;

    // AI Settings
    document.getElementById('enableAI').checked = settings.enableAI;
    document.getElementById('geminiApiKey').value = settings.geminiApiKey;
    document.getElementById('enableFallback').checked = settings.enableFallback;

    // Show/hide email settings based on weekly reports toggle
    toggleEmailSettings(settings.weeklyReports);
    
    // Show/hide API settings based on AI toggle
    toggleAISettings(settings.enableAI);
    
    // Load custom rules
    loadCustomRules(settings.customRules);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function setupEventListeners() {
  // Weekly reports toggle
  document.getElementById('weeklyReports').addEventListener('change', (e) => {
    toggleEmailSettings(e.target.checked);
  });

  // Focus goal slider
  document.getElementById('focusGoal').addEventListener('input', (e) => {
    document.getElementById('focusGoalValue').textContent = e.target.value + '%';
  });

  // Add custom rule button
  document.getElementById('addRuleBtn').addEventListener('click', () => {
    showCustomRuleModal();
  });

  // Action buttons - check if elements exist first
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (resetBtn) resetBtn.addEventListener('click', resetSettings);
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  if (clearDataBtn) clearDataBtn.addEventListener('click', clearAllData);

  // Category edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.dataset.category;
      editCategory(category);
    });
  });

  // AI Settings
  document.getElementById('enableAI').addEventListener('change', (e) => {
    toggleAISettings(e.target.checked);
  });

  document.getElementById('testApiBtn').addEventListener('click', testGeminiAPI);
}

function toggleEmailSettings(show) {
  const emailSettings = document.getElementById('emailSettings');
  emailSettings.style.display = show ? 'flex' : 'none';
}

function toggleAISettings(show) {
  const apiSettings = document.getElementById('geminiApiSettings');
  apiSettings.style.display = show ? 'flex' : 'none';
}

async function testGeminiAPI() {
  const apiKeyInput = document.getElementById('geminiApiKey');
  const testBtn = document.getElementById('testApiBtn');
  const statusDiv = document.getElementById('apiStatus');
  
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showAPIStatus('Please enter an API key', 'error');
    return;
  }
  
  // Disable button and show testing status
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  showAPIStatus('Testing API connection...', 'testing');
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Respond with just the number "42"'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10
        }
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0]) {
      showAPIStatus('API connection successful! ✓', 'success');
    } else {
      throw new Error(data.error?.message || 'API test failed');
    }
  } catch (error) {
    console.error('API test error:', error);
    showAPIStatus('API test failed: ' + error.message, 'error');
  } finally {
    // Re-enable button
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

function showAPIStatus(message, type) {
  const statusDiv = document.getElementById('apiStatus');
  statusDiv.textContent = message;
  statusDiv.className = 'api-status ' + type;
  statusDiv.style.display = 'block';
}

function loadCustomRules(rules) {
  const container = document.getElementById('customRulesList');
  container.innerHTML = '';

  rules.forEach((rule, index) => {
    const ruleElement = createCustomRuleElement(rule, index);
    container.appendChild(ruleElement);
  });

  if (rules.length === 0) {
    container.innerHTML = '<p style="color: #666; font-size: 14px;">No custom rules defined</p>';
  }
}

function createCustomRuleElement(rule, index) {
  const div = document.createElement('div');
  div.className = 'custom-rule-item';
  div.innerHTML = `
    <div class="rule-info">
      <strong>${rule.pattern}</strong>
      <span class="rule-category">${rule.category}</span>
    </div>
    <div class="rule-actions">
      <button class="edit-rule-btn" data-index="${index}">Edit</button>
      <button class="delete-rule-btn" data-index="${index}">Delete</button>
    </div>
  `;
  
  // Add event listeners
  div.querySelector('.edit-rule-btn').addEventListener('click', () => editCustomRule(index));
  div.querySelector('.delete-rule-btn').addEventListener('click', () => deleteCustomRule(index));
  
  return div;

  // Add event listeners for rule actions
  div.querySelector('.edit-rule-btn').addEventListener('click', () => editCustomRule(index));
  div.querySelector('.delete-rule-btn').addEventListener('click', () => deleteCustomRule(index));

  return div;
}

function showCustomRuleModal(existingRule = null, index = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${existingRule ? 'Edit' : 'Add'} Custom Rule</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="rulePattern">Website Pattern</label>
          <input type="text" id="rulePattern" placeholder="e.g., github.com, *.edu" value="${existingRule?.pattern || ''}">
          <small>Use * as wildcard. Examples: github.com, .edu, reddit.com/</small>
        </div>
        <div class="form-group">
          <label for="ruleCategory">Category</label>
          <select id="ruleCategory">
            <option value="Development" ${existingRule?.category === 'Development' ? 'selected' : ''}>Development</option>
            <option value="Learning" ${existingRule?.category === 'Learning' ? 'selected' : ''}>Learning</option>
            <option value="Research" ${existingRule?.category === 'Research' ? 'selected' : ''}>Research</option>
            <option value="Communication" ${existingRule?.category === 'Communication' ? 'selected' : ''}>Communication</option>
            <option value="Entertainment" ${existingRule?.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
            <option value="Social Media" ${existingRule?.category === 'Social Media' ? 'selected' : ''}>Social Media</option>
            <option value="News" ${existingRule?.category === 'News' ? 'selected' : ''}>News</option>
            <option value="Other" ${existingRule?.category === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="save-rule-btn">${existingRule ? 'Update' : 'Add'} Rule</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('.save-rule-btn').addEventListener('click', () => {
    const pattern = modal.querySelector('#rulePattern').value.trim();
    const category = modal.querySelector('#ruleCategory').value;

    if (!pattern) {
      alert('Please enter a website pattern');
      return;
    }

    saveCustomRule(pattern, category, index);
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function saveCustomRule(pattern, category, index = null) {
  const settings = await chrome.storage.sync.get({ customRules: [] });
  const rules = settings.customRules;

  const rule = { pattern, category, id: Date.now() };

  if (index !== null) {
    rules[index] = rule;
  } else {
    rules.push(rule);
  }

  await chrome.storage.sync.set({ customRules: rules });
  loadCustomRules(rules);
}

async function deleteCustomRule(index) {
  if (!confirm('Are you sure you want to delete this rule?')) return;

  const settings = await chrome.storage.sync.get({ customRules: [] });
  const rules = settings.customRules;
  rules.splice(index, 1);

  await chrome.storage.sync.set({ customRules: rules });
  loadCustomRules(rules);
}

async function editCustomRule(index) {
  const settings = await chrome.storage.sync.get({ customRules: [] });
  const rule = settings.customRules[index];
  showCustomRuleModal(rule, index);
}

function editCategory(categoryType) {
  // This would open a more advanced editor for predefined categories
  alert(`Category editing for ${categoryType} categories will be available in a future update!`);
}

async function saveSettings() {
  try {
    const settings = {
      weeklyReports: document.getElementById('weeklyReports').checked,
      emailAddress: document.getElementById('emailAddress').value,
      focusGoal: parseInt(document.getElementById('focusGoal').value),
      trackInactive: document.getElementById('trackInactive').checked,
      minSessionTime: parseInt(document.getElementById('minSessionTime').value),
      dataRetention: parseInt(document.getElementById('dataRetention').value),
      enableAI: document.getElementById('enableAI').checked,
      geminiApiKey: document.getElementById('geminiApiKey').value.trim(),
      enableFallback: document.getElementById('enableFallback').checked
    };

    await chrome.storage.sync.set(settings);
    
    // Show success message
    showNotification('Settings saved successfully!', 'success');
    
    // Apply settings to background script
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Error saving settings', 'error');
  }
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

  try {
    await chrome.storage.sync.clear();
    await loadSettings();
    showNotification('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showNotification('Error resetting settings', 'error');
  }
}

async function exportData() {
  try {
    const allData = await chrome.storage.local.get();
    const settings = await chrome.storage.sync.get();
    
    const exportData = {
      userData: allData,
      settings: settings,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focustracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('Error exporting data', 'error');
  }
}

async function clearAllData() {
  if (!confirm('Are you sure you want to delete ALL tracking data? This cannot be undone!')) return;
  
  if (!confirm('This will permanently delete all your focus scores, time tracking data, and reports. Are you absolutely sure?')) return;

  try {
    await chrome.storage.local.clear();
    showNotification('All data cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing data:', error);
    showNotification('Error clearing data', 'error');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Add modal and notification styles
const additionalStyles = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80%;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 5px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group small {
  color: #666;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.cancel-btn, .save-rule-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #ddd;
}

.save-rule-btn {
  background: #667eea;
  color: white;
}

.custom-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.rule-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rule-category {
  font-size: 12px;
  color: #666;
}

.rule-actions {
  display: flex;
  gap: 5px;
}

.edit-rule-btn, .delete-rule-btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.delete-rule-btn {
  color: #dc2626;
  border-color: #dc2626;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

.notification-success {
  background: #10b981;
}

.notification-error {
  background: #ef4444;
}

.notification-info {
  background: #3b82f6;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

const style = document.createElement('style');
style.textContent = additionalStyles;
document.head.appendChild(style);