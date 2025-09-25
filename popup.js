// LockedIn Extension Popup Script
let dailyChart = null;
let dailyReportChart = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensionData();
  setupEventListeners();
  startTimerUpdates();
});

async function loadExtensionData() {
  try {
    await updateTimer();
    await updateFocusScore();
    await updateDailyStats();
    await createDailyChart();
  } catch (error) {
    console.error('Error loading extension data:', error);
  }
}

// Timer functionality
async function updateTimer() {
  try {
    const result = await chrome.storage.local.get(['currentTask', 'taskDuration', 'taskStartTime', 'isTaskActive']);
    
    const currentTaskEl = document.getElementById('currentTask');
    const totalDurationEl = document.getElementById('totalDuration');
    const timeLeftEl = document.getElementById('timeLeft');
    const progressFillEl = document.getElementById('progressFill');

    if (result.isTaskActive && result.taskStartTime && result.taskDuration) {
      const now = Date.now();
      const elapsed = Math.floor((now - result.taskStartTime) / 1000 / 60); // minutes
      const remaining = Math.max(0, result.taskDuration - elapsed);
      const progress = Math.min(100, (elapsed / result.taskDuration) * 100);

      // Update UI
      currentTaskEl.textContent = result.currentTask || 'Active Task';
      totalDurationEl.textContent = `${result.taskDuration}min`;
      
      if (remaining > 0) {
        const hours = Math.floor(remaining / 60);
        const minutes = remaining % 60;
        timeLeftEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        progressFillEl.style.width = `${progress}%`;
      } else {
        timeLeftEl.textContent = '00:00';
        progressFillEl.style.width = '100%';
        
        // Task completed
        if (result.isTaskActive) {
          await chrome.storage.local.set({ isTaskActive: false });
          showTaskCompleteNotification();
        }
      }
    } else {
      currentTaskEl.textContent = 'No active task';
      totalDurationEl.textContent = '--';
      timeLeftEl.textContent = '--:--';
      progressFillEl.style.width = '0%';
    }
  } catch (error) {
    console.error('Error updating timer:', error);
  }
}

function startTimerUpdates() {
  // Update timer every second
  timerInterval = setInterval(updateTimer, 1000);
}

function showTaskCompleteNotification() {
  // Show celebration message
  const messageEl = document.createElement('div');
  messageEl.className = 'completion-message';
  messageEl.innerHTML = '🎉 Task Complete! Great job staying focused!';
  messageEl.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(messageEl);
  setTimeout(() => messageEl.remove(), 3000);
}

async function updateFocusScore() {
  const scoreElement = document.getElementById('focusScore');
  
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || { focusScore: null };
    
    if (todayData.focusScore !== null && todayData.focusScore !== undefined) {
      scoreElement.textContent = todayData.focusScore;
      
      // Update score circle
      const scoreCircle = document.querySelector('.score-circle');
      if (scoreCircle) {
        const angle = (todayData.focusScore / 100) * 360;
        scoreCircle.style.setProperty('--score-angle', `${angle}deg`);
      }
    } else {
      scoreElement.textContent = '--';
    }
  } catch (error) {
    console.error('Error updating focus score:', error);
    scoreElement.textContent = '--';
  }
}

async function updateDailyStats() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || { 
      relevantTime: 0, 
      distractedTime: 0 
    };

    const relevantTimeEl = document.getElementById('relevantTime');
    const distractedTimeEl = document.getElementById('distractedTime');

    relevantTimeEl.textContent = `${Math.round(todayData.relevantTime || 0)}m`;
    distractedTimeEl.textContent = `${Math.round(todayData.distractedTime || 0)}m`;
  } catch (error) {
    console.error('Error updating daily stats:', error);
  }
}

async function createDailyChart() {
  const canvas = document.getElementById('dailyChart');
  const ctx = canvas.getContext('2d');
  
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
    
    // Destroy existing chart
    if (dailyChart) {
      dailyChart.destroy();
    }

    const relevantTime = todayData.relevantTime || 0;
    const distractedTime = todayData.distractedTime || 0;
    
    if (relevantTime === 0 && distractedTime === 0) {
      document.getElementById('noDataMessage').classList.remove('hidden');
      canvas.style.display = 'none';
      return;
    }

    document.getElementById('noDataMessage').classList.add('hidden');
    canvas.style.display = 'block';

    dailyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['On Task', 'Distracted'],
        datasets: [{
          data: [relevantTime, distractedTime],
          backgroundColor: [
            '#10b981', // Green for on task
            '#ef4444'  // Red for distracted
          ],
          borderWidth: 0,
          cutout: '60%'
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
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${Math.round(context.raw)}min`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating daily chart:', error);
  }
}

function setupEventListeners() {
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  });

  // Daily report button
  document.getElementById('dailyReportBtn').addEventListener('click', showDailyReport);

  // Open website button
  document.getElementById('openWebsiteBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });

  // Close daily report modal
  document.getElementById('closeDailyReport').addEventListener('click', hideDailyReport);

  // Close modal on outside click
  document.getElementById('dailyReportModal').addEventListener('click', (e) => {
    if (e.target.id === 'dailyReportModal') {
      hideDailyReport();
    }
  });
}

async function showDailyReport() {
  const modal = document.getElementById('dailyReportModal');
  modal.classList.remove('hidden');
  
  await createDailyReportChart();
  await updateDailyReportStats();
}

function hideDailyReport() {
  const modal = document.getElementById('dailyReportModal');
  modal.classList.add('hidden');
  
  if (dailyReportChart) {
    dailyReportChart.destroy();
    dailyReportChart = null;
  }
}

async function createDailyReportChart() {
  const canvas = document.getElementById('dailyReportChart');
  const ctx = canvas.getContext('2d');
  
  try {
    // Get today's hourly data
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
    
    // Destroy existing chart
    if (dailyReportChart) {
      dailyReportChart.destroy();
    }

    // Create hourly breakdown data (simplified for demo)
    const hours = [];
    const focusData = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i <= currentHour; i++) {
      hours.push(`${i.toString().padStart(2, '0')}:00`);
      // Simulate some focus data (in real implementation, this would come from storage)
      focusData.push(Math.random() * 60 + 20); // Random focus score between 20-80
    }

    dailyReportChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: 'Hourly Focus Score',
          data: focusData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5
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
            grid: {
              color: 'rgba(0,0,0,0.1)'
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating daily report chart:', error);
  }
}

async function updateDailyReportStats() {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([today]);
    const todayData = result[today] || {};
    
    // Update report stats
    document.getElementById('totalSessions').textContent = todayData.sessions || 0;
    document.getElementById('dailyFocusScore').textContent = `${todayData.focusScore || '--'}%`;
    document.getElementById('timeOnTask').textContent = `${Math.round(todayData.relevantTime || 0)}m`;
  } catch (error) {
    console.error('Error updating daily report stats:', error);
  }
}

// Helper functions
function formatTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  if (dailyChart) {
    dailyChart.destroy();
  }
  if (dailyReportChart) {
    dailyReportChart.destroy();
  }
});