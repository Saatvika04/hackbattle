// Test data generator for FocusTracker
// Run this in the console to populate the extension with sample data

async function generateTestData() {
  const categories = ['Development', 'Learning', 'Research', 'Communication', 'Entertainment', 'Social Media', 'News', 'Other'];
  const websites = {
    'Development': ['github.com', 'stackoverflow.com', 'codepen.io'],
    'Learning': ['coursera.org', 'udemy.com', 'khan.academy'],
    'Research': ['scholar.google.com', 'wikipedia.org', 'arxiv.org'],
    'Communication': ['gmail.com', 'slack.com', 'zoom.us'],
    'Entertainment': ['youtube.com', 'netflix.com', 'twitch.tv'],
    'Social Media': ['facebook.com', 'twitter.com', 'instagram.com'],
    'News': ['cnn.com', 'bbc.com', 'nytimes.com'],
    'Other': ['amazon.com', 'weather.com', 'maps.google.com']
  };

  // Generate data for the past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toDateString();

    const dayData = {
      focusScore: Math.floor(Math.random() * 40) + 60, // 60-100
      totalTime: 0,
      timeByCategory: {}
    };

    // Generate random time allocation
    categories.forEach(category => {
      const timeSpent = Math.floor(Math.random() * 120 * 60 * 1000); // 0-2 hours in milliseconds
      if (timeSpent > 0) {
        dayData.timeByCategory[category] = timeSpent;
        dayData.totalTime += timeSpent;
      }
    });

    // Recalculate focus score based on generated data
    dayData.focusScore = calculateTestFocusScore(dayData.timeByCategory);

    // Store the data
    await chrome.storage.local.set({ [dateString]: dayData });
    console.log(`Generated data for ${dateString}:`, dayData);
  }

  // Generate some custom rules
  const customRules = [
    { pattern: 'github.com', category: 'Development', id: Date.now() },
    { pattern: 'youtube.com', category: 'Entertainment', id: Date.now() + 1 },
    { pattern: '*.edu', category: 'Learning', id: Date.now() + 2 }
  ];

  await chrome.storage.sync.set({
    customRules,
    weeklyReports: true,
    emailAddress: 'user@example.com',
    focusGoal: 75,
    trackInactive: false,
    minSessionTime: 5,
    dataRetention: 90
  });

  console.log('Test data generation complete!');
  console.log('Custom rules:', customRules);
}

function calculateTestFocusScore(timeByCategory) {
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

// Run the test data generation
// generateTestData();

console.log('Test data generator loaded. Run generateTestData() to populate with sample data.');