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
    periodInMinutes: 24 * 60,
  });

  // Set up weekly report alarm (Sunday at 9 AM)
  chrome.alarms.create('weeklyReport', {
    when: getNextSunday9AM(),
    periodInMinutes: 7 * 24 * 60,
  });
});

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    await updateTimeTracking();
    currentTabId = activeInfo.tabId;
    sessionStart = Date.now();

    const tab = await chrome.tabs.get(activeInfo.tabId);
    currentUrl = tab.url;
  } catch (error) {
    console.error('Error tracking tab activation:', error);
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.url && tabId === currentTabId) {
      await updateTimeTracking();
      currentUrl = changeInfo.url;
      sessionStart = Date.now();
    }
  } catch (error) {
    console.error('Error tracking URL update:', error);
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === 'dailyReset') {
      await processDailyReset();
    } else if (alarm.name === 'weeklyReport') {
      await generateWeeklyReport();
    }
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

async function updateTimeTracking() {
  if (!currentUrl || !sessionStart) return;

  const timeSpent = Date.now() - sessionStart;
  if (timeSpent < 5000) return; // Ignore sessions less than 5 seconds

  try {
    const category = await categorizeWebsite(currentUrl);
    const today = new Date().toDateString();

    // Get current data
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || initializeDayData();

    // Update time tracking
    todayData.timeByCategory[category] = (todayData.timeByCategory[category] || 0) + timeSpent;
    todayData.totalTime += timeSpent;

    // Calculate focus score
    todayData.focusScore = calculateFocusScore(todayData.timeByCategory);

    // Store updated data
    await chrome.storage.local.set({ [today]: todayData });
  } catch (error) {
    console.error('Error updating time tracking:', error);
  }
}

async function categorizeWebsite(url) {
  if (!url) return 'Other';

  try {
    const settings = await chrome.storage.sync.get({
      customRules: []
    });

    const domain = new URL(url).hostname.toLowerCase();

    // Check custom rules first
    for (const rule of settings.customRules) {
      if (matchesPattern(domain, rule.pattern)) {
        return rule.category;
      }
    }

    // Default categorization rules
    const defaultRules = [
      // Development
      { patterns: ['github.com', 'stackoverflow.com', 'codepen.io', 'repl.it', 'glitch.com', 'codesandbox.io', 'gitlab.com', 'bitbucket.org'], category: 'Development' },
      // Learning
      { patterns: ['coursera.org', 'udemy.com', 'khan.', 'edx.org', 'codecademy.com', 'freecodecamp.org', 'pluralsight.com', 'lynda.com', 'brilliant.org'], category: 'Learning' },
      // Research
      { patterns: ['scholar.google', 'researchgate.net', 'arxiv.org', 'jstor.org', 'pubmed.', 'ieee.org', 'acm.org', 'wikipedia.org', 'britannica.com'], category: 'Research' },
      // Communication
      { patterns: ['gmail.com', 'outlook.', 'slack.com', 'teams.microsoft.com', 'zoom.us', 'meet.google.com', 'discord.com', 'telegram.', 'whatsapp.'], category: 'Communication' },
      // Social Media
      { patterns: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'reddit.com', 'pinterest.com'], category: 'Social Media' },
      // Entertainment
      { patterns: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'spotify.com', 'apple.com/music', 'soundcloud.com', 'pandora.com'], category: 'Entertainment' },
      // News
      { patterns: ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'ap.org', 'npr.org', 'washingtonpost.com', 'theguardian.com'], category: 'News' }
    ];

    // Check default rules
    for (const ruleGroup of defaultRules) {
      for (const pattern of ruleGroup.patterns) {
        if (matchesPattern(domain, pattern)) {
          return ruleGroup.category;
        }
      }
    }

    return 'Other';
  } catch (error) {
    console.error('Error categorizing website:', error);
    return 'Other';
  }
}

function matchesPattern(domain, pattern) {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
    
  const regex = new RegExp(regexPattern, 'i');
  return regex.test(domain);
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
    sessions: 0,
  };
}

async function initializeDailyData() {
  const today = new Date().toDateString();
  try {
    const result = await chrome.storage.local.get([today]);
    if (!result[today]) {
      await chrome.storage.local.set({ [today]: initializeDayData() });
    }
  } catch (error) {
    console.error('Error initializing daily data:', error);
  }
}

async function processDailyReset() {
  try {
    await updateTimeTracking();
    await initializeDailyData();
  } catch (error) {
    console.error('Error processing daily reset:', error);
  }
}

async function generateWeeklyReport() {
  try {
    const weekData = await getWeekData();
    const report = createWeeklyReport(weekData);

    // Store report for popup display
    await chrome.storage.local.set({
      weeklyReport: report,
      lastReportDate: new Date().toISOString(),
    });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Weekly Focus Report Ready!',
      message: `Your focus score this week: ${report.averageFocusScore}%`,
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
  }
}

