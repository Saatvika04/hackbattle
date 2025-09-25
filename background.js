// LockedIn Background Service Worker
let currentTabId = null;
let currentUrl = null;
let sessionStart = Date.now();
let dailyData = {};
let taskTimer = null;
let blacklist = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('LockedIn installed');
  initializeDailyData();
  loadBlacklist();

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

  // Set up timer check alarm (every minute during active tasks)
  chrome.alarms.create('timerCheck', {
    when: Date.now() + 60000,
    periodInMinutes: 1,
  });
});

// Load blacklist from storage
async function loadBlacklist() {
  try {
    const result = await chrome.storage.local.get(['blacklist']);
    blacklist = result.blacklist || [];
  } catch (error) {
    console.error('Error loading blacklist:', error);
  }
}

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    await updateTimeTracking();
    currentTabId = activeInfo.tabId;
    sessionStart = Date.now();

    const tab = await chrome.tabs.get(activeInfo.tabId);
    currentUrl = tab.url;
    
    // Check if site is blacklisted during active task
    await checkBlacklistViolation(tab.url);
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
      
      // Check if site is blacklisted during active task
      await checkBlacklistViolation(changeInfo.url);
    }
  } catch (error) {
    console.error('Error tracking URL update:', error);
  }
});

// Check if current site violates blacklist during active task
async function checkBlacklistViolation(url) {
  try {
    const result = await chrome.storage.local.get(['isTaskActive', 'distractionAlerts']);
    
    if (!result.isTaskActive || !result.distractionAlerts) {
      return; // No active task or alerts disabled
    }

    const domain = extractDomain(url);
    const isBlacklisted = blacklist.some(blocked => domain.includes(blocked));
    
    if (isBlacklisted) {
      // Show distraction alert
      await chrome.notifications.create({
        type: 'basic',
        title: '🚨 LockedIn Alert',
        message: `You're on ${domain} during your focus session. Stay focused!`,
        priority: 2
      });

      // Track distracted time
      await trackDistractedTime();
    } else {
      // Track relevant time
      await trackRelevantTime();
    }
  } catch (error) {
    console.error('Error checking blacklist violation:', error);
  }
}

// Track time spent on relevant (non-blacklisted) sites
async function trackRelevantTime() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
    
    todayData.relevantTime = (todayData.relevantTime || 0) + 1; // 1 minute increment
    
    await chrome.storage.local.set({ [today]: todayData });
  } catch (error) {
    console.error('Error tracking relevant time:', error);
  }
}

// Track time spent on blacklisted/distracted sites
async function trackDistractedTime() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
    
    todayData.distractedTime = (todayData.distractedTime || 0) + 1; // 1 minute increment
    
    await chrome.storage.local.set({ [today]: todayData });
  } catch (error) {
    console.error('Error tracking distracted time:', error);
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return '';
  }
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === 'dailyReset') {
      await processDailyReset();
    } else if (alarm.name === 'weeklyReport') {
      await generateWeeklyReport();
    } else if (alarm.name === 'timerCheck') {
      await checkTaskTimer();
    }
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

// Check active task timer and send notifications
async function checkTaskTimer() {
  try {
    const result = await chrome.storage.local.get([
      'isTaskActive', 
      'taskStartTime', 
      'taskDuration', 
      'currentTask',
      'breakReminders',
      'sessionComplete'
    ]);

    if (!result.isTaskActive || !result.taskStartTime || !result.taskDuration) {
      return;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - result.taskStartTime) / 1000 / 60); // minutes
    const remaining = result.taskDuration - elapsed;

    // Check if task is complete
    if (remaining <= 0 && result.sessionComplete) {
      await chrome.storage.local.set({ isTaskActive: false });
      
      await chrome.notifications.create({
        type: 'basic',
        title: '🎉 Task Complete!',
        message: `Great job! You completed "${result.currentTask}". Time for a well-deserved break!`,
        priority: 2
      });
      
      return;
    }

    // Send break reminders at specific intervals
    if (result.breakReminders) {
      const breakIntervals = [15, 30, 45, 60, 90]; // minutes
      
      if (breakIntervals.includes(elapsed)) {
        await chrome.notifications.create({
          type: 'basic',
          title: '💡 Focus Reminder',
          message: `You've been focused for ${elapsed} minutes. Keep going! ${remaining} minutes left.`,
          priority: 1
        });
      }
    }
  } catch (error) {
    console.error('Error checking task timer:', error);
  }
}

