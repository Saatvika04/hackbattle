// Popup script for FocusTracker
let timeChart = null;
let weeklyChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  setupEventListeners();
});

async function loadDashboardData() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {
      focusScore: null,
      totalTime: 0,
      timeByCategory: {}
    };

    await updateFocusScore(todayData.focusScore);
    updateTimeStats(todayData);
    createTimeChart(todayData.timeByCategory);
    
    await loadWeeklyData();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

async function updateFocusScore(score) {
  const scoreElement = document.getElementById('focusScore');
  const messageElement = document.getElementById('focusMessage');
  const scoreCircle = document.querySelector('.score-circle');
  
  if (!scoreElement || !messageElement || !scoreCircle) {
    console.error('Missing required DOM elements for focus score display');
    return;
  }
  
  // Handle NULL/undefined scores - no fake data!
  if (score === null || score === undefined) {
    scoreElement.textContent = '--';
    messageElement.innerHTML = '📊 No tracking data yet. Start browsing to see your focus score!';
    scoreCircle.style.background = 'rgba(200, 200, 200, 0.2)';
    scoreCircle.style.setProperty('--score-angle', '0deg');
    return;
  }
  
  // Only show real scores
  scoreElement.textContent = score + '%';
  
  // Update progress circle with real score
  const angle = (score / 100) * 360;
  scoreCircle.style.setProperty('--score-angle', `${angle}deg`);
  
  // Get enhanced scoring details for better messaging
  try {
    const sessionData = await chrome.storage.local.get(['currentSession']);
    const session = sessionData.currentSession || {};
    
    // Calculate additional context from real data
    const llmEnhanced = session.aiRelevanceData && session.aiRelevanceData.length > 0;
    const avgRelevance = calculateAverageRelevance(session.aiRelevanceData || []);
    const behaviorScore = calculateBehaviorScore(session);
    
    // Update message based on REAL score and LLM insights
    let message = '';
    
    if (score >= 90) {
      message = llmEnhanced ? 
        `🎯 Excellent focus! AI analysis: ${avgRelevance}% relevance 🤖` : 
        '🎯 Excellent focus today! 🎉';
      scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(34, 197, 94, 0.3) 0deg, rgba(34, 197, 94, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
    } else if (score >= 70) {
      message = llmEnhanced ? 
        `💪 Good focus! AI relevance: ${avgRelevance}%, behavior: ${behaviorScore}/10` : 
        '💪 Good focus, keep it up!';
      scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(59, 130, 246, 0.3) 0deg, rgba(59, 130, 246, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
    } else if (score >= 50) {
      message = llmEnhanced ? 
        `📈 Mixed focus (70% LLM + 30% traditional). Tab switches: ${session.tabSwitches || 0}` : 
        '📈 Room for improvement';
      scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(245, 158, 11, 0.3) 0deg, rgba(245, 158, 11, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
    } else {
      message = llmEnhanced ? 
        `🔍 Focus needs attention! AI detected ${session.distractions || 0} distractions` : 
        '🔍 Try to minimize distractions';
      scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(239, 68, 68, 0.3) 0deg, rgba(239, 68, 68, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
    }
    
    messageElement.innerHTML = message;
    
  } catch (error) {
    console.error('Error getting enhanced focus details:', error);
    // Fallback to simple message with real score
    let message = '';
    if (score >= 90) {
      message = '🎯 Excellent focus today!';
    } else if (score >= 70) {
      message = '💪 Good focus, keep it up!';
    } else if (score >= 50) {
      message = '📈 Room for improvement';
    } else {
      message = '🔍 Try to minimize distractions';
    }
    messageElement.innerHTML = message;
  }
}

// Helper functions for enhanced scoring display
function calculateAverageRelevance(relevanceData) {
  if (!relevanceData || relevanceData.length === 0) return 50;
  var sum = 0;
  for (var i = 0; i < relevanceData.length; i++) {
    var confidence = relevanceData[i].relevance ? relevanceData[i].relevance.confidence : 50;
    sum += confidence;
  }
  return Math.round(sum / relevanceData.length);
}

function calculateBehaviorScore(session) {
  var score = 10;
  
  // Penalize excessive tab switching
  var switches = session.tabSwitches || 0;
  if (switches > 20) score -= 3;
  else if (switches > 10) score -= 1;
  
  // Penalize distractions
  var distractions = session.distractions || 0;
  score -= Math.min(distractions, 4);
  
  // Bonus for deep work sessions
  var deepWork = session.deepWorkSessions || 0;
  score += Math.min(deepWork, 3);
  
  return Math.max(1, Math.min(10, score));
}

// --- Replace the entire old function with this new one ---

function updateTimeStats(todayData) {
  const totalTimeElement = document.getElementById('totalTime');
  const productiveTimeElement = document.getElementById('productiveTime');

  if (!totalTimeElement || !productiveTimeElement) {
    console.error('Missing required DOM elements for time stats display');
    return;
  }

  // Handle NULL data - show 0 time
  if (!todayData || !todayData.totalTime || todayData.totalTime === 0) {
    totalTimeElement.textContent = '0m';
    productiveTimeElement.textContent = '0m';
    return;
  }

  const totalMinutes = Math.round(todayData.totalTime / 1000 / 60);
  totalTimeElement.textContent = formatTime(totalMinutes);

  // Define the single source of truth for productive categories
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  
  let productiveMinutes = 0;

  // Calculate productive time only if we have category data
  if (todayData.timeByCategory) {
    Object.entries(todayData.timeByCategory).forEach(([category, time]) => {
      if (productiveCategories.includes(category)) {
        productiveMinutes += Math.round(time / 1000 / 60);
      }
    });
  }

  productiveTimeElement.textContent = formatTime(productiveMinutes);
}

function createTimeChart(timeByCategory) {
  const timeChartElement = document.getElementById('timeChart');
  const ctx = timeChartElement ? timeChartElement.getContext('2d') : null;
  const noDataElement = document.getElementById('noDataMessage');
  
  if (!ctx) {
    console.error('Chart canvas element not found');
    return;
  }
  
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library not loaded');
    return;
  }
  
  const hasData = Object.keys(timeByCategory).length > 0;
  
  if (!hasData) {
    noDataElement.classList.remove('hidden');
    return;
  }
  
  noDataElement.classList.add('hidden');
  
  const data = Object.entries(timeByCategory).map(([category, time]) => ({
    category,
    time: Math.round(time / 1000 / 60)
  })).filter(item => item.time > 0);
  
  const colors = {
    'Development': '#10B981',
    'Learning': '#3B82F6',
    'Research': '#8B5CF6',
    'Communication': '#06B6D4',
    'Entertainment': '#EF4444',
    'Social Media': '#F59E0B',
    'News': '#EC4899',
    'Other': '#6B7280'
  };
  
  if (timeChart) {
    timeChart.destroy();
  }
  
  timeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(item => item.category),
      datasets: [{
        data: data.map(item => item.time),
        backgroundColor: data.map(item => colors[item.category] || '#6B7280'),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatTime(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

async function loadWeeklyData() {
  try {
    const weekData = await getWeekData();
    updateWeeklyStats(weekData);
    createWeeklyChart(weekData);
  } catch (error) {
    console.error('Error loading weekly data:', error);
  }
}

async function getWeekData() {
  const weekData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    
    const result = await chrome.storage.local.get([dateString]);
    // Only include real data, NULL for no tracking
    const dayData = result[dateString];
    weekData.push({
      date: dateString,
      data: dayData && dayData.totalTime > 0 ? dayData : null
    });
  }
  
  return weekData;
}

function updateWeeklyStats(weekData) {
  const weekFocusElement = document.getElementById('weekFocusScore');
  const weekTotalTimeElement = document.getElementById('weekTotalTime');
  
  const avgFocus = Math.round(
    weekData.reduce((sum, day) => sum + day.data.focusScore, 0) / weekData.length
  );
  
  const totalMinutes = weekData.reduce((sum, day) => 
    sum + Math.round(day.data.totalTime / 1000 / 60), 0
  );
  
  weekFocusElement.textContent = `${avgFocus}%`;
  weekTotalTimeElement.textContent = `${Math.round(totalMinutes / 60)}h`;
  
  // Generate and display insights
  generateDailyInsights(weekData, avgFocus, totalMinutes);
}

function createWeeklyChart(weekData) {
  const weeklyChartElement = document.getElementById('weeklyChart');
  const ctx = weeklyChartElement ? weeklyChartElement.getContext('2d') : null;
  
  if (!ctx) {
    console.error('Weekly chart canvas element not found');
    return;
  }
  
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library not loaded');
    return;
  }
  
  if (weeklyChart) {
    weeklyChart.destroy();
  }
  
  const labels = weekData.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });
  
  const focusScores = weekData.map(day => day.data.focusScore);
  
  weeklyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Score',
        data: focusScores,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

function setupEventListeners() {
  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      try {
        chrome.runtime.openOptionsPage();
      } catch (error) {
        console.error('Error opening options page:', error);
        // Fallback: open in new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
    });
  }
  
  // View report button
  const viewReportBtn = document.getElementById('viewReportBtn');
  if (viewReportBtn) {
    viewReportBtn.addEventListener('click', async () => {
      try {
        showMessage('Generating comprehensive weekly report...', 'info');
        await generateWeeklyReport();
        showMessage('Weekly report PDF generated successfully!', 'success');
      } catch (error) {
        console.error('Error generating weekly report:', error);
        showMessage('Failed to generate weekly report', 'error');
      }
    });
  }
  
  // Export data button
  const exportDataBtn = document.getElementById('exportDataBtn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      try {
        await exportUserData();
      } catch (error) {
        console.error('Error exporting data:', error);
      }
    });
  }
}

