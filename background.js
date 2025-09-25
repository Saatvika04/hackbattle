//===== AI RELEVANCE ENGINE =====

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

// Sample focus relevance every minute while a task is active
chrome.alarms.create('sampleRelevance', { periodInMinutes: 1 });

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

// ===== BLACKLIST BLOCKING VIA DECLARATIVE NET REQUEST =====

// Generate a stable numeric ID for each rule from a domain string
function domainRuleId(domain) {
  var h = 0;
  for (var i = 0; i < domain.length; i++) {
    h = ((h << 5) - h) + domain.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2000000000 + 1000;
}

function toHostnamePattern(domain) {
  try {
    var u = new URL(domain.startsWith('http') ? domain : ('https://' + domain));
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function buildBlockRules(domains) {
  var rules = [];
  for (var i = 0; i < domains.length; i++) {
    var host = toHostnamePattern(domains[i]);
    if (!host) continue;
    var id = domainRuleId(host);
    // Build a regex to match http(s) main-frame navigations to host or any subdomain
    var escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = '^https?:\/\/([a-z0-9-]+\\.)?' + escaped + '\/';
    rules.push({
      id: id,
      priority: 1,
      action: { type: 'block' },
      condition: {
        regexFilter: regex,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame']
      }
    });
  }
  return rules;
}

function updateBlocking(active, blacklist) {
  var domains = Array.isArray(blacklist) ? blacklist : [];
  var rulesToAdd = active ? buildBlockRules(domains) : [];
  var removeIds = [];

  for (var i = 0; i < domains.length; i++) {
    var host = toHostnamePattern(domains[i]);
    if (!host) continue;
    removeIds.push(domainRuleId(host));
  }

  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rulesToAdd,
    removeRuleIds: removeIds
  }, function() {
    if (chrome.runtime.lastError) {
      console.log('DNR update error:', chrome.runtime.lastError.message);
    }
  });
}

function applyBlockingFromState() {
  chrome.storage.local.get(['isTaskActive', 'lockedInBlacklist'], function(res) {
    var active = !!res.isTaskActive;
    var bl = res.lockedInBlacklist || [];
    updateBlocking(active, bl);
  });
}

chrome.storage.onChanged.addListener(function(changes, area) {
  if (area !== 'local') return;
  chrome.storage.local.get(['isTaskActive', 'lockedInBlacklist', 'taskStartTime', 'taskDuration'], function(res) {
    var active = !!res.isTaskActive;
    var bl = res.lockedInBlacklist || [];
    updateBlocking(active, bl);

    // Manage task end alarm
    if (active && res.taskStartTime && res.taskDuration) {
      var endWhen = res.taskStartTime + res.taskDuration * 60 * 1000;
      var delayMs = Math.max(0, endWhen - Date.now());
      // Create/replace a one-off alarm for task end
      chrome.alarms.create('taskEnd', { when: Date.now() + delayMs });
    } else {
      // Clear task end alarm when task is not active
      chrome.alarms.clear('taskEnd');
    }
  });
});

chrome.runtime.onInstalled.addListener(applyBlockingFromState);
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(applyBlockingFromState);
}

// Ensure timing persists even if popup is closed
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm && alarm.name === 'taskEnd') {
    chrome.storage.local.get(['isTaskActive'], function(res) {
      if (res.isTaskActive) {
        chrome.storage.local.set({ isTaskActive: false });
      }
    });
  } else if (alarm && alarm.name === 'clearRelevanceCache') {
    clearRelevanceCache();
  } else if (alarm && alarm.name === 'sampleRelevance') {
    sampleActiveTabRelevance();
  }
});

// On startup, re-schedule task end if needed
function rescheduleTaskEndIfNeeded() {
  chrome.storage.local.get(['isTaskActive', 'taskStartTime', 'taskDuration'], function(res) {
    if (res.isTaskActive && res.taskStartTime && res.taskDuration) {
      var endWhen = res.taskStartTime + res.taskDuration * 60 * 1000;
      if (Date.now() >= endWhen) {
        chrome.storage.local.set({ isTaskActive: false });
      } else {
        chrome.alarms.create('taskEnd', { when: endWhen });
      }
    } else {
      chrome.alarms.clear('taskEnd');
    }
  });
}