// Listen for storage changes to reload blacklist
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.blacklist) {
    blacklist = changes.blacklist.newValue || [];
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_INACTIVE') {
    // User is idle. Finalize the last session and pause tracking.
    console.log('User inactive, pausing tracking.');
    updateTimeTracking(); // Save the time spent before becoming inactive
    currentUrl = null;    // Pause tracking by clearing the current URL
  } else if (message.type === 'USER_ACTIVE') {
    // User is active again. Resume tracking.
    console.log('User active, resuming tracking.');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        currentTabId = tabs[0].id;
        currentUrl = tabs[0].url;
        sessionStart = Date.now(); // Start a new session
      }
    });
  }
  return true; // Keep the message channel open for async response
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

    // Calculate focus score (now async)
    todayData.focusScore = await calculateFocusScore(todayData.timeByCategory);

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

// Enhanced LLM-powered focus score calculation using all tracking parameters
async function calculateFocusScore(timeByCategory) {
  try {
    // Try enhanced LLM-powered calculation first
    var enhancedScore = await calculateEnhancedFocusScore({ timeByCategory: timeByCategory });
    console.log('🤖 Enhanced LLM Focus Score:', enhancedScore);
    return enhancedScore;
    
  } catch (error) {
    console.error('Enhanced scoring failed, using traditional method:', error);
    return calculateTraditionalFocusScore(timeByCategory);
  }
}

// Comprehensive tracking data gathering for LLM analysis
async function gatherComprehensiveTrackingData() {
  var today = new Date().toDateString();
  var result = await chrome.storage.local.get([
    today, 'currentSession', 'recentActivity', 'userBehaviorPatterns'
  ]);
  
  var todayData = result[today] || {};
  var session = result.currentSession || {};
  var currentTime = new Date();
  
  // Calculate session metrics
  var sessionDuration = session.startTime ? (currentTime.getTime() - session.startTime) : 0;
  var tabSwitches = session.tabSwitches || 0;
  var focusBreaks = session.focusBreaks || 0;
  var distractionCount = session.distractions || 0;
  var activeTime = session.activeTime || 0;
  var totalTime = session.totalTime || sessionDuration;
  var activeTimeRatio = totalTime > 0 ? activeTime / totalTime : 0;
  
  // Calculate website relevance metrics
  var relevanceData = session.aiRelevanceData || [];
  var averageRelevance = calculateAverageRelevance(relevanceData);
  
  // Get historical context
  var weeklyTrend = await getWeeklyFocusTrend();
  var previousSession = await getPreviousSessionScore();
  
  return {
    // Time-based metrics
    timeDistribution: todayData.timeByCategory || {},
    totalActiveTime: todayData.totalTime || 0,
    sessionDuration: sessionDuration,
    timeOfDay: currentTime.getHours(),
    
    // Website relevance data (from LLM analysis)
    websiteRelevanceScores: relevanceData,
    averageRelevance: averageRelevance,
    
    // Behavioral patterns
    tabSwitchFrequency: tabSwitches,
    focusBreaks: focusBreaks,
    distractionCount: distractionCount,
    
    // Session context
    sessionGoal: session.category || 'general',
    declaredTask: session.task || 'unspecified',
    
    // Historical context
    weeklyTrend: weeklyTrend,
    previousSession: previousSession,
    
    // Real-time indicators
    currentStreak: session.focusStreak || 0,
    productivityMomentum: calculateMomentum(session),
    
    // User engagement metrics
    activeTimeRatio: activeTimeRatio,
    deepWorkPeriods: session.deepWorkSessions || 0
  };
}

// Enhanced focus score calculation using LLM + comprehensive tracking data
async function calculateEnhancedFocusScore(basicData) {
  // Collect ALL tracking parameters
  var trackingData = await gatherComprehensiveTrackingData();
  
  // Merge with basic data
  if (basicData.timeByCategory) {
    trackingData.timeDistribution = basicData.timeByCategory;
  }
  
  // Use LLM to analyze and score
  var llmScore = await getLLMFocusAnalysis(trackingData);
  
  // Combine with traditional metrics for robustness
  var hybridScore = combineMetrics(llmScore, trackingData);
  
  return hybridScore;
}