async function generateWeeklyReport() {
  // Generate comprehensive PDF report with AI analysis
  const reportData = await generateComprehensiveReportData();
  
  if (reportData.weekData.length === 0) {
    throw new Error('No data available for the past week');
  }
  
  const pdfContent = await generatePDFContent(reportData);  
  downloadPDFReport(pdfContent, reportData);
}

async function generateComprehensiveReportData() {
  const weekData = await getWeekData();
  const currentSession = await chrome.storage.local.get(['currentSession']);
  const settings = await chrome.storage.sync.get(['geminiApiKey', 'enableAI']);
  
  // Filter to only days with real data (NULL filtering)
  const realDataDays = weekData.filter(day => day.data !== null && day.data.totalTime > 0);
  
  if (realDataDays.length === 0) {
    return {
      weekData: [],
      totalTime: 0,
      avgFocusScore: null,
      dailyScores: [],
      sortedCategories: [],
      categoryByDay: {},
      performanceMetrics: {
        bestDay: null,
        worstDay: null,
        focusConsistency: 0,
        focusDrops: 0,
        improvementDays: 0
      },
      behavioralData: {
        tabSwitches: 0,
        distractions: 0,
        deepWorkSessions: 0,
        activeTimeRatio: 0
      },
      hasAI: !!(settings.geminiApiKey && settings.enableAI),
      hasRealData: false,
      daysWithData: 0,
      generatedAt: new Date()
    };
  }
  
  // Calculate metrics only from real data
  const totalTime = realDataDays.reduce((sum, day) => sum + day.data.totalTime, 0);
  const realScores = realDataDays.map(day => day.data.focusScore).filter(score => score !== null && score !== undefined);
  const avgFocusScore = realScores.length > 0 ? Math.round(realScores.reduce((sum, score) => sum + score, 0) / realScores.length) : null;
  
  // Create daily scores with NULL for no-data days
  const dailyScores = weekData.map(day => ({
    date: day.date,
    score: day.data ? day.data.focusScore : null,
    time: day.data ? Math.round(day.data.totalTime / 1000 / 60) : 0
  }));
  
  // Category analysis only from real data
  const categoryTotals = {};
  const categoryByDay = {};
  
  weekData.forEach(day => {
    const dateKey = day.date;
    if (day.data && day.data.timeByCategory) {
      categoryByDay[dateKey] = {};
      Object.entries(day.data.timeByCategory).forEach(([category, time]) => {
        categoryTotals[category] = (categoryTotals[category] || 0) + time;
        categoryByDay[dateKey][category] = Math.round(time / 1000 / 60);
      });
    } else {
      categoryByDay[dateKey] = {};
    }
  });
  
  // Sort categories by time spent (only if we have data)
  const sortedCategories = Object.keys(categoryTotals).length > 0 
    ? Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .map(([category, time]) => ({
          category,
          time: Math.round(time / 1000 / 60),
          percentage: totalTime > 0 ? Math.round((time / totalTime) * 100) : 0
        }))
    : [];
  
  // Performance analysis only from real scores
  let bestDay = null, worstDay = null, focusConsistency = 0;
  if (realScores.length > 0) {
    const scoresWithDates = realDataDays.map(day => ({
      date: day.date,
      score: day.data.focusScore,
      time: Math.round(day.data.totalTime / 1000 / 60)
    }));
    
    bestDay = scoresWithDates.reduce((best, day) => day.score > best.score ? day : best);
    worstDay = scoresWithDates.reduce((worst, day) => day.score < worst.score ? day : worst);
    focusConsistency = bestDay.score - worstDay.score;
  }
  
  // Trend analysis only from consecutive real data
  const realDailyScores = dailyScores.filter(day => day.score !== null);
  const focusDrops = realDailyScores.filter((day, i) => 
    i > 0 && day.score < realDailyScores[i-1].score - 10
  ).length;
  
  const improvementDays = realDailyScores.filter((day, i) => 
    i > 0 && day.score > realDailyScores[i-1].score + 5
  ).length;
  
  // Behavioral insights
  const session = currentSession.currentSession || {};
  const behavioralData = {
    tabSwitches: session.tabSwitches || 0,
    distractions: session.distractions || 0,
    deepWorkSessions: session.deepWorkSessions || 0,
    activeTimeRatio: session.activeTimeRatio || 0
  };
  
  return {
    weekData,
    totalTime: Math.round(totalTime / 1000 / 60),
    avgFocusScore,
    dailyScores,
    sortedCategories,
    categoryByDay,
    performanceMetrics: {
      bestDay,
      worstDay,
      focusConsistency,
      focusDrops,
      improvementDays
    },
    behavioralData,
    hasAI: !!(settings.geminiApiKey && settings.enableAI),
    hasRealData: realDataDays.length > 0,
    daysWithData: realDataDays.length,
    hasSufficientData: realDataDays.length >= 3,
    generatedAt: new Date()
  };
}

