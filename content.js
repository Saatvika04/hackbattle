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
    chrome.runtime.sendMessage({ type: 'USER_ACTIVE' });
  }
}

function checkInactivity() {
  const inactiveTime = Date.now() - lastActivity;
  const inactiveThreshold = 2 * 60 * 1000; // 2 minutes
  
  if (inactiveTime > inactiveThreshold && isActive) {
    isActive = false;
    chrome.runtime.sendMessage({ type: 'USER_INACTIVE', inactiveTime });
  }
}

// Send page view event
chrome.runtime.sendMessage({
  type: 'PAGE_VIEW',
  url: window.location.href,
  title: document.title,
  timestamp:    Date.now()
});