// LLM analyzes ALL parameters to generate intelligent focus score
async function getLLMFocusAnalysis(trackingData) {
  var result = await chrome.storage.local.get(['geminiApiKey']);
  var apiKey = result.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('No API key available');
  }
  
  // Prepare time distribution summary
  var timeDistributionSummary = '';
  for (var category in trackingData.timeDistribution) {
    var minutes = Math.round(trackingData.timeDistribution[category] / 60000);
    timeDistributionSummary += '- ' + category + ': ' + minutes + ' minutes\n';
  }
  
  // Prepare relevance scores summary
  var relevanceScoresSummary = '';
  var recentScores = trackingData.websiteRelevanceScores.slice(-5);
  for (var i = 0; i < recentScores.length; i++) {
    var score = recentScores[i];
    relevanceScoresSummary += '- ' + (score.url || 'unknown') + ': ' + (score.relevance.confidence || 50) + '%\n';
  }
  
  var prompt = 'COMPREHENSIVE FOCUS ANALYSIS\n\n' +
              'Analyze this user\'s focus session data and provide a focus score from 0-100.\n\n' +
              'TEMPORAL CONTEXT:\n' +
              '- Session Duration: ' + Math.round(trackingData.sessionDuration / 60000) + ' minutes\n' +
              '- Time of Day: ' + getTimeContext(trackingData.timeOfDay) + '\n' +
              '- Total Active Time: ' + Math.round(trackingData.totalActiveTime / 60000) + ' minutes\n\n' +
              'WEBSITE ACTIVITY ANALYSIS:\n' +
              '- Average Site Relevance: ' + Math.round(trackingData.averageRelevance) + '% (from previous AI analysis)\n' +
              '- Recent Site Scores:\n' + relevanceScoresSummary + '\n' +
              'TIME DISTRIBUTION:\n' + timeDistributionSummary + '\n' +
              'BEHAVIORAL INDICATORS:\n' +
              '- Tab Switch Frequency: ' + trackingData.tabSwitchFrequency + ' switches\n' +
              '- Focus Breaks: ' + trackingData.focusBreaks + '\n' +
              '- Distraction Events: ' + trackingData.distractionCount + '\n' +
              '- Active Engagement Ratio: ' + Math.round(trackingData.activeTimeRatio * 100) + '%\n\n' +
              'SESSION CONTEXT:\n' +
              '- Declared Goal: "' + trackingData.sessionGoal + '"\n' +
              '- Specific Task: "' + trackingData.declaredTask + '"\n' +
              '- Current Focus Streak: ' + trackingData.currentStreak + ' minutes\n' +
              '- Deep Work Periods: ' + trackingData.deepWorkPeriods + '\n\n' +
              'HISTORICAL PERFORMANCE:\n' +
              '- Weekly Trend: ' + trackingData.weeklyTrend + '\n' +
              '- Previous Session: ' + trackingData.previousSession + '%\n' +
              '- Productivity Momentum: ' + trackingData.productivityMomentum + '\n\n' +
              'ANALYSIS FRAMEWORK:\n' +
              'Consider these weighted factors:\n' +
              '1. Website Relevance Quality (30%): How well sites match the declared goals\n' +
              '2. Time Management (25%): Session length, breaks, and engagement patterns\n' +
              '3. Behavioral Focus (20%): Tab switching, distraction resistance\n' +
              '4. Goal Alignment (15%): Activities matching declared intentions\n' +
              '5. Momentum & Consistency (10%): Building on previous performance\n\n' +
              'Provide ONLY a number from 0-100 representing the comprehensive focus score.\n\n' +
              'Examples:\n' +
              '- High relevance sites + long focus periods + minimal distractions = 85-95\n' +
              '- Mixed relevance + moderate focus + some distractions = 60-75\n' +
              '- Low relevance sites + frequent switching + many breaks = 30-50\n' +
              '- Mostly distracting sites + short sessions + high switching = 10-30';

  var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 10
      }
    })
  });

  var data = await response.json();
  var llmScoreText = data.candidates && data.candidates[0] && 
                    data.candidates[0].content && data.candidates[0].content.parts && 
                    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  
  var llmScore = parseInt(llmScoreText ? llmScoreText.trim() : '50');
  
  return isNaN(llmScore) ? 50 : Math.max(0, Math.min(100, llmScore));
}

