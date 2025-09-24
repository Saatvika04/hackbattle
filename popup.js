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
      focusScore: 100,
      totalTime: 0,
      timeByCategory: {}
    };

    updateFocusScore(todayData.focusScore);
    updateTimeStats(todayData);
    createTimeChart(todayData.timeByCategory);
    
    await loadWeeklyData();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateFocusScore(score) {
  const scoreElement = document.getElementById('focusScore');
  const messageElement = document.getElementById('focusMessage');
  const scoreCircle = document.querySelector('.score-circle');
  
  if (!scoreElement || !messageElement || !scoreCircle) {
    console.error('Missing required DOM elements for focus score display');
    return;
  }
  
  scoreElement.textContent = score;
  
  // Update progress circle
  const angle = (score / 100) * 360;
  scoreCircle.style.setProperty('--score-angle', `${angle}deg`);
  
  // Update message based on score
  let message = '';
  if (score >= 90) {
    message = 'Excellent focus today! 🎉';
    scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(34, 197, 94, 0.3) 0deg, rgba(34, 197, 94, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
  } else if (score >= 70) {
    message = 'Good focus, keep it up! 👍';
    scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(59, 130, 246, 0.3) 0deg, rgba(59, 130, 246, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
  } else if (score >= 50) {
    message = 'Room for improvement 📈';
    scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(245, 158, 11, 0.3) 0deg, rgba(245, 158, 11, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
  } else {
    message = 'Try to minimize distractions';
    scoreCircle.style.background = 'conic-gradient(from 0deg, rgba(239, 68, 68, 0.3) 0deg, rgba(239, 68, 68, 0.8) ' + angle + 'deg, rgba(255, 255, 255, 0.2) ' + angle + 'deg)';
  }
  
  messageElement.textContent = message;
}

// --- Replace the entire old function with this new one ---

function updateTimeStats(todayData) {
  const totalTimeElement = document.getElementById('totalTime');
  const productiveTimeElement = document.getElementById('productiveTime');

  if (!totalTimeElement || !productiveTimeElement) {
    console.error('Missing required DOM elements for time stats display');
    return;
  }

  const totalMinutes = Math.round(todayData.totalTime / 1000 / 60);
  totalTimeElement.textContent = formatTime(totalMinutes);

  // Define the single source of truth for productive categories
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  
  let productiveMinutes = 0;

  // Calculate productive time based on the same list used by the background script
  Object.entries(todayData.timeByCategory).forEach(([category, time]) => {
    if (productiveCategories.includes(category)) {
      productiveMinutes += Math.round(time / 1000 / 60);
    }
  });

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
    weekData.push({
      date: dateString,
      data: result[dateString] || { focusScore: 100, totalTime: 0, timeByCategory: {} }
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
        const report = await generateWeeklyReport();
        showWeeklyReportModal(report);
      } catch (error) {
        console.error('Error generating weekly report:', error);
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
  const weekData = await getWeekData();
  
  const totalTime = weekData.reduce((sum, day) => sum + day.data.totalTime, 0);
  const avgFocusScore = Math.round(
    weekData.reduce((sum, day) => sum + day.data.focusScore, 0) / weekData.length
  );
  
  const categoryTotals = {};
  weekData.forEach(day => {
    Object.entries(day.data.timeByCategory || {}).forEach(([category, time]) => {
      categoryTotals[category] = (categoryTotals[category] || 0) + time;
    });
  });
  
  return {
    totalTime: Math.round(totalTime / 1000 / 60),
    avgFocusScore,
    categoryTotals,
    dailyScores: weekData.map(day => day.data.focusScore)
  };
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
  const todayData = todayDataEntry ? todayDataEntry.data : { focusScore: 100, timeByCategory: {} };
  
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
  
  // Category-specific insights
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


