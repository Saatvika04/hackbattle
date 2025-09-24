// Quick setup and test script for FocusTracker
// This initializes the extension with proper settings and sample data

(async function initializeFocusTracker() {
  console.log('🚀 Initializing FocusTracker Extension...');

  try {
    // 1. Set up default settings
    const defaultSettings = {
      weeklyReports: true,
      emailAddress: 'kushaan.koul@gmail.com',
      focusGoal: 80,
      trackInactive: false,
      minSessionTime: 5,
      dataRetention: 90,
      customRules: [
        { pattern: 'github.com', category: 'Development', id: Date.now() },
        { pattern: 'stackoverflow.com', category: 'Development', id: Date.now() + 1 },
        { pattern: 'youtube.com', category: 'Entertainment', id: Date.now() + 2 },
        { pattern: 'facebook.com', category: 'Social Media', id: Date.now() + 3 },
        { pattern: 'coursera.org', category: 'Learning', id: Date.now() + 4 },
        { pattern: '*.edu', category: 'Learning', id: Date.now() + 5 }
      ]
    };

    await chrome.storage.sync.set(defaultSettings);
    console.log('✅ Default settings configured');

    // 2. Generate sample data for the past week
    const sampleData = generateWeekData();
    
    for (const [date, data] of Object.entries(sampleData)) {
      await chrome.storage.local.set({ [date]: data });
    }
    
    console.log('✅ Sample data generated for past 7 days');

    // 3. Create initial weekly report
    const weeklyReport = {
      weekStart: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toDateString(),
      weekEnd: new Date().toDateString(),
      averageFocusScore: 73,
      totalTime: 2100, // 35 hours
      insights: [
        {
          type: 'success',
          title: 'Good Focus Habits',
          message: 'You maintained consistent productivity this week',
          action: 'Keep up the current routine'
        },
        {
          type: 'warning', 
          title: 'Entertainment Distraction',
          message: 'YouTube consumed 25% of your time',
          action: 'Try reducing by 15 minutes daily'
        }
      ]
    };

    await chrome.storage.local.set({ 
      weeklyReport,
      lastReportDate: new Date().toISOString()
    });

    console.log('✅ Weekly report initialized');
    console.log('🎉 FocusTracker is ready to use!');
    console.log('📊 Check the popup for your dashboard');
    console.log('⚙️ Visit options page to customize settings');

  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
})();

function generateWeekData() {
  const data = {};
  const categories = ['Development', 'Learning', 'Research', 'Communication', 'Entertainment', 'Social Media', 'News', 'Other'];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();
    
    // Generate realistic time patterns
    const dayData = {
      focusScore: Math.floor(Math.random() * 30) + 60, // 60-90
      totalTime: 0,
      timeByCategory: {}
    };

    // Simulate workday pattern
    const workCategories = ['Development', 'Learning', 'Research', 'Communication'];
    const funCategories = ['Entertainment', 'Social Media', 'News'];
    
    // Add work time (4-8 hours)
    workCategories.forEach(category => {
      if (Math.random() > 0.3) { // 70% chance of activity
        const time = Math.floor(Math.random() * 180 + 30) * 60 * 1000; // 30min-3hours
        dayData.timeByCategory[category] = time;
        dayData.totalTime += time;
      }
    });
    
    // Add entertainment time (1-3 hours)
    funCategories.forEach(category => {
      if (Math.random() > 0.5) { // 50% chance
        const time = Math.floor(Math.random() * 120 + 15) * 60 * 1000; // 15min-2hours
        dayData.timeByCategory[category] = time;
        dayData.totalTime += time;
      }
    });

    // Recalculate focus score
    dayData.focusScore = calculateFocusScore(dayData.timeByCategory);
    data[dateString] = dayData;
  }
  
  return data;
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