// Combine LLM analysis with traditional metrics for robust scoring
function combineMetrics(llmScore, trackingData) {
  // Calculate traditional metrics
  var traditionalScore = calculateTraditionalFocusScore(trackingData.timeDistribution);
  
  // Weight the scores (LLM gets 70%, traditional gets 30%)
  var hybridScore = Math.round((llmScore * 0.7) + (traditionalScore * 0.3));
  
  // Apply contextual adjustments
  var adjustedScore = applyContextualAdjustments(hybridScore, trackingData);
  
  return Math.max(0, Math.min(100, adjustedScore));
}

// Traditional focus score calculation (fallback method)
function calculateTraditionalFocusScore(timeByCategory) {
  var productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  var distractingCategories = ['Entertainment', 'Social Media', 'News'];

  var productiveTime = 0;
  var distractingTime = 0;
  var totalTime = 0;

  for (var category in timeByCategory) {
    var time = timeByCategory[category];
    totalTime += time;
    if (productiveCategories.indexOf(category) !== -1) {
      productiveTime += time;
    } else if (distractingCategories.indexOf(category) !== -1) {
      distractingTime += time;
    }
  }

  if (totalTime === 0) return 100;

  var focusRatio = productiveTime / totalTime;
  var distractionPenalty = Math.min(distractingTime / totalTime, 0.3);

  return Math.max(0, Math.round((focusRatio - distractionPenalty) * 100));
}

// Helper functions for comprehensive tracking
function calculateAverageRelevance(relevanceData) {
  if (!relevanceData || relevanceData.length === 0) return 50;
  var sum = 0;
  for (var i = 0; i < relevanceData.length; i++) {
    var confidence = relevanceData[i].relevance ? relevanceData[i].relevance.confidence : 50;
    sum += confidence;
  }
  return Math.round(sum / relevanceData.length);
}

function getTimeContext(hour) {
  if (hour >= 6 && hour < 12) return 'Morning (Peak Focus Period)';
  if (hour >= 12 && hour < 14) return 'Lunch Break Period';
  if (hour >= 14 && hour < 18) return 'Afternoon Work Period';
  if (hour >= 18 && hour < 22) return 'Evening Personal Time';
  return 'Late Night/Early Morning';
}

function calculateMomentum(session) {
  var recentScores = session.recentFocusScores || [];
  if (recentScores.length < 2) return 'establishing';
  
  var trend = recentScores[recentScores.length - 1] - recentScores[0];
  if (trend > 10) return 'improving';
  if (trend < -10) return 'declining';
  return 'stable';
}

async function getWeeklyFocusTrend() {
  try {
    var weekData = {};
    var today = new Date();
    
    for (var i = 0; i < 7; i++) {
      var date = new Date(today);
      date.setDate(today.getDate() - i);
      var dateString = date.toDateString();
      
      var result = await chrome.storage.local.get([dateString]);
      if (result[dateString] && result[dateString].focusScore !== undefined) {
        weekData[dateString] = result[dateString].focusScore;
      }
    }
    
    var scores = Object.values(weekData);
    if (scores.length < 2) return 'insufficient data';
    
    var avgScore = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
    var recentAvg = scores.slice(0, 3).reduce(function(a, b) { return a + b; }, 0) / Math.min(3, scores.length);
    
    if (recentAvg > avgScore + 5) return 'improving';
    if (recentAvg < avgScore - 5) return 'declining';
    return 'stable';
  } catch (error) {
    return 'unknown';
  }
}

async function getPreviousSessionScore() {
  try {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayString = yesterday.toDateString();
    
    var result = await chrome.storage.local.get([yesterdayString]);
    return result[yesterdayString] ? result[yesterdayString].focusScore : 75;
  } catch (error) {
    return 75;
  }
}