rescheduleTaskEndIfNeeded();

// ===== Search query extraction and relevance sampling =====
function parseSearchQuery(urlString) {
  try {
    var url = new URL(urlString);
    var host = url.hostname.replace('www.', '');
    var params = url.searchParams;
    var q = '';
    if (host.includes('google.')) q = params.get('q') || '';
    else if (host.includes('bing.com')) q = params.get('q') || '';
    else if (host.includes('duckduckgo.com')) q = params.get('q') || '';
    else if (host.includes('search.brave.com')) q = params.get('q') || '';
    return q;
  } catch (e) { return ''; }
}

function logSearchIfAny(tab) {
  var query = parseSearchQuery(tab.url || '');
  if (!query) return;
  var todayKey = new Date().toDateString();
  chrome.storage.local.get([todayKey], function(res) {
    var day = res[todayKey] || {};
    var searches = day.searches || [];
    searches.push({ t: Date.now(), q: query, url: tab.url });
    day.searches = searches;
    chrome.storage.local.set({ [todayKey]: day });
  });
}

var lastSearchNotifyAt = 0;
function maybeNotifySearchDistraction(query, callbackDone) {
  chrome.storage.local.get(['currentSessionCategory', 'isTaskActive'], function(res) {
    if (!res.isTaskActive) { if (callbackDone) callbackDone(); return; }
    var sessionCategory = res.currentSessionCategory || 'work';
    // Quick keyword-based relevance check for the query text
    var relevance = checkRelevanceWithKeywords(query, query, sessionCategory);
    if (!relevance.isRelevant) {
      var now = Date.now();
      if (now - lastSearchNotifyAt > 30000) { // throttle 30s
        lastSearchNotifyAt = now;
        try {
          chrome.notifications.create('lockedin-search-alert-' + now, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Stay focused?',
            message: 'This search may be off-task: "' + (query.length > 80 ? (query.slice(0,77) + '...') : query) + '"',
            priority: 1
          });
        } catch (e) {}
      }
    }
    if (callbackDone) callbackDone();
  });
}

function sampleActiveTabRelevance() {
  chrome.storage.local.get(['isTaskActive'], function(s) {
    if (!s.isTaskActive) return;
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
      var tab = tabs && tabs[0];
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;
      // Log search queries
      logSearchIfAny(tab);
      var q = parseSearchQuery(tab.url || '');
      if (q) maybeNotifySearchDistraction(q);
      // Classify relevance
      checkRelevanceWithAI(tab.url, tab.title || '', tab, function(relevanceResult) {
        var todayKey = new Date().toDateString();
        chrome.storage.local.get([todayKey], function(res) {
          var day = res[todayKey] || { relevantTime: 0, distractedTime: 0 };
          // +1 minute bucketed
          if (relevanceResult.isRelevant) day.relevantTime = (day.relevantTime || 0) + 1;
          else day.distractedTime = (day.distractedTime || 0) + 1;
          chrome.storage.local.set({ [todayKey]: day });
        });
      });
    });
  });
}

// Also sample on committed navigation while task active
chrome.webNavigation.onCommitted.addListener(function(details) {
  chrome.storage.local.get(['isTaskActive'], function(s) {
    if (!s.isTaskActive) return;
    if (details.transitionType === 'link' || details.transitionType === 'typed' || details.transitionType === 'reload') {
      chrome.tabs.get(details.tabId, function(tab) {
        if (tab && tab.url) {
          logSearchIfAny(tab);
          var q = parseSearchQuery(tab.url || '');
          if (q) maybeNotifySearchDistraction(q);
          sampleActiveTabRelevance();
        }
      });
    }
  });
});