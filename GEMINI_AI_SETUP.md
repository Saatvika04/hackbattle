# Gemini AI Integration Setup Guide

## 🤖 AI-Powered Relevance Engine

The FocusTracker extension now includes AI-powered relevance checking using Google's Gemini API. This feature intelligently determines if websites are relevant to your current session and provides personalized action plans.

## ✨ Features Implemented

### 1. AI Relevance Checking
- **Smart Website Analysis**: Uses Gemini 1.5 Flash to analyze website URLs and titles
- **Context-Aware**: Considers your current session category (work, study, personal, etc.)
- **Confidence Scoring**: Provides relevance scores from 0-100
- **Fallback System**: Uses keyword matching when AI is unavailable

### 2. AI Action Plans
- **Weekly Analysis**: AI analyzes your productivity patterns
- **Personalized Recommendations**: Get 2-3 specific, actionable tips
- **Data-Driven Insights**: Based on focus scores, time allocation, and category breakdown

### 3. Settings Management
- **API Key Configuration**: Secure storage of your Gemini API key
- **Connection Testing**: Verify API connectivity with one click
- **Fallback Controls**: Enable/disable keyword-based fallback

## 🚀 Setup Instructions

### Step 1: Get Your Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

### Step 2: Configure the Extension
1. Open the extension popup
2. Click the settings button (⚙️)
3. Scroll to "🤖 AI Settings"
4. Paste your API key in the "Gemini API Key" field
5. Click "Test Connection" to verify
6. Save your settings

### Step 3: Usage
- **Automatic**: AI relevance checking runs automatically as you browse
- **Insights**: View AI action plans in the popup's insights section
- **Fallback**: If AI fails, keyword matching provides backup relevance checking

## 🔧 Technical Implementation

### Files Modified
- `background.js`: AI relevance engine with Gemini API integration
- `popup.js`: AI action plan generation and display
- `option.js`: API key management and testing
- `options.html`: AI settings UI
- `options.css`: AI settings styling
- `popup.css`: AI insights styling
- `manifest.json`: API permissions

### Key Functions
- `checkRelevanceWithAI()`: Main AI relevance checking function using Gemini 1.5 Flash
- `generateAIActionPlan()`: Creates personalized recommendations
- `testGeminiAPI()`: Validates API connectivity
- `checkRelevanceWithKeywords()`: Fallback relevance checking

### Data Storage
- API key stored securely in `chrome.storage.sync`
- Relevance data cached to reduce API calls
- AI insights integrated with existing session data

## 🛠 Development Notes

### ES5 Compatibility
All AI code uses ES5 syntax for Chrome extension compatibility:
- `var` instead of `const/let`
- `function()` instead of arrow functions
- `.indexOf()` instead of `.includes()`

### Error Handling
- Graceful fallback to keyword matching on API errors
- Silent failure for AI action plans (no user disruption)
- Connection testing with user feedback

### Performance
- Response caching to minimize API calls
- Periodic cache clearing (every hour)
- Lightweight prompts to reduce token usage

## 🧪 Testing

### Manual Testing
1. Load the extension in Chrome Developer Mode
2. Configure API key in settings
3. Browse different websites and check relevance data
4. View AI action plans in popup insights

### API Testing
- Use the "Test Connection" button in settings
- Check browser console for detailed error logs
- Verify API key permissions and quotas

## 🔒 Privacy & Security

### Data Handling
- API key stored locally in browser
- Only website URLs and titles sent to AI
- No personal browsing history stored on servers
- Cache cleared regularly to limit data retention

### API Usage
- Minimal data sent to Gemini API
- Focused prompts to reduce token usage
- Fallback ensures functionality without API

## 🚨 Troubleshooting

### Common Issues
1. **API Key Invalid**: Check key format and permissions
2. **No AI Insights**: Verify API key and internet connection
3. **Fallback Only**: Check API quotas and rate limits

### Debug Steps
1. Test API connection in settings
2. Check browser console for error messages
3. Verify extension permissions in Chrome
4. Ensure popup refreshes after settings changes

## 📈 Future Enhancements

### Planned Features
- Category-specific AI models
- Learning from user feedback
- Integration with calendar/task management
- Advanced productivity coaching

### API Alternatives
- Ready to support OpenAI API
- Claude API integration possible
- Local AI model support planned

## 💡 Usage Tips

### Best Practices
1. Test API connection after setup
2. Review AI recommendations weekly
3. Adjust session categories for better relevance
4. Use fallback mode if API quota exceeded

### Optimization
- AI works best with descriptive website titles
- Clear session categories improve relevance scoring
- Regular data review enhances AI recommendations

---

**Ready to boost your productivity with AI? Get your Gemini API key and start tracking! 🚀**