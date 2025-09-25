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