async function getWeekData() {
  const weekData = [];
  const today = new Date();

  try {
    const allData = await chrome.storage.local.get(null); // Fetch all stored data

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      weekData.push(allData[dateString] || initializeDayData());
    }
  } catch (error) {
    console.error('Error fetching week data:', error);
  }

  return weekData;
}

function createWeeklyReport(weekData) {
  const totalTime = weekData.reduce((sum, day) => sum + day.totalTime, 0);
  const averageFocusScore = Math.round(
    weekData.reduce((sum, day) => sum + day.focusScore, 0) / weekData.length
  );

  const categoryTotals = {};
  weekData.forEach((day) => {
    Object.entries(day.timeByCategory).forEach(([category, time]) => {
      categoryTotals[category] = (categoryTotals[category] || 0) + time;
    });
  });

  // Enhanced analysis
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  const distractingCategories = ['Entertainment', 'Social Media', 'News'];
  
  let productiveTime = 0;
  let distractingTime = 0;
  let topDistraction = { category: 'None', time: 0 };
  let topProductive = { category: 'None', time: 0 };

  Object.entries(categoryTotals).forEach(([category, time]) => {
    if (productiveCategories.includes(category)) {
      productiveTime += time;
      if (time > topProductive.time) {
        topProductive = { category, time };
      }
    } else if (distractingCategories.includes(category)) {
      distractingTime += time;
      if (time > topDistraction.time) {
        topDistraction = { category, time };
      }
    }
  });

  // Calculate trends
  const dailyScores = weekData.map((day) => day.focusScore);
  const trend = calculateTrend(dailyScores);
  const streaks = calculateStreaks(dailyScores);
  
  // Generate insights
  const insights = generateInsights({
    averageFocusScore,
    productiveTime,
    distractingTime,
    totalTime,
    topDistraction,
    topProductive,
    trend,
    streaks,
    categoryTotals
  });

  return {
    weekStart: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toDateString(),
    weekEnd: new Date().toDateString(),
    totalTime: Math.round(totalTime / 1000 / 60), // Convert to minutes
    averageFocusScore,
    categoryTotals,
    topDistraction,
    topProductive,
    productiveTime: Math.round(productiveTime / 1000 / 60),
    distractingTime: Math.round(distractingTime / 1000 / 60),
    dailyScores,
    trend,
    streaks,
    insights
  };
}

function calculateTrend(scores) {
  if (scores.length < 2) return 'stable';
  
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

function calculateStreaks(scores) {
  let currentStreak = 0;
  let bestStreak = 0;
  const threshold = 70; // Focus score threshold for "good" days
  
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= threshold) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      if (currentStreak > 0) break; // Stop counting current streak
    }
  }
  
  return { current: currentStreak, best: bestStreak };
}

function generateInsights(data) {
  const insights = [];
  const { averageFocusScore, productiveTime, distractingTime, totalTime, topDistraction, topProductive, trend, streaks } = data;
  
  // Focus score insights
  if (averageFocusScore >= 80) {
    insights.push({
      type: 'success',
      title: 'Excellent Focus!',
      message: `Your average focus score of ${averageFocusScore}% is outstanding. Keep up the great work!`,
      action: 'Continue your current productivity habits'
    });
  } else if (averageFocusScore >= 60) {
    insights.push({
      type: 'warning',
      title: 'Room for Improvement',
      message: `Your focus score of ${averageFocusScore}% is decent, but you can do better.`,
      action: `Try reducing time on ${topDistraction.category} by 15 minutes daily`
    });
  } else {
    insights.push({
      type: 'alert',
      title: 'Focus Needs Attention',
      message: `Your focus score of ${averageFocusScore}% indicates significant distractions.`,
      action: `Consider blocking ${topDistraction.category} during work hours`
    });
  }
  
  // Trend insights
  if (trend === 'improving') {
    insights.push({
      type: 'success',
      title: 'Positive Trend!',
      message: 'Your focus is improving throughout the week.',
      action: 'Identify what changed and maintain these habits'
    });
  } else if (trend === 'declining') {
    insights.push({
      type: 'warning',
      title: 'Declining Focus',
      message: 'Your focus decreased as the week progressed.',
      action: 'Review your schedule and identify stress factors'
    });
  }
  
  // Streak insights
  if (streaks.current >= 3) {
    insights.push({
      type: 'success',
      title: `${streaks.current}-Day Focus Streak!`,
      message: 'You\'re on a roll with consistent high focus scores.',
      action: 'Challenge yourself to extend this streak'
    });
  }
  
  // Time allocation insights
  const productivePercentage = (productiveTime / totalTime) * 100;
  if (productivePercentage < 30) {
    insights.push({
      type: 'alert',
      title: 'Low Productive Time',
      message: `Only ${productivePercentage.toFixed(1)}% of your time was spent productively.`,
      action: `Increase ${topProductive.category} activities by 30 minutes daily`
    });
  }
  
  return insights;
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
  const daysUntilSunday = (7 - now.getDay()) % 7; // 0 if today is Sunday
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(9, 0, 0, 0);
  return nextSunday.getTime();
}