function applyContextualAdjustments(score, data) {
  var adjusted = score;
  
  // Time-of-day adjustments
  var hour = data.timeOfDay;
  if (hour >= 9 && hour <= 11) adjusted += 5; // Morning focus bonus
  if (hour >= 13 && hour <= 15 && score < 60) adjusted -= 5; // Post-lunch dip
  
  // Session length adjustments
  var sessionMinutes = data.sessionDuration / 60000;
  if (sessionMinutes > 90 && data.focusBreaks === 0) adjusted -= 10; // Penalize no breaks
  if (sessionMinutes >= 25 && sessionMinutes <= 50) adjusted += 5; // Optimal session length
  
  // Behavioral adjustments
  if (data.tabSwitchFrequency > 20) adjusted -= 10; // Excessive tab switching
  if (data.activeTimeRatio > 0.8) adjusted += 5; // High engagement bonus
  
  return adjusted;
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

// ===== AI RELEVANCE ENGINE =====

// AI-powered relevance checking using Gemini API
var geminiCache = {}; // Simple cache to avoid redundant API calls
var fallbackKeywords = {
  work: ['work', 'project', 'task', 'meeting', 'deadline', 'client', 'business', 'document', 'presentation', 'report', 'email', 'calendar', 'agenda', 'conference', 'zoom', 'teams', 'slack', 'jira', 'github', 'figma', 'notion', 'asana', 'trello', 'office', 'excel', 'powerpoint', 'word', 'docs', 'sheets', 'slides'],
  study: ['study', 'learn', 'course', 'education', 'university', 'college', 'lecture', 'homework', 'assignment', 'research', 'paper', 'thesis', 'exam', 'test', 'quiz', 'tutorial', 'coursera', 'udemy', 'khan', 'edx', 'mooc', 'textbook', 'notes', 'library', 'academic', 'scholar', 'journal', 'article'],
  personal: ['personal', 'hobby', 'interest', 'passion', 'creative', 'art', 'music', 'reading', 'writing', 'cooking', 'fitness', 'health', 'meditation', 'journal', 'blog', 'photography', 'drawing', 'painting', 'crafts', 'diy', 'garden'],
  entertainment: ['entertainment', 'fun', 'game', 'movie', 'video', 'tv', 'show', 'netflix', 'youtube', 'twitch', 'spotify', 'music', 'social', 'facebook', 'instagram', 'twitter', 'tiktok', 'reddit', 'meme', 'funny', 'comedy', 'sports', 'news', 'shopping', 'amazon', 'ebay']
};

function checkRelevanceWithAI(url, title, activeTabInfo, callback) {
  // Create cache key
  var cacheKey = url + '|' + title;
  
  // Check cache first
  if (geminiCache[cacheKey]) {
    callback(geminiCache[cacheKey]);
    return;
  }
  
  // Get user's API key, current session category, and personalized prompt
  chrome.storage.local.get(['geminiApiKey', 'personalizedPrompt', 'currentSessionCategory'], function(result) {
    var apiKey = result.geminiApiKey;
    var personalizedPrompt = result.personalizedPrompt || '';
    var sessionCategory = result.currentSessionCategory || 'work';
    
    if (!apiKey) {
      // Fallback to keyword matching if no API key
      var relevance = checkRelevanceWithKeywords(url, title, sessionCategory);
      geminiCache[cacheKey] = relevance;
      callback(relevance);
      return;
    }
    
    // Get current time context
    var currentHour = new Date().getHours();
    var timeContext = '';
    if (currentHour >= 9 && currentHour < 12) {
      timeContext = 'morning (peak focus time)';
    } else if (currentHour >= 12 && currentHour < 17) {
      timeContext = 'afternoon (work hours)';
    } else if (currentHour >= 17 && currentHour < 21) {
      timeContext = 'evening (personal time)';
    } else {
      timeContext = 'late hours (rest time)';
    }
    
    // Get domain for pattern recognition
    var domain = '';
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {
      domain = url.split('/')[2] || '';
    }
    
    // Prepare enhanced AI prompt with rich context and personalized preferences
    var basePrompt = 'Analyze webpage relevance for productivity tracking.\n\n' +
                'CONTEXT:\n' +
                '- Session Goal: "' + sessionCategory + '" (user\'s declared focus)\n' +
                '- Time: ' + timeContext + '\n' +
                '- Domain: ' + domain + '\n' +
                '- URL: ' + url + '\n' +
                '- Page Title: "' + title + '"\n\n';
                
    // Add personalized context if provided
    if (personalizedPrompt.trim()) {
      basePrompt += 'USER PERSONALIZED CONTEXT:\n' +
                   personalizedPrompt + '\n\n';
    }
    
    var prompt = basePrompt +
                'RELEVANCE SCORING (0-100):\n' +
                '90-100: Directly supports session goal, high productivity value\n' +
                '70-89: Somewhat relevant, moderate productivity value\n' +
                '50-69: Neutral/mixed relevance, low productivity impact\n' +
                '30-49: Slight distraction, minor productivity loss\n' +
                '0-29: Major distraction, significant productivity loss\n\n' +
                'CONSIDER:\n' +
                '- Content purpose vs session goal alignment\n' +
                '- Time appropriateness (work sites during work hours = higher score)\n' +
                '- Domain patterns (github.com for work, coursera.org for study)\n' +
                '- Title keywords indicating content type\n' +
                '- Potential for deep work vs. mindless browsing\n' +
                '- User\'s personalized context and preferences\n\n' +
                'EXAMPLES:\n' +
                '- Work session + github.com + "Project Repository" = 95\n' +
                '- Work session + linkedin.com + "Professional Network" = 80\n' +
                '- Work session + youtube.com + "JavaScript Tutorial" = 85\n' +
                '- Work session + youtube.com + "Funny Videos" = 15\n' +
                '- Study session + khan.academy.org + "Math Course" = 95\n' +
                '- Study session + reddit.com + "Programming Discussion" = 65\n' +
                '- Study session + instagram.com + "Social Feed" = 10\n' +
                '- Personal session + fitness.com + "Workout Guide" = 90\n' +
                '- Personal session + netflix.com + "Movie Night" = 75\n\n' +
                'Respond with ONLY the number (0-100):';
    
    // Make API call to Gemini Flash
    fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
          topP: 0.8,
          topK: 10
        }
      })
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      try {
        var aiResponse = data.candidates && data.candidates[0] && 
                        data.candidates[0].content && data.candidates[0].content.parts && 
                        data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        
        if (aiResponse) {
          var relevanceScore = parseInt(aiResponse.trim());
          if (!isNaN(relevanceScore) && relevanceScore >= 0 && relevanceScore <= 100) {
            // Cache successful result
            geminiCache[cacheKey] = {
              isRelevant: relevanceScore >= 60,
              confidence: relevanceScore,
              source: 'ai'
            };
            callback(geminiCache[cacheKey]);
            return;
          }
        }
        
        // Fallback if AI response is invalid
        throw new Error('Invalid AI response');
      } catch (error) {
        console.log('AI relevance check failed, using fallback:', error);
        var fallbackResult = checkRelevanceWithKeywords(url, title, sessionCategory);
        geminiCache[cacheKey] = fallbackResult;
        callback(fallbackResult);
      }
    })
    .catch(function(error) {
      console.log('Gemini API error, using fallback:', error);
      var fallbackResult = checkRelevanceWithKeywords(url, title, sessionCategory);
      geminiCache[cacheKey] = fallbackResult;
      callback(fallbackResult);
    });
  });
}

