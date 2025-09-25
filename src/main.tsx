import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./main.css";

// Dummy weekly data (frontend only)
const weeklyData = [
  { day: "Mon", hours: 2, sessions: 3 },
  { day: "Tue", hours: 3, sessions: 4 },
  { day: "Wed", hours: 1.5, sessions: 2 },
  { day: "Thu", hours: 4, sessions: 5 },
  { day: "Fri", hours: 2.5, sessions: 3 },
  { day: "Sat", hours: 0, sessions: 0 },
  { day: "Sun", hours: 3, sessions: 4 },
];

// Blacklist data
const defaultBlacklist = [
  "facebook.com",
  "twitter.com", 
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "reddit.com"
];

function App() {
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState("");
  const [blacklist, setBlacklist] = useState(defaultBlacklist);
  const [newSite, setNewSite] = useState("");

  // Load blacklist from localStorage on component mount
  useEffect(() => {
    const savedBlacklist = localStorage.getItem('lockedInBlacklist');
    if (savedBlacklist) {
      setBlacklist(JSON.parse(savedBlacklist));
    }
  }, []);

  // Save blacklist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lockedInBlacklist', JSON.stringify(blacklist));
  }, [blacklist]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save task and duration to chrome storage (for extension)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        currentTask: task,
        taskDuration: parseInt(duration),
        taskStartTime: Date.now(),
        isTaskActive: true
      });
    }
    
    alert(`LockedIn! 🎯
Task: ${task}
Duration: ${duration} minutes
Good luck staying focused!`);
    
    // Clear form
    setTask("");
    setDuration("");
  };

  const addToBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSite.trim() && !blacklist.includes(newSite.trim())) {
      setBlacklist([...blacklist, newSite.trim()]);
      setNewSite("");
    }
  };

  const removeFromBlacklist = (site: string) => {
    setBlacklist(blacklist.filter(s => s !== site));
  };

  const openWeeklyReport = () => {
    // Generate and download weekly report
    const reportWindow = window.open('', '_blank');
    const htmlContent = generateWeeklyReportHTML();
    reportWindow?.document.write(htmlContent);
    reportWindow?.document.close();
  };

  const generateWeeklyReportHTML = () => {
    const totalHours = weeklyData.reduce((sum, day) => sum + day.hours, 0);
    const totalSessions = weeklyData.reduce((sum, day) => sum + day.sessions, 0);
    const avgFocus = totalHours > 0 ? Math.round((totalHours / 7) * 100 / 8) : 0; // Assuming 8h workday
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>LockedIn Weekly Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 25px 50px rgba(102, 126, 234, 0.4); }
        .header { text-align: center; margin-bottom: 40px; }
        .title { font-size: 3rem; font-weight: 800; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .subtitle { color: #64748b; margin-top: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: linear-gradient(135deg, #e0e7ff 0%, #8b5cf6 15%, #667eea 100%); padding: 25px; border-radius: 15px; text-align: center; color: white; }
        .stat-value { font-size: 2.5rem; font-weight: 800; display: block; }
        .stat-label { font-size: 0.9rem; opacity: 0.9; }
        .chart-section { margin: 30px 0; }
        .chart-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; color: #1e293b; }
        .daily-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 15px; margin: 20px 0; }
        .day-card { text-align: center; padding: 20px 10px; border-radius: 12px; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border: 2px solid #667eea; }
        .day-name { font-size: 0.8rem; color: #4338ca; font-weight: 600; }
        .day-hours { font-size: 1.5rem; font-weight: 800; color: #4338ca; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🎯 LockedIn Weekly Report</h1>
            <p class="subtitle">Your Focus Journey • ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-value">${totalHours}h</span>
                <span class="stat-label">Total Focus Time</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${totalSessions}</span>
                <span class="stat-label">Total Sessions</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${avgFocus}%</span>
                <span class="stat-label">Average Focus</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${Math.round(totalHours / totalSessions * 100) / 100 || 0}h</span>
                <span class="stat-label">Avg Session</span>
            </div>
        </div>

        <div class="chart-section">
            <h2 class="chart-title">📊 Daily Breakdown</h2>
            <div class="daily-grid">
                ${weeklyData.map(day => `
                    <div class="day-card">
                        <div class="day-name">${day.day}</div>
                        <div class="day-hours">${day.hours}h</div>
                        <div style="font-size: 0.7rem; color: #6366f1;">${day.sessions} sessions</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            Generated by LockedIn • Keep up the great work! 🚀
        </div>
    </div>
    <script>
        window.onload = function() {
            setTimeout(() => window.print(), 1000);
        };
    </script>
</body>
</html>`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🎯 LockedIn
          </h1>
          <p className="text-gray-600 text-lg">Stay focused, achieve more</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Task Input */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Start a Focus Session</h2>
            
            {/* Task & Duration Form */}
            <form onSubmit={handleStart} className="space-y-6">
              {/* Task Input */}
              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  📝 What is your task?
                </label>
                <input
                  type="text"
                  placeholder="e.g., Study for exam, Write report, Learn coding"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Duration Input */}
              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  ⏰ How long do you want to focus? (minutes)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 25, 45, 90"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="480"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Start Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition duration-200 shadow-lg"
              >
                🚀 Start Focus Session
              </button>
            </form>

            {/* Quick Access */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button 
                onClick={() => window.open('options.html', '_blank')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition duration-200"
              >
                ⚙️ Settings
              </button>
              <button 
                onClick={() => alert('Click the LockedIn extension icon in your browser toolbar to access the timer and controls!')}
                className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-semibold hover:bg-blue-200 transition duration-200"
              >
                🔙 Back to Extension
              </button>
            </div>
          </div>

          {/* Right Column - Weekly Report & Blacklist */}
          <div className="space-y-6">
            {/* Weekly Report */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📊 Weekly Overview</h2>
                <button 
                  onClick={openWeeklyReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                >
                  📋 Full Report
                </button>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="hours" 
                    fill="url(#colorGradient)" 
                    radius={[6, 6, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Website Blacklist */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">🚫 Website Blacklist</h2>
              
              {/* Add new site */}
              <form onSubmit={addToBlacklist} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., facebook.com"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold transition"
                  >
                    Add
                  </button>
                </div>
              </form>

              {/* Blacklist items */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blacklist.map((site, index) => (
                  <div key={index} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-200">
                    <span className="text-gray-700 font-medium">{site}</span>
                    <button
                      onClick={() => removeFromBlacklist(site)}
                      className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
                      title="Remove from blacklist"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              {blacklist.length === 0 && (
                <p className="text-gray-500 text-center py-8">No blocked websites yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);