# Deployment Guide - FocusTracker Chrome Extension

This guide explains how to deploy and distribute the FocusTracker Chrome extension.

## Chrome Web Store Deployment

### Prerequisites

1. *Developer Account*: Create a Chrome Web Store developer account ($5 one-time fee)
2. *Icons*: Ensure all icon files are present in the icons/ directory
3. *Testing*: Test the extension thoroughly in development mode

### Step 1: Prepare for Submission

1. *Add Required Icons*
   bash
   # Ensure these files exist in icons/ directory:
   icons/icon16.png   # 16x16 pixels
   icons/icon32.png   # 32x32 pixels  
   icons/icon48.png   # 48x48 pixels
   icons/icon128.png  # 128x128 pixels
   

2. *Create Promotional Images*
   - Small tile: 440x280 pixels
   - Large tile: 920x680 pixels
   - Marquee: 1400x560 pixels
   - Screenshots: 1280x800 or 640x400 pixels

3. *Review Manifest*
   - Ensure all permissions are justified
   - Update version number
   - Verify all URLs and domains

### Step 2: Package Extension

1. *Create ZIP Package*
   bash
   # Include all necessary files:
   zip -r focustracker-extension.zip . -x "*.git*" "*node_modules*" "*.DS_Store" "*README.md*" "*DEPLOYMENT.md*"
   

2. *Verify Package Contents*
   
   ├── manifest.json
   ├── background.js
   ├── content.js
   ├── popup.html
   ├── popup.js
   ├── popup.css
   ├── options.html
   ├── options.js
   ├── options.css
   └── icons/
       ├── icon16.png
       ├── icon32.png
       ├── icon48.png
       └── icon128.png
   

### Step 3: Submit to Chrome Web Store

1. *Access Developer Dashboard*
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Sign in with your developer account

2. *Create New Item*
   - Click "Add new item"
   - Upload your ZIP package
   - Fill in store listing details:

   
   Name: FocusTracker - Productivity & Time Management
   
   Summary: Track your focus score, visualize time allocation, and get weekly productivity reports to boost your productivity.
   
   Description:
   🎯 FocusTracker helps you understand and improve your digital productivity by automatically tracking your browsing habits and providing actionable insights.
   
   ✨ KEY FEATURES:
   • Daily Focus Score (0-100%) based on productive vs distracting websites
   • Beautiful time allocation visualizations with pie charts and trends
   • Weekly email reports with personalized insights
   • Customizable website categories and tracking preferences
   • Privacy-first: all data stored locally in your browser
   
   📊 DETAILED ANALYTICS:
   • Real-time focus score calculation
   • Time spent by category (Development, Learning, Social Media, etc.)
   • Weekly productivity trends and improvements
   • Top distractions identification
   
   ⚙ CUSTOMIZATION:
   • Set custom focus goals
   • Create website categorization rules
   • Configure tracking preferences
   • Export your data anytime
   
   🔒 PRIVACY & SECURITY:
   • All tracking data stays in your browser
   • No external data collection
   • Optional email reports (you control your data)
   • Easy data export and deletion
   
   Perfect for professionals, students, and anyone looking to improve their digital focus and productivity!
   

3. *Add Screenshots and Images*
   - Upload promotional images
   - Add 3-5 screenshots showing the extension in action
   - Include captions explaining key features

4. *Set Category and Language*
   - Primary category: Productivity
   - Languages: English (add others as needed)

5. *Set Pricing and Distribution*
   - Free extension
   - Available in all regions
   - Mature content: No

### Step 4: Review Process

1. *Submit for Review*
   - Click "Submit for review"
   - Review time: typically 1-3 business days

2. *Common Review Issues*
   - Permissions not clearly justified
   - Missing or low-quality screenshots
   - Inadequate privacy policy
   - Functionality not working as described

3. *Address Feedback*
   - Respond to any reviewer feedback promptly
   - Make required changes and resubmit

### Step 5: Post-Publication

1. *Monitor Reviews*
   - Respond to user reviews
   - Address common issues

2. *Analytics*
   - Track installation and usage metrics
   - Monitor user feedback

3. *Updates*
   - Regular updates for bug fixes and features
   - Increment version in manifest.json
   - Upload new package for each update

## Alternative Distribution Methods

### Enterprise Distribution

For organizations wanting to deploy internally:

1. *Google Admin Console*
   - Upload extension to organization's admin console
   - Force-install for all users
   - Control permissions and settings

### Developer Mode (Testing)

For development and testing:

1. *Load Unpacked Extension*
   bash
   # In Chrome, go to chrome://extensions/
   # Enable Developer mode
   # Click "Load unpacked"
   # Select extension directory
   

## Email Backend Service (Optional)

To enable email reports, you'll need a backend service:

### Option 1: Simple Email Service

javascript
// Example backend endpoint for email reports
app.post('/api/send-report', async (req, res) => {
  const { email, reportData } = req.body;
  
  // Send email using service like SendGrid, Mailgun, etc.
  await emailService.send({
    to: email,
    subject: 'Your Weekly Focus Report',
    template: 'weekly-report',
    data: reportData
  });
  
  res.json({ success: true });
});


### Option 2: Serverless Function

Deploy using Netlify Functions, Vercel, or AWS Lambda:

javascript
// netlify/functions/send-email.js
exports.handler = async (event, context) => {
  // Handle email sending logic
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};


## Monitoring and Maintenance

### Analytics Setup

1. *Chrome Web Store Analytics*
   - Track installs, uninstalls, ratings
   - Monitor user engagement

2. *Error Tracking*
   - Implement error logging
   - Monitor extension health

### Update Strategy

1. *Version Management*
   - Semantic versioning (1.0.0, 1.0.1, etc.)
   - Clear changelog for users

2. *Gradual Rollouts*
   - Use Chrome Web Store's gradual rollout feature
   - Monitor for issues before full deployment

## Troubleshooting

### Common Issues

1. *Icons Not Displaying*
   - Verify all icon sizes are present
   - Check file paths in manifest.json

2. *Permissions Rejected*
   - Provide clear justification for each permission
   - Remove unnecessary permissions

3. *Functionality Not Working*
   - Test in incognito mode
   - Check for console errors
   - Verify content script injection

### Support Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Developer Support](https://support.google.com/chrome_webstore/contact/dev_support)

---

*Note*: This extension is currently set up for development and testing. To deploy to production, you'll need to complete the Chrome Web Store submission process and potentially set up backend services for email functionality.
