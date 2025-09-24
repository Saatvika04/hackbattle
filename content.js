// Content script for FocusTracker
let isActive = true;
let lastActivity = Date.now();

// Track user activity
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keypress', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('click', updateActivity);

// Check for inactivity every 30 seconds
setInterval(checkInactivity, 30000);

function updateActivity() {
  lastActivity = Date.now();
  if (!isActive) {
    isActive = true;
    try {
      chrome.runtime.sendMessage({ type: 'USER_ACTIVE' });
    } catch (error) {
      // Extension context invalidated, ignore error
      console.debug('Extension context invalidated:', error);
    }
  }
}

function checkInactivity() {
  const inactiveTime = Date.now() - lastActivity;
  const inactiveThreshold = 2 * 60 * 1000; // 2 minutes
  
  if (inactiveTime > inactiveThreshold && isActive) {
    isActive = false;
    try {
      chrome.runtime.sendMessage({ type: 'USER_INACTIVE', inactiveTime });
    } catch (error) {
      // Extension context invalidated, ignore error
      console.debug('Extension context invalidated:', error);
    }
  }
}

// Send page view event
try {
  chrome.runtime.sendMessage({
    type: 'PAGE_VIEW',
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  });
} catch (error) {
  // Extension context invalidated, ignore error
  console.debug('Extension context invalidated:', error);
}