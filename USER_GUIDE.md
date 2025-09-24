# FocusTracker Extension - User Guide

## 🚀 Getting Started

### Installation & Setup
1. Load the extension in Chrome Developer Mode
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" 
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar

### Initial Configuration
1. Click the FocusTracker icon in your toolbar
2. Click "Settings" or right-click → "Options"
3. Configure your preferences:
   - Set your daily focus goal (default: 80%)
   - Enable/disable weekly email reports
   - Set minimum session time tracking
   - Configure data retention period

## 📊 Understanding Your Data

### Focus Score Calculation
Your focus score is calculated using this formula:
```
Focus Score = (Productive Time Ratio - Distraction Penalty) × 100
```

**Category Classifications:**
- **Productive**: Development, Learning, Research, Communication
- **Distracting**: Entertainment, Social Media, News  
- **Neutral**: Everything else (doesn't affect score)

**Example:**
- 4 hours productive work + 1 hour social media + 1 hour other = 67% focus score
- Calculation: (4/6 - min(1/6, 0.3)) × 100 = (0.67 - 0.17) × 100 = 50%

### Dashboard Features
**Main Popup Display:**
- Current focus score with color-coded feedback
- Today's time breakdown by category
- Weekly overview chart
- Actionable insights and recommendations

## ⚙️ Customization Options

### Website Categorization
1. **Automatic Categorization**: Built-in rules for popular sites
2. **Custom Rules**: Add your own website patterns
   - Use wildcards: `*.edu` for all educational sites
   - Specific domains: `github.com`, `stackoverflow.com`
   - Subdirectories: `reddit.com/r/programming`

### Adding Custom Rules
1. Go to Settings → Website Categories
2. Click "Add Custom Rule"
3. Enter website pattern (e.g., `notion.so`)
4. Select appropriate category
5. Save rule

### Settings Explained
- **Weekly Reports**: Get email summaries every Sunday
- **Track Inactive Time**: Include away-from-computer time
- **Minimum Session Time**: Ignore very short visits (default: 5 seconds)
- **Data Retention**: How long to keep your data (default: 90 days)

## 📈 Reports & Insights

### Daily Insights (Popup)
The extension provides real-time feedback:
- 🎯 **Focus Achievement**: How you're doing vs your goal
- ⏱️ **Time Management**: Daily activity levels
- 💪 **Strengths**: Your most productive categories
- ⚠️ **Distractions**: Categories needing attention

### Weekly Reports
Comprehensive analysis including:
- Average focus score trends
- Time allocation breakdown
- Improvement recommendations
- Productivity streaks
- Top distractions to address

### Actionable Recommendations
Based on your data, you'll receive specific advice:
- "Reduce Social Media by 15 minutes daily"
- "Increase Learning activities by 30 minutes"
- "Consider blocking Entertainment during work hours"
- "Great job maintaining 3-day focus streak!"

## 🔧 Troubleshooting

### Extension Not Tracking
1. Ensure the extension is enabled and permissions granted
2. Check if you're browsing in incognito mode (requires separate permission)
3. Reload extension if needed: Chrome Extensions → Reload

### Data Not Displaying
1. Check Chrome Developer Console for errors
2. Verify extension has storage permissions
3. Try exporting/importing data to reset

### Settings Not Saving
1. Ensure sync storage is enabled in Chrome
2. Check internet connection for sync features
3. Try clearing extension data and reconfiguring

## 💡 Pro Tips

### Maximize Your Focus Score
1. **Morning Planning**: Check insights before starting work
2. **Category Review**: Regularly update custom rules for accuracy
3. **Weekly Analysis**: Use reports to identify patterns
4. **Goal Setting**: Adjust focus goal based on realistic expectations

### Best Practices
- Set focus goal between 70-85% for realistic targets
- Review weekly reports to spot trends
- Use custom rules for work-specific tools
- Enable notifications for motivation
- Export data regularly for backup

### Advanced Usage
1. **Data Export**: Use exported JSON for external analysis
2. **Custom Analysis**: Import into Excel/Sheets for deeper insights
3. **Team Comparison**: Share focus scores for accountability
4. **Integration**: Use data with other productivity tools

## 🎯 Achieving Your Goals

### For Students
- Categorize educational sites as "Learning"
- Set higher focus goals (85%+)
- Track study session effectiveness
- Use insights to optimize study schedules

### For Developers
- Ensure GitHub, Stack Overflow are "Development"
- Monitor coding vs browsing ratios
- Track learning vs building time
- Use data to justify productivity tools

### For Remote Workers
- Categorize work tools appropriately
- Monitor home vs office productivity
- Track meeting vs deep work time
- Use reports for productivity reviews

## 📊 Sample Data Generation (For Testing)

To test the extension with sample data:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Load the test-data.js file or paste its contents
4. Run `generateTestData()`
5. Refresh the extension popup to see sample data

This will populate the last 7 days with realistic usage patterns for testing all features.

## 🔐 Privacy & Data

### Data Storage
- All data stored locally in Chrome
- Optional sync across signed-in Chrome browsers
- No data sent to external servers
- Complete control over data retention

### Data Export/Import
- Export all data as JSON
- Import to restore or transfer data
- Clear all data option available
- Automatic cleanup based on retention settings

---

**Need Help?** 
- Check browser console for error messages
- Verify all permissions are granted
- Try disabling/re-enabling the extension
- Test with sample data first