function checkRelevanceWithKeywords(url, title, sessionCategory) {
  var combinedText = (url + ' ' + title).toLowerCase();
  var categoryKeywords = fallbackKeywords[sessionCategory] || fallbackKeywords.work;
  var distractionKeywords = fallbackKeywords.entertainment;
  
  var relevantMatches = 0;
  var distractionMatches = 0;
  
  // Count relevant keyword matches
  for (var i = 0; i < categoryKeywords.length; i++) {
    if (combinedText.indexOf(categoryKeywords[i]) !== -1) {
      relevantMatches++;
    }
  }
  
  // Count distraction keyword matches
  for (var i = 0; i < distractionKeywords.length; i++) {
    if (combinedText.indexOf(distractionKeywords[i]) !== -1) {
      distractionMatches++;
    }
  }
  
  // Calculate base relevance (out of 100)
  var baseRelevance = Math.min((relevantMatches * 20), 80);
  var distractionPenalty = Math.min((distractionMatches * 15), 60);
  var finalScore = Math.max(baseRelevance - distractionPenalty, 10);
  
  return {
    isRelevant: finalScore >= 50,
    confidence: finalScore,
    source: 'keywords'
  };
}

// Clear cache periodically to prevent memory issues
function clearRelevanceCache() {
  geminiCache = {};
}

// Clear cache every hour
chrome.alarms.create('clearRelevanceCache', { periodInMinutes: 60 });