async function generatePDFContent(reportData) {
  // Handle no data case
  if (!reportData.hasRealData) {
    return {
      title: 'FocusTracker Weekly Report',
      reportPeriod: 'No tracking data available',
      generatedAt: reportData.generatedAt.toLocaleString(),
      noDataReport: true,
      message: 'No focus tracking data was recorded this week. Start using FocusTracker to get meaningful insights!'
    };
  }
  
  // Handle limited data case - still provide real insights
  if (!reportData.hasSufficientData && reportData.hasRealData) {
    // Generate limited AI analysis if available
    let limitedAiAnalysis = null;
    if (reportData.hasAI) {
      limitedAiAnalysis = await generateAIWeeklyAnalysis(reportData);
    }
    
    return {
      title: 'FocusTracker Weekly Report',
      reportPeriod: formatReportPeriod(reportData.weekData),
      generatedAt: reportData.generatedAt.toLocaleString(),
      limitedDataReport: true,
      daysWithData: reportData.daysWithData,
      
      // Include all available real data analysis
      executiveSummary: {
        avgFocusScore: reportData.avgFocusScore,
        totalHours: Math.round(reportData.totalTime / 60 * 10) / 10,
        topCategory: reportData.sortedCategories[0]?.category || 'None',
        weeklyTrend: calculateWeeklyTrend(reportData.dailyScores),
        dataQuality: `${reportData.daysWithData}/7 days tracked`
      },
      
      dailyPerformance: reportData.dailyScores,
      categoryAnalysis: reportData.sortedCategories,
      categoryByDay: reportData.categoryByDay,
      
      // Real insights from available data
      performanceInsights: {
        strengths: identifyStrengths(reportData),
        weaknesses: identifyWeaknesses(reportData),
        patterns: identifyPatterns(reportData)
      },
      
      behavioralAnalysis: analyzeBehavioralPatterns(reportData),
      aiActionPlan: limitedAiAnalysis,
      
      message: `Analysis based on ${reportData.daysWithData} day${reportData.daysWithData > 1 ? 's' : ''} of real tracking data. Continue using FocusTracker for more comprehensive insights.`
    };
  }
  
  // Generate AI analysis if available and we have sufficient data
  let aiAnalysis = null;
  if (reportData.hasAI && reportData.hasSufficientData) {
    aiAnalysis = await generateAIWeeklyAnalysis(reportData);
  }
  
  // Create comprehensive PDF content (only for sufficient data)
  const pdfContent = {
    title: 'FocusTracker Weekly Productivity Report',
    reportPeriod: formatReportPeriod(reportData.weekData),
    generatedAt: reportData.generatedAt.toLocaleString(),
    
    // Executive Summary
    executiveSummary: {
      avgFocusScore: reportData.avgFocusScore,
      totalHours: Math.round(reportData.totalTime / 60 * 10) / 10,
      topCategory: reportData.sortedCategories[0]?.category || 'None',
      weeklyTrend: calculateWeeklyTrend(reportData.dailyScores)
    },
    
    // Daily Performance
    dailyPerformance: reportData.dailyScores,
    
    // Category Analysis
    categoryAnalysis: reportData.sortedCategories,
    categoryByDay: reportData.categoryByDay,
    
    // Performance Insights
    performanceInsights: {
      strengths: identifyStrengths(reportData),
      weaknesses: identifyWeaknesses(reportData),
      patterns: identifyPatterns(reportData)
    },
    
    // Behavioral Analysis
    behavioralAnalysis: analyzeBehavioralPatterns(reportData),
    
    // AI-Generated Action Plan
    aiActionPlan: aiAnalysis
  };
  
  return pdfContent;
}

