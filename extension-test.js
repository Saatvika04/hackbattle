// Extension Test Script - Run this in browser console to test functionality
// Copy and paste this in the console when the extension popup is open

function testExtensionFunctionality() {
  console.log('🧪 Testing FocusTracker Extension...');
  
  // Test 1: Check if required DOM elements exist
  console.log('📋 Test 1: Checking DOM elements...');
  const requiredElements = [
    'focusScore',
    'focusMessage', 
    'totalTime',
    'productiveTime',
    'settingsBtn',
    'viewReportBtn',
    'exportDataBtn'
  ];
  
  const missingElements = [];
  requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (!element) {
      missingElements.push(id);
    }
  });
  
  if (missingElements.length > 0) {
    console.error('❌ Missing elements:', missingElements);
  } else {
    console.log('✅ All required DOM elements found');
  }
  
  // Test 2: Check if Chrome APIs are available
  console.log('📋 Test 2: Checking Chrome APIs...');
  if (typeof chrome === 'undefined') {
    console.error('❌ Chrome API not available');
  } else {
    console.log('✅ Chrome API available');
    
    if (chrome.storage) {
      console.log('✅ Storage API available');
    } else {
      console.error('❌ Storage API not available');
    }
    
    if (chrome.runtime) {
      console.log('✅ Runtime API available');
    } else {
      console.error('❌ Runtime API not available');
    }
  }
  
  // Test 3: Test settings button functionality
  console.log('📋 Test 3: Testing settings button...');
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    console.log('✅ Settings button found');
    console.log('🔧 Click the settings button to test navigation');
  } else {
    console.error('❌ Settings button not found');
  }
  
  // Test 4: Check storage data
  console.log('📋 Test 4: Checking storage data...');
  if (chrome.storage) {
    chrome.storage.local.get(null).then(data => {
      console.log('📊 Local storage data:', data);
      if (Object.keys(data).length === 0) {
        console.log('ℹ️ No data found - run setup.js to generate test data');
      }
    }).catch(error => {
      console.error('❌ Error reading storage:', error);
    });
  }
  
  // Test 5: Check for errors in console
  console.log('📋 Test 5: Check console for any errors above this message');
  
  console.log('🎯 Extension test complete!');
  console.log('💡 Tips:');
  console.log('   - If settings button doesn\'t work, check manifest permissions');
  console.log('   - If no data shows, run the setup.js script');
  console.log('   - Check Chrome Extensions page for any error badges');
}

// Run the test
testExtensionFunctionality();

// Helper function to generate test data
function generateTestData() {
  console.log('🔧 Generating test data...');
  
  const today = new Date().toDateString();
  const testData = {
    focusScore: 75,
    totalTime: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
    timeByCategory: {
      'Development': 2 * 60 * 60 * 1000, // 2 hours
      'Social Media': 1 * 60 * 60 * 1000, // 1 hour
      'Other': 1 * 60 * 60 * 1000 // 1 hour
    }
  };
  
  chrome.storage.local.set({ [today]: testData }).then(() => {
    console.log('✅ Test data generated for today');
    console.log('🔄 Refresh the popup to see the data');
  }).catch(error => {
    console.error('❌ Error generating test data:', error);
  });
}

console.log('🎯 FocusTracker Test Suite Loaded');
console.log('📋 Run testExtensionFunctionality() to test the extension');
console.log('🔧 Run generateTestData() to create sample data');