// Enhanced tab change handler with behavioral tracking
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      
      // Track behavioral metrics
      updateBehavioralMetrics('tabSwitch', tab.url);
      
      checkRelevanceWithAI(tab.url, tab.title || '', tab, function(relevanceResult) {
        // Store relevance data for current session with enhanced tracking
        chrome.storage.local.get(['currentSession'], function(result) {
          var session = result.currentSession || initializeSession();
          
          if (!session.aiRelevanceData) {
            session.aiRelevanceData = [];
          }
          
          // Track tab switching behavior
          session.tabSwitches = (session.tabSwitches || 0) + 1;
          session.lastTabSwitch = Date.now();
          
          // Track focus streaks
          if (relevanceResult.isRelevant) {
            session.currentFocusStreak = (session.currentFocusStreak || 0) + 1;
            session.totalFocusTime = (session.totalFocusTime || 0);
          } else {
            session.distractions = (session.distractions || 0) + 1;
            session.currentFocusStreak = 0;
          }
          
          // Store relevance data
          session.aiRelevanceData.push({
            timestamp: Date.now(),
            url: tab.url,
            title: tab.title,
            relevance: relevanceResult,
            tabId: tab.id,
            sessionTime: Date.now() - (session.startTime || Date.now())
          });
          
          // Keep only last 50 relevance checks to manage storage
          if (session.aiRelevanceData.length > 50) {
            session.aiRelevanceData = session.aiRelevanceData.slice(-50);
          }
          
          chrome.storage.local.set({ currentSession: session });
        });
      });
    }
  });
});

// Initialize session with comprehensive tracking
function initializeSession() {
  return {
    startTime: Date.now(),
    tabSwitches: 0,
    focusBreaks: 0,
    distractions: 0,
    activeTime: 0,
    totalTime: 0,
    currentFocusStreak: 0,
    maxFocusStreak: 0,
    deepWorkSessions: 0,
    category: 'general',
    task: 'unspecified',
    aiRelevanceData: [],
    recentFocusScores: []
  };
}

// Update behavioral metrics with detailed tracking
function updateBehavioralMetrics(action, context) {
  chrome.storage.local.get(['currentSession', 'behaviorPatterns'], function(result) {
    var session = result.currentSession || initializeSession();
    var patterns = result.behaviorPatterns || {};
    
    var now = Date.now();
    var currentHour = new Date().getHours();
    
    // Track different types of behavioral events
    switch (action) {
      case 'tabSwitch':
        // Calculate time since last switch
        var timeSinceLastSwitch = session.lastTabSwitch ? (now - session.lastTabSwitch) : 0;
        
        // Detect rapid switching (potential distraction)
        if (timeSinceLastSwitch < 5000) { // Less than 5 seconds
          session.rapidSwitches = (session.rapidSwitches || 0) + 1;
        }
        
        // Track focus periods (time between switches)
        if (timeSinceLastSwitch > 300000) { // More than 5 minutes
          session.deepWorkSessions = (session.deepWorkSessions || 0) + 1;
          session.maxFocusStreak = Math.max(session.maxFocusStreak || 0, timeSinceLastSwitch);
        }
        
        break;
        
      case 'focusBreak':
        session.focusBreaks = (session.focusBreaks || 0) + 1;
        session.lastBreakTime = now;
        break;
        
      case 'windowFocus':
        session.activeTime = (session.activeTime || 0) + (now - (session.lastActiveTime || now));
        session.lastActiveTime = now;
        break;
    }
    
    // Update hourly patterns
    if (!patterns[currentHour]) {
      patterns[currentHour] = { switches: 0, focusTime: 0, distractions: 0 };
    }
    
    if (action === 'tabSwitch') {
      patterns[currentHour].switches++;
    }
    
    // Calculate session metrics
    session.totalTime = now - (session.startTime || now);
    session.activeTimeRatio = session.totalTime > 0 ? (session.activeTime || 0) / session.totalTime : 0;
    
    // Store updated data
    chrome.storage.local.set({ 
      currentSession: session,
      behaviorPatterns: patterns
    });
  });
}

// Track window focus/blur for engagement metrics
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    updateBehavioralMetrics('windowBlur');
  } else {
    // Window gained focus
    updateBehavioralMetrics('windowFocus');
  }
});

// Track idle state for break detection
chrome.idle.onStateChanged.addListener(function(state) {
  if (state === 'idle') {
    updateBehavioralMetrics('focusBreak');
  } else if (state === 'active') {
    updateBehavioralMetrics('windowFocus');
  }
});