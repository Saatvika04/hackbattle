// FocusTracker Background Service Worker
let currentTabId = null;
let currentUrl = null;
let sessionStart = Date.now();
let dailyData = {};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusTracker installed');
  initializeDailyData();
  
  // Set up daily reset alarm
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60
  });
  
  // Set up weekly report alarm (Sunday at 9 AM)
  chrome.alarms.create('weeklyReport', {
    when: getNextSunday9AM(),
    periodInMinutes: 7 * 24 * 60
  });
});

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTimeTracking();
  currentTabId = activeInfo.tabId;
  sessionStart = Date.now();
  
  const tab = await chrome.tabs.get(activeInfo.tabId);
  currentUrl = tab.url;
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === currentTabId) {
    await updateTimeTracking();
    currentUrl = changeInfo.url;
    sessionStart = Date.now();
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyReset') {
    await processDailyReset();
  } else if (alarm.name === 'weeklyReport') {
    await generateWeeklyReport();
  }
});

async function updateTimeTracking() {
  if (!currentUrl || !sessionStart) return;
  
  const timeSpent = Date.now() - sessionStart;
  if (timeSpent < 5000) return; // Ignore sessions less than 5 seconds
  
  const category = categorizeWebsite(currentUrl);
  const today = new Date().toDateString();
  
  // Get current data
  const result = await chrome.storage.local.get([today]);
  const todayData = result[today] || initializeDayData();
  
  // Update time tracking
  if (!todayData.timeByCategory[category]) {
    todayData.timeByCategory[category] = 0;
  }
  todayData.timeByCategory[category] += timeSpent;
  todayData.totalTime += timeSpent;
  
  // Calculate focus score
  todayData.focusScore = calculateFocusScore(todayData.timeByCategory);
  
  // Store updated data
  await chrome.storage.local.set({ [today]: todayData });
}

function categorizeWebsite(url) {
  if (!url) return 'Other';
  
  const domain = new URL(url).hostname.toLowerCase();
  
  // Productive categories
  if (domain.includes('github') || domain.includes('stackoverflow') || 
      domain.includes('documentation') || domain.includes('developer.mozilla')) {
    return 'Development';
  }
  
  if (domain.includes('coursera') || domain.includes('udemy') || 
      domain.includes('khan') || domain.includes('edu')) {
    return 'Learning';
  }
  
  if (domain.includes('google') && url.includes('search')) {
    return 'Research';
  }
  
  if (domain.includes('gmail') || domain.includes('outlook') || 
      domain.includes('slack') || domain.includes('teams')) {
    return 'Communication';
  }
  
  // Distracting categories
  if (domain.includes('youtube') || domain.includes('netflix') || 
      domain.includes('twitch') || domain.includes('tiktok')) {
    return 'Entertainment';
  }
  
  if (domain.includes('facebook') || domain.includes('twitter') || 
      domain.includes('instagram') || domain.includes('linkedin')) {
    return 'Social Media';
  }
  
  if (domain.includes('news') || domain.includes('cnn') || 
      domain.includes('bbc') || domain.includes('reddit')) {
    return 'News';
  }
  
  return 'Other';
}

function calculateFocusScore(timeByCategory) {
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  const distractingCategories = ['Entertainment', 'Social Media', 'News'];
  
  let productiveTime = 0;
  let distractingTime = 0;
  let totalTime = 0;
  
  Object.entries(timeByCategory).forEach(([category, time]) => {
    totalTime += time;
    if (productiveCategories.includes(category)) {
      productiveTime += time;
    } else if (distractingCategories.includes(category)) {
      distractingTime += time;
    }
  });
  
  if (totalTime === 0) return 100;
  
  const focusRatio = productiveTime / totalTime;
  const distractionPenalty = Math.min(distractingTime / totalTime, 0.3);
  
  return Math.max(0, Math.round((focusRatio - distractionPenalty) * 100));
}

function initializeDayData() {
  return {
    date: new Date().toDateString(),
    timeByCategory: {},
    totalTime: 0,
    focusScore: 100,
    sessions: 0
  };
}

async function initializeDailyData() {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get([today]);
  
  if (!result[today]) {
    await chrome.storage.local.set({ [today]: initializeDayData() });
  }
}

async function processDailyReset() {
  await updateTimeTracking();
  await initializeDailyData();
}

async function generateWeeklyReport() {
  const weekData = await getWeekData();
  const report = createWeeklyReport(weekData);
  
  // Store report for popup display
  await chrome.storage.local.set({ 
    weeklyReport: report,
    lastReportDate: new Date().toISOString()
  });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Weekly Focus Report Ready!',
    message: `Your focus score this week: ${report.averageFocusScore}%`
  });
}

async function getWeekData() {
  const weekData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    
    const result = await chrome.storage.local.get([dateString]);
    weekData.push(result[dateString] || initializeDayData());
  }
  
  return weekData;
}

function createWeeklyReport(weekData) {
  const totalTime = weekData.reduce((sum, day) => sum + day.totalTime, 0);
  const averageFocusScore = Math.round(
    weekData.reduce((sum, day) => sum + day.focusScore, 0) / weekData.length
  );
  
  const categoryTotals = {};
  weekData.forEach(day => {
    Object.entries(day.timeByCategory).forEach(([category, time]) => {
      categoryTotals[category] = (categoryTotals[category] || 0) + time;
    });
  });
  
  // Find top distraction
  const distractingCategories = ['Entertainment', 'Social Media', 'News'];
  let topDistraction = { category: 'None', time: 0 };
  
  Object.entries(categoryTotals).forEach(([category, time]) => {
    if (distractingCategories.includes(category) && time > topDistraction.time) {
      topDistraction = { category, time };
    }
  });
  
  return {
    weekStart: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toDateString(),
    weekEnd: new Date().toDateString(),
    totalTime: Math.round(totalTime / 1000 / 60), // Convert to minutes
    averageFocusScore,
    categoryTotals,
    topDistraction,
    dailyScores: weekData.map(day => day.focusScore)
  };
}

function getNextMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

function getNextSunday9AM() {
  const now = new Date();
  const nextSunday = new Date();
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(9, 0, 0, 0);
  return nextSunday.getTime();
}