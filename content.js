// Content script for FocusTracker
let isActive = true;
let lastActivity = Date.now();

// Track user activity
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keypress', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('click', updateActivity);

// Helper function to safely send messages
function safeSendMessage(message) {
  if (chrome.runtime && chrome.runtime.id) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      // Extension context invalidated, ignore error
      console.debug('Extension context invalidated:', error);
    }
  }
}

// Check for inactivity every 30 seconds
setInterval(checkInactivity, 30000);

function updateActivity() {
  lastActivity = Date.now();
  if (!isActive) {
    isActive = true;
    safeSendMessage({ type: 'USER_ACTIVE' });
  }
}

function checkInactivity() {
  const inactiveTime = Date.now() - lastActivity;
  const inactiveThreshold = 2 * 60 * 1000; // 2 minutes
  
  if (inactiveTime > inactiveThreshold && isActive) {
    isActive = false;
    safeSendMessage({ type: 'USER_INACTIVE', inactiveTime });
  }
}

// Send page view event
safeSendMessage({
  type: 'PAGE_VIEW',
  url: window.location.href,
  title: document.title,
  timestamp: Date.now()
});

// Listen for messages from the website to sync task/blacklist into extension storage
window.addEventListener('message', function(event) {
  // Only accept messages from the same page context
  if (event.source !== window || !event.data || typeof event.data.type !== 'string') {
    return;
  }

  try {
    if (event.data.type === 'LOCKEDIN_START_TASK') {
      var p = event.data.payload || {};
      chrome.storage.local.set({
        currentTask: p.currentTask,
        taskDuration: p.taskDuration,
        taskStartTime: p.taskStartTime,
        isTaskActive: !!p.isTaskActive
      });
    } else if (event.data.type === 'LOCKEDIN_SYNC_BLACKLIST') {
      var bl = (event.data.payload && event.data.payload.blacklist) || [];
      chrome.storage.local.set({ lockedInBlacklist: bl });
    }
  } catch (e) {
    // Ignore if chrome APIs are unavailable on this page
  }
});