async function generateAIWeeklyAnalysis(reportData) {
  try {
    const settings = await chrome.storage.sync.get(['geminiApiKey']);
    if (!settings.geminiApiKey) return null;
    
    // Prepare AI prompt adapted for available data
    const focusScores = reportData.dailyScores.map(d => d.score === null ? 'NULL' : d.score);
    const categoryData = reportData.sortedCategories.slice(0, 5);
    const daysTracked = reportData.daysWithData || 0;
    const dataQuality = daysTracked < 3 ? 'LIMITED DATA' : 'SUFFICIENT DATA';
    
    const prompt = `${dataQuality} PRODUCTIVITY ANALYSIS

DATA OVERVIEW:
- Days Tracked: ${daysTracked}/7 days with real activity
- Focus Scores: [${focusScores.join(', ')}] (NULL = no tracking data)
- Average Focus: ${reportData.avgFocusScore || 'N/A'}%
- Total Time Tracked: ${reportData.totalTime} minutes (${Math.round(reportData.totalTime/60)} hours)
${reportData.performanceMetrics.bestDay ? `- Best Day: ${reportData.performanceMetrics.bestDay.score}%` : '- Best Day: Not enough data'}
${reportData.performanceMetrics.worstDay ? `- Worst Day: ${reportData.performanceMetrics.worstDay.score}%` : '- Worst Day: Not enough data'}
- Focus Consistency: ${reportData.performanceMetrics.focusConsistency || 0} point variation
- Focus Drops: ${reportData.performanceMetrics.focusDrops} significant drops
- Improvement Days: ${reportData.performanceMetrics.improvementDays} days

TIME ALLOCATION ANALYSIS:
${categoryData.length > 0 ? categoryData.map(cat => `- ${cat.category}: ${cat.time} minutes (${cat.percentage}%)`).join('\n') : '- No category data available yet'}

BEHAVIORAL PATTERNS:
- Tab Switches: ${reportData.behavioralData.tabSwitches}
- Distractions: ${reportData.behavioralData.distractions}
- Deep Work Sessions: ${reportData.behavioralData.deepWorkSessions}
- Active Engagement: ${Math.round(reportData.behavioralData.activeTimeRatio * 100)}%

ANALYSIS REQUIREMENTS:
${daysTracked < 3 ? 
'Provide analysis based on LIMITED DATA. Be honest about data limitations but still give actionable insights:' : 
'Provide comprehensive weekly productivity analysis with:'}

1. EXECUTIVE SUMMARY (2-3 sentences):
   - Overall performance assessment based on available data
   ${daysTracked < 3 ? '- Acknowledge limited data but highlight key observations' : '- Key trends identified'}
   - Primary focus areas for improvement

2. STRENGTHS IDENTIFIED (2-3 bullet points):
   - What the user is doing well based on available data
   - Positive patterns observed
   ${daysTracked < 3 ? '- Early indicators of good habits' : '- Areas of consistent performance'}

3. AREAS FOR IMPROVEMENT (2-3 bullet points):
   - Specific weaknesses to address
   - Behavioral patterns to modify
   - Focus areas that need attention

4. STRATEGIC RECOMMENDATIONS (3-4 actionable items):
   - Specific productivity strategies based on observed patterns
   - Behavioral modifications
   ${daysTracked < 3 ? '- Tracking recommendations to get better insights' : '- Advanced optimization techniques'}
   - Goal-setting recommendations

5. NEXT WEEK FOCUS AREAS (2-3 priorities):
   - Top areas to concentrate on
   ${daysTracked < 3 ? '- Consistency in tracking usage' : '- Specific measurable goals'}
   - Success metrics to track

${daysTracked < 3 ? 
'IMPORTANT: Be transparent about data limitations but provide valuable guidance based on what is available. Encourage continued tracking.' : 
'Format your response with clear sections and actionable insights based on the comprehensive data provided.'}

1. EXECUTIVE SUMMARY (2-3 sentences):
   - Overall performance assessment
   - Key trends identified
   - Primary focus areas

2. STRENGTHS IDENTIFIED (3-4 bullet points):
   - What the user is doing well
   - Positive patterns observed
   - Areas of consistent performance

3. AREAS FOR IMPROVEMENT (3-4 bullet points):
   - Specific weaknesses to address
   - Behavioral patterns to modify
   - Focus areas that need attention

4. STRATEGIC RECOMMENDATIONS (5-6 actionable items):
   - Specific time management strategies
   - Focus improvement techniques
   - Behavioral modifications
   - Goal-setting recommendations
   - Weekly planning suggestions

5. NEXT WEEK FOCUS AREAS (2-3 priorities):
   - Top 3 areas to concentrate on
   - Specific measurable goals
   - Success metrics to track

Format your response with clear sections and actionable insights based on the data provided.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + settings.geminiApiKey, {
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
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 20
        }
      })
    });

    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0] && 
        data.candidates[0].content && data.candidates[0].content.parts && 
        data.candidates[0].content.parts[0]) {
      
      return parseAIAnalysis(data.candidates[0].content.parts[0].text);
    }
    
    return null;
  } catch (error) {
    console.error('AI weekly analysis failed:', error);
    return null;
  }
}

function parseAIAnalysis(aiResponse) {
  // Parse the AI response into structured sections
  const sections = {
    executiveSummary: '',
    strengths: [],
    improvements: [],
    recommendations: [],
    nextWeekFocus: []
  };
  
  const lines = aiResponse.split('\n').filter(line => line.trim());
  let currentSection = null;
  
  for (let line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('executive summary')) {
      currentSection = 'executiveSummary';
      continue;
    } else if (lowerLine.includes('strengths')) {
      currentSection = 'strengths';
      continue;
    } else if (lowerLine.includes('improvement') || lowerLine.includes('areas for')) {
      currentSection = 'improvements';
      continue;
    } else if (lowerLine.includes('recommendation') || lowerLine.includes('strategic')) {
      currentSection = 'recommendations';
      continue;
    } else if (lowerLine.includes('next week') || lowerLine.includes('focus areas')) {
      currentSection = 'nextWeekFocus';
      continue;
    }
    
    if (currentSection && line.trim()) {
      if (currentSection === 'executiveSummary') {
        sections[currentSection] += line.trim() + ' ';
      } else {
        // Remove bullet points and clean up
        const cleanLine = line.replace(/^[-•*\d.]\s*/, '').trim();
        if (cleanLine) {
          sections[currentSection].push(cleanLine);
        }
      }
    }
  }
  
  return sections;
}

function downloadPDFReport(pdfContent, reportData) {
  // Create HTML content for PDF generation
  const htmlContent = generateReportHTML(pdfContent, reportData);
  
  // Create a new window for PDF generation
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      // Window will close automatically after print dialog
    }, 1000);
  };
}

function generateReportHTML(pdfContent, reportData) {
  // Handle no data case
  if (pdfContent.noDataReport) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FocusTracker Weekly Report</title>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 1in; }
        body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
            margin: 0; padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .report-container {
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid transparent;
            background: linear-gradient(90deg, #667eea, #764ba2) border-box;
            border-image: linear-gradient(90deg, #667eea, #764ba2) 1;
        }
        h1 { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 2.5rem;
            font-weight: 700;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .no-data { 
            background: linear-gradient(135deg, #f8faff 0%, #e8f2ff 100%);
            padding: 50px; 
            border-radius: 20px; 
            text-align: center;
            border: 2px solid #e0e8ff;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.1);
        }
        .no-data h2 {
            color: #4f46e5;
            font-size: 1.8rem;
            margin-bottom: 20px;
        }
        .instructions { 
            background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
            padding: 30px; 
            border-radius: 15px; 
            margin: 30px 0;
            border-left: 5px solid #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
        }
        .instructions h3 {
            color: #4f46e5;
            margin-top: 0;
        }
        ol { 
            text-align: left; 
            line-height: 1.8;
        }
        ol li {
            margin: 10px 0;
            padding: 5px 0;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #64748b;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>📊 ${pdfContent.title}</h1>
        </div>
        <div class="no-data">
            <h2>📈 No Data Tracked This Week</h2>
            <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 30px;">${pdfContent.message}</p>
            <div class="instructions">
                <h3>🚀 To start tracking:</h3>
                <ol>
                    <li>Keep the extension enabled while browsing</li>
                    <li>Browse normally for work, study, or personal tasks</li>
                    <li>Check back after 30+ minutes of activity</li>
                    <li>View your first real focus insights!</li>
                </ol>
            </div>
            <div class="footer">
                Generated: ${pdfContent.generatedAt}
            </div>
        </div>
    </div>
</body>
</html>`;
  }
  
  // Handle limited data case - full report with available data
  if (pdfContent.limitedDataReport) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FocusTracker Weekly Report</title>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 1in; }
        
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            min-height: 100vh;
        }
        
        .report-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(245, 158, 11, 0.3);
        }
        
        .report-header {
            text-align: center;
            padding-bottom: 30px;
            margin-bottom: 40px;
            border-bottom: 4px solid transparent;
            background: linear-gradient(90deg, #f59e0b, #f97316) border-box;
            border-image: linear-gradient(90deg, #f59e0b, #f97316) 1;
        }
        
        .report-title {
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .report-subtitle {
            font-size: 1.1rem;
            color: #64748b;
            margin: 15px 0 0 0;
            font-weight: 500;
        }
        
        .limited-notice {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            padding: 20px;
            border-radius: 15px;
            margin: 30px 0;
            border: 2px solid #f59e0b;
            border-left: 6px solid #f59e0b;
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.15);
        }
        
        .limited-notice strong {
            color: #92400e;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 15%, #f59e0b 100%);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.2);
            transform: translateY(0);
            transition: transform 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            display: block;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .metric-label {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.9);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-top: 8px;
        }
        
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
            background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            border-bottom: 3px solid #fbbf24;
            padding-bottom: 8px;
            margin-bottom: 25px;
        }
        
        .daily-scores {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        
        .day-score {
            text-align: center;
            padding: 20px 10px;
            border-radius: 12px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            box-shadow: 0 5px 15px rgba(245, 158, 11, 0.1);
        }
        
        .day-score.no-data {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border: 2px solid #cbd5e1;
            color: #64748b;
        }
        
        .day-name {
            font-size: 0.75rem;
            color: #92400e;
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .day-value {
            font-size: 1.5rem;
            font-weight: 800;
            color: #92400e;
        }
        
        .category-list {
            list-style: none;
            padding: 0;
        }
        
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            margin: 10px 0;
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-radius: 10px;
            border-left: 4px solid #f59e0b;
            box-shadow: 0 3px 10px rgba(245, 158, 11, 0.1);
        }
        
        .category-name {
            font-weight: 600;
            color: #92400e;
        }
        
        .category-stats {
            text-align: right;
            color: #a16207;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .insight-list {
            list-style: none;
            padding: 0;
        }
        
        .insight-item {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 18px 22px;
            margin: 12px 0;
            border-radius: 12px;
            border-left: 5px solid #f59e0b;
            box-shadow: 0 5px 15px rgba(245, 158, 11, 0.1);
            font-weight: 500;
        }
        
        .strength {
            border-left-color: #10b981;
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            color: #047857;
        }
        
        .weakness {
            border-left-color: #ef4444;
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #b91c1c;
        }
        
        .recommendation {
            border-left-color: #8b5cf6;
            background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
            color: #7c3aed;
        }
        
        .ai-section {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 20%, #3b82f6 100%);
            padding: 30px;
            border-radius: 20px;
            margin: 30px 0;
            border: 3px solid #3b82f6;
            box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3);
            color: white;
        }
        
        .ai-title {
            color: white;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .ai-title::before {
            content: "🤖 ";
        }
        
        .ai-section h3 {
            color: #dbeafe;
            margin-top: 25px;
        }
        
        .ai-section .insight-item {
            background: rgba(255, 255, 255, 0.9);
            color: #1e293b;
        }
    </style>
</head>
<body>
    <div class="report-container">
    <div class="report-header">
        <h1 class="report-title">📊 ${pdfContent.title}</h1>
        <p class="report-subtitle">${pdfContent.reportPeriod} • Generated: ${pdfContent.generatedAt}</p>
    </div>

    <div class="limited-notice">
        <strong>⚠️ Limited Data Report:</strong> ${pdfContent.message}
    </div>

    <div class="section">
        <h2 class="section-title">📊 Executive Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.avgFocusScore || '--'}${pdfContent.executiveSummary.avgFocusScore ? '%' : ''}</span>
                <span class="metric-label">Average Focus Score</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.totalHours}h</span>
                <span class="metric-label">Total Hours Tracked</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.topCategory}</span>
                <span class="metric-label">Top Category</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.dataQuality}</span>
                <span class="metric-label">Data Coverage</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">📈 Daily Performance</h2>
        <div class="daily-scores">
            ${pdfContent.dailyPerformance.map((day, index) => `
                <div class="day-score ${day.score === null ? 'no-data' : ''}">
                    <div class="day-name">${getDayName(index)}</div>
                    <div class="day-value">${day.score !== null ? day.score + '%' : '--'}</div>
                    <div style="font-size: 10px; color: #999;">${day.time}min</div>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">⏱️ Time Allocation Analysis</h2>
        <ul class="category-list">
            ${pdfContent.categoryAnalysis.slice(0, 8).map(cat => `
                <li class="category-item">
                    <span class="category-name">${cat.category}</span>
                    <span class="category-stats">
                        ${cat.time} min (${cat.percentage}%)
                    </span>
                </li>
            `).join('')}
        </ul>
        ${pdfContent.categoryAnalysis.length === 0 ? '<p>No category data available yet.</p>' : ''}
    </div>

    <div class="section">
        <h2 class="section-title">💪 Performance Insights</h2>
        
        <h3 style="color: #22c55e; margin-top: 25px;">Strengths</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.strengths.map(strength => `
                <li class="insight-item strength">${strength}</li>
            `).join('')}
        </ul>
        ${pdfContent.performanceInsights.strengths.length === 0 ? '<p>Continue tracking to identify strengths.</p>' : ''}

        <h3 style="color: #f59e0b; margin-top: 25px;">Areas for Improvement</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.weaknesses.map(weakness => `
                <li class="insight-item weakness">${weakness}</li>
            `).join('')}
        </ul>
        ${pdfContent.performanceInsights.weaknesses.length === 0 ? '<p>Continue tracking to identify improvement areas.</p>' : ''}

        <h3 style="color: #667eea; margin-top: 25px;">Behavioral Patterns</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.patterns.map(pattern => `
                <li class="insight-item">${pattern}</li>
            `).join('')}
        </ul>
        ${pdfContent.performanceInsights.patterns.length === 0 ? '<p>Continue tracking to identify patterns.</p>' : ''}
    </div>

    ${pdfContent.aiActionPlan ? `
    <div class="ai-section">
        <h2 class="ai-title">AI-Powered Analysis (Based on Available Data)</h2>
        
        <h3 style="color: #0f4c75;">Executive Summary</h3>
        <p style="font-style: italic; margin-bottom: 20px;">${pdfContent.aiActionPlan.executiveSummary}</p>
        
        <h3 style="color: #0f4c75;">Key Strengths</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.strengths.map(strength => `
                <li class="insight-item strength">${strength}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Priority Improvements</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.improvements.map(improvement => `
                <li class="insight-item weakness">${improvement}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Strategic Recommendations</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.recommendations.map(rec => `
                <li class="insight-item recommendation">${rec}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Next Week Focus Areas</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.nextWeekFocus.map(focus => `
                <li class="insight-item" style="border-left-color: #0891b2; background: #f0fdfa;">${focus}</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

        <div style="margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 2px solid #e2e8f0; padding-top: 20px; font-style: italic;">
            Generated by FocusTracker AI • ${pdfContent.generatedAt} • Continue tracking for more comprehensive insights
        </div>
    </div>
</body>
</html>`;
  }
  
  // Full report for sufficient data
  return `
<!DOCTYPE html>
<html>
<head>
    <title>FocusTracker Weekly Report</title>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 1in; }
        
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .report-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(102, 126, 234, 0.4);
        }
        
        .report-header {
            text-align: center;
            padding-bottom: 30px;
            margin-bottom: 40px;
            border-bottom: 4px solid transparent;
            background: linear-gradient(90deg, #667eea, #764ba2) border-box;
            border-image: linear-gradient(90deg, #667eea, #764ba2) 1;
        }
        
        .report-title {
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .report-subtitle {
            font-size: 1.1rem;
            color: #64748b;
            margin: 15px 0 0 0;
            font-weight: 500;
        }
        
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
            background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            border-bottom: 3px solid #a5b4fc;
            padding-bottom: 8px;
            margin-bottom: 25px;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #e0e7ff 0%, #8b5cf6 15%, #667eea 100%);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
            transform: translateY(0);
            transition: transform 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            display: block;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .metric-label {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.9);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-top: 8px;
        }
        
        .chart-placeholder {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            height: 250px;
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #64748b;
            margin: 25px 0;
            border: 3px dashed #cbd5e1;
            font-size: 1.1rem;
            font-weight: 600;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .daily-scores {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        
        .day-score {
            text-align: center;
            padding: 20px 10px;
            border-radius: 12px;
            background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
            border: 2px solid #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
        }
        
        .day-name {
            font-size: 0.75rem;
            color: #4338ca;
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .day-value {
            font-size: 1.5rem;
            font-weight: 800;
            color: #4338ca;
        }
        
        .category-list {
            list-style: none;
            padding: 0;
        }
        
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            margin: 10px 0;
            background: linear-gradient(135deg, #f8faff 0%, #e0e7ff 100%);
            border-radius: 10px;
            border-left: 4px solid #667eea;
            box-shadow: 0 3px 10px rgba(102, 126, 234, 0.1);
        }
        
        .category-name {
            font-weight: 600;
            color: #4338ca;
        }
        
        .category-stats {
            text-align: right;
            color: #6366f1;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .insight-list {
            list-style: none;
            padding: 0;
        }
        
        .insight-item {
            background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
            padding: 18px 22px;
            margin: 12px 0;
            border-radius: 12px;
            border-left: 5px solid #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
            font-weight: 500;
        }
        
        .strength {
            border-left-color: #10b981;
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            color: #047857;
        }
        
        .weakness {
            border-left-color: #ef4444;
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #b91c1c;
        }
        
        .recommendation {
            border-left-color: #8b5cf6;
            background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
            color: #7c3aed;
        }
        
        .ai-section {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 20%, #3b82f6 100%);
            padding: 30px;
            border-radius: 20px;
            margin: 30px 0;
            border: 3px solid #3b82f6;
            box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3);
            color: white;
        }
        
        .ai-title {
            color: white;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .ai-title::before {
            content: "🤖 ";
        }
        
        .ai-section h3 {
            color: #dbeafe;
            margin-top: 25px;
        }
        
        .ai-section .insight-item {
            background: rgba(255, 255, 255, 0.9);
            color: #1e293b;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body { background: white !important; }
            .report-container { 
                box-shadow: none !important; 
                border-radius: 0 !important;
            }
            .chart-placeholder {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
        <h1 class="report-title">🎯 ${pdfContent.title}</h1>
        <p class="report-subtitle">${pdfContent.reportPeriod} • Generated: ${pdfContent.generatedAt}</p>
    </div>

    <div class="section">
        <h2 class="section-title">📊 Executive Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.avgFocusScore}%</span>
                <span class="metric-label">Average Focus Score</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.totalHours}h</span>
                <span class="metric-label">Total Hours Tracked</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.topCategory}</span>
                <span class="metric-label">Top Category</span>
            </div>
            <div class="metric-card">
                <span class="metric-value">${pdfContent.executiveSummary.weeklyTrend}</span>
                <span class="metric-label">Weekly Trend</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">📈 Daily Performance</h2>
        <div class="daily-scores">
            ${pdfContent.dailyPerformance.map((day, index) => `
                <div class="day-score">
                    <div class="day-name">${getDayName(index)}</div>
                    <div class="day-value">${day.score}%</div>
                    <div style="font-size: 10px; color: #999;">${day.time}min</div>
                </div>
            `).join('')}
        </div>
        <div class="chart-placeholder">
            📊 Daily Focus Score Trend Chart
            <br><small>(Score range: ${Math.min(...pdfContent.dailyPerformance.map(d => d.score))}% - ${Math.max(...pdfContent.dailyPerformance.map(d => d.score))}%)</small>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">⏱️ Time Allocation Analysis</h2>
        <ul class="category-list">
            ${pdfContent.categoryAnalysis.slice(0, 8).map(cat => `
                <li class="category-item">
                    <span class="category-name">${cat.category}</span>
                    <span class="category-stats">
                        ${cat.time} min (${cat.percentage}%)
                    </span>
                </li>
            `).join('')}
        </ul>
        <div class="chart-placeholder">
            🍰 Category Distribution Pie Chart
            <br><small>(Top ${Math.min(pdfContent.categoryAnalysis.length, 8)} categories shown)</small>
        </div>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <h2 class="section-title">💪 Performance Insights</h2>
        
        <h3 style="color: #22c55e; margin-top: 25px;">Strengths</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.strengths.map(strength => `
                <li class="insight-item strength">${strength}</li>
            `).join('')}
        </ul>

        <h3 style="color: #f59e0b; margin-top: 25px;">Areas for Improvement</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.weaknesses.map(weakness => `
                <li class="insight-item weakness">${weakness}</li>
            `).join('')}
        </ul>

        <h3 style="color: #667eea; margin-top: 25px;">Behavioral Patterns</h3>
        <ul class="insight-list">
            ${pdfContent.performanceInsights.patterns.map(pattern => `
                <li class="insight-item">${pattern}</li>
            `).join('')}
        </ul>
    </div>

    ${pdfContent.aiActionPlan ? `
    <div class="ai-section">
        <h2 class="ai-title">AI-Powered Weekly Analysis & Action Plan</h2>
        
        <h3 style="color: #0f4c75;">Executive Summary</h3>
        <p style="font-style: italic; margin-bottom: 20px;">${pdfContent.aiActionPlan.executiveSummary}</p>
        
        <h3 style="color: #0f4c75;">Key Strengths</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.strengths.map(strength => `
                <li class="insight-item strength">${strength}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Priority Improvements</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.improvements.map(improvement => `
                <li class="insight-item weakness">${improvement}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Strategic Recommendations</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.recommendations.map(rec => `
                <li class="insight-item recommendation">${rec}</li>
            `).join('')}
        </ul>
        
        <h3 style="color: #0f4c75;">Next Week Focus Areas</h3>
        <ul class="insight-list">
            ${pdfContent.aiActionPlan.nextWeekFocus.map(focus => `
                <li class="insight-item" style="border-left-color: #0891b2; background: #f0fdfa;">${focus}</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

        <div style="margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 2px solid #e2e8f0; padding-top: 20px; font-style: italic;">
            Generated by FocusTracker AI • ${new Date().toLocaleString()} • For optimal productivity insights
        </div>
    </div>

    <script>
        // Print automatically after page loads
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`;
}

// Helper functions for report generation
function formatReportPeriod(weekData) {
  if (weekData.length === 0) return 'No data available';
  const startDate = new Date(weekData[0].date).toLocaleDateString();
  const endDate = new Date(weekData[weekData.length - 1].date).toLocaleDateString();
  return `${startDate} - ${endDate}`;
}

function calculateWeeklyTrend(dailyScores) {
  if (dailyScores.length < 2) return 'Insufficient data';
  
  const firstHalf = dailyScores.slice(0, Math.ceil(dailyScores.length / 2));
  const secondHalf = dailyScores.slice(Math.floor(dailyScores.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  
  if (diff > 5) return '📈 Improving';
  if (diff < -5) return '📉 Declining';
  return '➡️ Stable';
}

function identifyStrengths(reportData) {
  const strengths = [];
  const daysTracked = reportData.daysWithData || 0;
  const dataPrefix = daysTracked < 3 ? `Based on ${daysTracked} day${daysTracked > 1 ? 's' : ''} of tracking: ` : '';
  
  // Focus score analysis - be flexible with limited data
  if (reportData.avgFocusScore >= 80) {
    strengths.push(`${dataPrefix}Maintaining excellent focus scores (${reportData.avgFocusScore}% average)`);
  } else if (reportData.avgFocusScore >= 70) {
    strengths.push(`${dataPrefix}Good focus performance with ${reportData.avgFocusScore}% average score`);
  } else if (reportData.avgFocusScore >= 60 && daysTracked < 3) {
    strengths.push(`${dataPrefix}Decent focus baseline established (${reportData.avgFocusScore}% average)`);
  }
  
  // Consistency analysis - adapt for limited data
  if (daysTracked >= 2 && reportData.performanceMetrics.focusConsistency <= 20) {
    strengths.push(`${dataPrefix}Good consistency in performance with minimal score variations`);
  }
  
  // Deep work capability
  if (reportData.behavioralData.deepWorkSessions >= 1) {
    const sessionText = reportData.behavioralData.deepWorkSessions === 1 ? 'session' : 'sessions';
    strengths.push(`${dataPrefix}Demonstrated deep work capability with ${reportData.behavioralData.deepWorkSessions} extended focus ${sessionText}`);
  }
  
  // Engagement analysis
  if (reportData.behavioralData.activeTimeRatio >= 0.8) {
    strengths.push(`${dataPrefix}High engagement during tracked time (${Math.round(reportData.behavioralData.activeTimeRatio * 100)}% active)`);
  } else if (reportData.behavioralData.activeTimeRatio >= 0.6) {
    strengths.push(`${dataPrefix}Good engagement levels during tracking periods`);
  }
  
  // Category analysis
  const topCategory = reportData.sortedCategories[0];
  if (topCategory && ['Development', 'Learning', 'Research', 'Communication'].includes(topCategory.category)) {
    strengths.push(`${dataPrefix}Productive time allocation with ${topCategory.percentage}% spent on ${topCategory.category.toLowerCase()} activities`);
  }
  
  // Time investment recognition
  if (reportData.totalTime >= 60) { // At least 1 hour tracked
    strengths.push(`${dataPrefix}Good commitment with ${Math.round(reportData.totalTime / 60 * 10) / 10} hours of tracked activity`);
  }
  
  // Improvement trend (if we have at least 2 days)
  if (reportData.performanceMetrics.improvementDays >= 1 && daysTracked >= 2) {
    strengths.push(`${dataPrefix}Positive improvement trend with ${reportData.performanceMetrics.improvementDays} day${reportData.performanceMetrics.improvementDays > 1 ? 's' : ''} of score increases`);
  }
  
  return strengths.length > 0 ? strengths : [`Started tracking productivity metrics - continue for ${daysTracked >= 3 ? 'more detailed' : 'comprehensive'} insights`];
}

function identifyWeaknesses(reportData) {
  const weaknesses = [];
  const daysTracked = reportData.daysWithData || 0;
  const dataPrefix = daysTracked < 3 ? `From ${daysTracked} day${daysTracked > 1 ? 's' : ''} of data: ` : '';
  
  // Focus score analysis - be constructive with limited data
  if (reportData.avgFocusScore < 50) {
    weaknesses.push(`${dataPrefix}Focus score below optimal range (${reportData.avgFocusScore}%) - work on minimizing distractions`);
  } else if (reportData.avgFocusScore < 70 && daysTracked >= 2) {
    weaknesses.push(`${dataPrefix}Focus score has room for improvement (${reportData.avgFocusScore}%) - consider productivity techniques`);
  }
  
  // Focus drops analysis - adjust threshold for limited data
  const dropThreshold = daysTracked < 3 ? 1 : 3;
  if (reportData.performanceMetrics.focusDrops >= dropThreshold) {
    weaknesses.push(`${dataPrefix}${reportData.performanceMetrics.focusDrops} significant focus drop${reportData.performanceMetrics.focusDrops > 1 ? 's' : ''} detected - review what caused these dips`);
  }
  
  // Behavioral patterns - adjust thresholds for limited data
  const switchThreshold = daysTracked < 3 ? 20 : 50;
  if (reportData.behavioralData.tabSwitches > switchThreshold) {
    weaknesses.push(`${dataPrefix}High tab switching frequency (${reportData.behavioralData.tabSwitches}) indicates potential multitasking issues`);
  }
  
  const distractionThreshold = daysTracked < 3 ? 5 : 10;
  if (reportData.behavioralData.distractions > distractionThreshold) {
    weaknesses.push(`${dataPrefix}${reportData.behavioralData.distractions} distraction events recorded - consider implementing blocking strategies`);
  }
  
  // Low engagement
  if (reportData.behavioralData.activeTimeRatio < 0.5) {
    weaknesses.push(`${dataPrefix}Low active engagement (${Math.round(reportData.behavioralData.activeTimeRatio * 100)}%) - focus on staying actively engaged during work`);
  }
  
  // Entertainment/distraction categories - be more lenient with limited data
  const entertainmentTime = reportData.sortedCategories.find(cat => 
    ['Entertainment', 'Social Media', 'News'].includes(cat.category)
  );
  
  const entertainmentThreshold = daysTracked < 3 ? 40 : 25;
  if (entertainmentTime && entertainmentTime.percentage > entertainmentThreshold) {
    weaknesses.push(`${dataPrefix}${entertainmentTime.percentage}% time on ${entertainmentTime.category} - consider setting stricter limits`);
  }
  
  // Low productive time
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  const productiveTime = reportData.sortedCategories.filter(cat => 
    productiveCategories.includes(cat.category)
  ).reduce((sum, cat) => sum + cat.percentage, 0);
  
  if (productiveTime < 50 && reportData.totalTime > 30) {
    weaknesses.push(`${dataPrefix}Only ${productiveTime}% time on productive activities - increase focus on work/learning tasks`);
  }
  
  // Insufficient deep work
  if (reportData.behavioralData.deepWorkSessions === 0 && reportData.totalTime > 60) {
    weaknesses.push(`${dataPrefix}No extended deep work sessions detected - try longer focused periods`);
  }
  
  return weaknesses.length > 0 ? weaknesses : ['Focus on building more consistent daily routines'];
}

function identifyPatterns(reportData) {
  const patterns = [];
  const daysTracked = reportData.daysWithData || 0;
  
  // Day of week analysis - only if we have meaningful comparison
  if (reportData.performanceMetrics.bestDay && reportData.performanceMetrics.worstDay && daysTracked >= 2) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDayIndex = reportData.dailyScores.findIndex(d => d.score === reportData.performanceMetrics.bestDay.score);
    const worstDayIndex = reportData.dailyScores.findIndex(d => d.score === reportData.performanceMetrics.worstDay.score);
    
    if (bestDayIndex !== -1) {
      patterns.push(`Best performance observed on ${dayNames[bestDayIndex]} (${reportData.performanceMetrics.bestDay.score}%)`);
    }
    if (worstDayIndex !== -1 && worstDayIndex !== bestDayIndex) {
      patterns.push(`Lower performance on ${dayNames[worstDayIndex]} (${reportData.performanceMetrics.worstDay.score}%)`);
    }
  }
  
  // Time allocation patterns
  if (reportData.sortedCategories.length >= 2) {
    const top2 = reportData.sortedCategories.slice(0, 2);
    patterns.push(`Primary time split: ${top2[0].category} (${top2[0].percentage}%) and ${top2[1].category} (${top2[1].percentage}%)`);
  } else if (reportData.sortedCategories.length === 1) {
    const topCat = reportData.sortedCategories[0];
    patterns.push(`Main activity focus: ${topCat.category} (${topCat.percentage}% of tracked time)`);
  }
  
  // Behavioral patterns
  if (reportData.behavioralData.activeTimeRatio > 0.7) {
    patterns.push(`High engagement pattern - ${Math.round(reportData.behavioralData.activeTimeRatio * 100)}% active browser usage`);
  } else if (reportData.behavioralData.activeTimeRatio < 0.5) {
    patterns.push(`Lower engagement pattern - ${Math.round(reportData.behavioralData.activeTimeRatio * 100)}% active time, consider reducing idle periods`);
  } else {
    patterns.push(`Moderate engagement - ${Math.round(reportData.behavioralData.activeTimeRatio * 100)}% active browser usage`);
  }
  
  // Tab switching patterns
  if (reportData.behavioralData.tabSwitches > 0) {
    const switchRate = daysTracked > 0 ? Math.round(reportData.behavioralData.tabSwitches / daysTracked) : reportData.behavioralData.tabSwitches;
    if (switchRate > 25) {
      patterns.push(`High tab switching pattern - ${switchRate} switches per day on average`);
    } else if (switchRate > 10) {
      patterns.push(`Moderate tab switching - ${switchRate} switches per day on average`);
    } else {
      patterns.push(`Low tab switching - ${switchRate} switches per day, good focus discipline`);
    }
  }
  
  // Deep work patterns
  if (reportData.behavioralData.deepWorkSessions > 0) {
    patterns.push(`Deep work capability demonstrated - ${reportData.behavioralData.deepWorkSessions} extended focus session${reportData.behavioralData.deepWorkSessions > 1 ? 's' : ''} recorded`);
  }
  
  // Consistency patterns
  if (daysTracked >= 2 && reportData.performanceMetrics.focusConsistency <= 15) {
    patterns.push('Consistent performance pattern - stable focus scores across tracked days');
  } else if (daysTracked >= 2 && reportData.performanceMetrics.focusConsistency > 30) {
    patterns.push('Variable performance pattern - focus scores fluctuate significantly');
  }
  
  return patterns;
}

function analyzeBehavioralPatterns(reportData) {
  return {
    tabSwitchingPattern: reportData.behavioralData.tabSwitches > 30 ? 'High frequency' : 'Moderate frequency',
    focusStability: reportData.behavioralData.deepWorkSessions >= 3 ? 'Strong' : 'Needs improvement',
    distractionResistance: reportData.behavioralData.distractions < 5 ? 'Excellent' : 'Moderate',
    engagementLevel: reportData.behavioralData.activeTimeRatio > 0.8 ? 'High' : 'Moderate'
  };
}

function getDayName(index) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const dayIndex = (today - 6 + index) % 7;
  return days[dayIndex < 0 ? dayIndex + 7 : dayIndex];
}

function showWeeklyReportModal(report) {
  // Create modal for weekly report
  const modal = document.createElement('div');
  modal.className = 'report-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📊 Weekly Focus Report</h2>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="report-stat">
          <span class="report-value">${report.avgFocusScore}%</span>
          <span class="report-label">Average Focus Score</span>
        </div>
        <div class="report-stat">
          <span class="report-value">${formatTime(report.totalTime)}</span>
          <span class="report-label">Total Time Tracked</span>
        </div>
        <div class="category-breakdown">
          <h3>Time by Category</h3>
          ${Object.entries(report.categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, time]) => 
              '<div class="category-item">' +
                '<span class="category-name">' + category + '</span>' +
                '<span class="category-time">' + formatTime(Math.round(time / 1000 / 60)) + '</span>' +
              '</div>'
            ).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.close-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function exportUserData() {
  try {
    const allData = await chrome.storage.local.get();
    const dataBlob = new Blob([JSON.stringify(allData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focustracker-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function generateDailyInsights(weekData, avgFocus, totalMinutes) {
  const insights = [];
  const today = new Date().toDateString();
  const todayDataEntry = weekData.find(day => day.date === today);
  const todayData = todayDataEntry && todayDataEntry.data ? todayDataEntry.data : null;
  
  // Focus score insights
  if (avgFocus >= 80) {
    insights.push({
      type: 'success',
      icon: '🎯',
      message: `Great focus this week! Average score: ${avgFocus}%`
    });
  } else if (avgFocus >= 60) {
    insights.push({
      type: 'warning', 
      icon: '📈',
      message: `Focus could improve. Try reducing distractions by 15 min/day`
    });
  } else {
    insights.push({
      type: 'alert',
      icon: '🚨', 
      message: `Focus needs attention. Consider using website blockers`
    });
  }
  
  // Time management insight
  const dailyAvgHours = Math.round((totalMinutes / 7) / 60 * 10) / 10;
  if (dailyAvgHours < 4) {
    insights.push({
      type: 'info',
      icon: '⏱️',
      message: `Low activity: ${dailyAvgHours}h/day average. Increase tracked time`
    });
  } else if (dailyAvgHours > 10) {
    insights.push({
      type: 'warning',
      icon: '🔥',
      message: `High activity: ${dailyAvgHours}h/day. Consider breaks`
    });
  }
  
  // Category-specific insights (only if we have real data)
  if (todayData && todayData.timeByCategory) {
    const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
    const distractingCategories = ['Entertainment', 'Social Media', 'News'];
    
    let topDistraction = { category: '', time: 0 };
    let topProductive = { category: '', time: 0 };
    
    Object.entries(todayData.timeByCategory).forEach(([category, time]) => {
      if (distractingCategories.includes(category) && time > topDistraction.time) {
        topDistraction = { category, time };
      }
      if (productiveCategories.includes(category) && time > topProductive.time) {
        topProductive = { category, time };
      }
    });
    
    if (topProductive.category) {
      insights.push({
        type: 'success',
        icon: '💪',
        message: `Top strength: ${topProductive.category} (${Math.round(topProductive.time/1000/60)}min today)`
      });
    }
    
    if (topDistraction.time > 30 * 60 * 1000) { // More than 30 minutes
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `Top distraction: ${topDistraction.category} (${Math.round(topDistraction.time/1000/60)}min today)`
      });
    }
  } else {
    // No real data available
    insights.push({
      type: 'info',
      icon: '📊',
      message: 'No activity data for today. Start browsing to get insights!'
    });
  }
  
  displayInsights(insights);
}

function displayInsights(insights) {
  let insightsContainer = document.getElementById('insights-container');
  
  if (!insightsContainer) {
    insightsContainer = document.createElement('div');
    insightsContainer.id = 'insights-container';
    insightsContainer.className = 'insights-section';
    
    // Insert after weekly section
    const weeklySection = document.querySelector('.weekly-section');
    if (weeklySection) {
      weeklySection.insertAdjacentElement('afterend', insightsContainer);
    }
  }
  
  insightsContainer.innerHTML = `
    <h3>💡 Insights & Recommendations</h3>
    <div class="insights-list"></div>
  `;

  const list = insightsContainer.querySelector('.insights-list');
  list.innerHTML = '';
  for (var i = 0; i < insights.length; i++) {
    var insight = insights[i];
    var item = document.createElement('div');
    item.className = 'insight-item insight-' + insight.type;

    var iconSpan = document.createElement('span');
    iconSpan.className = 'insight-icon';
    iconSpan.textContent = insight.icon;

    var messageSpan = document.createElement('span');
    messageSpan.className = 'insight-message';
    messageSpan.textContent = insight.message;

    item.appendChild(iconSpan);
    item.appendChild(messageSpan);
    list.appendChild(item);
  }
}

function showMessage(message, type = 'info') {
  // Create or update message element
  let messageEl = document.getElementById('status-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'status-message';
    messageEl.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(messageEl);
  }
  
  // Set message and style based on type
  messageEl.textContent = message;
  
  switch (type) {
    case 'success':
      messageEl.style.backgroundColor = '#d4edda';
      messageEl.style.color = '#155724';
      messageEl.style.border = '1px solid #c3e6cb';
      break;
    case 'error':
      messageEl.style.backgroundColor = '#f8d7da';
      messageEl.style.color = '#721c24';
      messageEl.style.border = '1px solid #f5c6cb';
      break;
    case 'info':
    default:
      messageEl.style.backgroundColor = '#d1ecf1';
      messageEl.style.color = '#0c5460';
      messageEl.style.border = '1px solid #bee5eb';
      break;
  }
  
  messageEl.style.opacity = '1';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (messageEl) {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }
  }, 3000);
}




