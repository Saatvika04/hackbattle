import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Add this line to let TypeScript know about the chrome global
declare const chrome: any;

interface DailyData {
  category: string;
  minutes: number;
  percentage: number;
}

function Popup() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [focusTime, setFocusTime] = useState(0); // minutes focused today
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [dailyData, setDailyData] = useState<DailyData[]>([
    { category: "Development", minutes: 45, percentage: 40 },
    { category: "Social Media", minutes: 30, percentage: 27 },
    { category: "Learning", minutes: 25, percentage: 22 },
    { category: "Other", minutes: 12, percentage: 11 }
  ]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load data from Chrome storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const today = new Date().toDateString();
      chrome.storage.local.get([today], (result: any) => {
        if (result[today]) {
          const todayData = result[today];
          setFocusTime(Math.round(todayData.totalTime / 1000 / 60)); // Convert to minutes
          
          // Convert time by category to daily data
          const categories = Object.entries(todayData.timeByCategory || {});
          const total = todayData.totalTime || 1;
          const newDailyData = categories.map(([category, time]: [string, any]) => ({
            category,
            minutes: Math.round(time / 1000 / 60),
            percentage: Math.round((time / total) * 100)
          }));
          
          if (newDailyData.length > 0) {
            setDailyData(newDailyData);
          }
        }
      });
    }
  }, []);

  // Timer functionality
  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
    // You can add logic here to communicate with background script
    if (chrome.runtime) {
      chrome.runtime.sendMessage({
        type: isTimerActive ? 'STOP_TIMER' : 'START_TIMER'
      });
    }
  };

  // Calculate focus score
  const productiveCategories = ['Development', 'Learning', 'Research', 'Communication'];
  const productiveTime = dailyData
    .filter(item => productiveCategories.includes(item.category))
    .reduce((sum, item) => sum + item.minutes, 0);
  
  const totalMinutes = dailyData.reduce((sum, item) => sum + item.minutes, 0);
  const focusScore = totalMinutes > 0 ? Math.round((productiveTime / totalMinutes) * 100) : 100;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-80 h-96 bg-white p-4 rounded-lg shadow-lg overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-gray-800">FocusTracker</h1>
        <div className="text-sm text-gray-600">{formatTime(currentTime)}</div>
      </div>

      {/* Focus Score Circle */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20">
          <CircularProgressbar
            value={focusScore}
            text={`${focusScore}%`}
            styles={buildStyles({
              textSize: "16px",
              pathColor: focusScore >= 70 ? "#10B981" : focusScore >= 50 ? "#F59E0B" : "#EF4444",
              textColor: "#1F2937",
              trailColor: "#E5E7EB",
            })}
          />
        </div>
      </div>

      {/* Today's Stats */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">Today's Focus Time</p>
        <p className="text-xl font-semibold text-gray-800">{focusTime} minutes</p>
        <p className="text-xs text-gray-500">Focus Score: {focusScore}%</p>
      </div>

      {/* Timer Controls */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
            isTimerActive 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isTimerActive ? 'Pause Tracking' : 'Start Tracking'}
        </button>
      </div>

      {/* Daily Report Toggle */}
      <button
        onClick={() => setShowDailyReport(!showDailyReport)}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm mb-3"
      >
        {showDailyReport ? "Hide" : "Show"} Daily Report
      </button>

      {/* Daily Report */}
      {showDailyReport && (
        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Today's Breakdown</h3>
          <div className="space-y-2">
            {dailyData.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                    }}
                  ></div>
                  <span className="text-gray-600">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-800">{item.minutes}m</span>
                  <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
          
          {totalMinutes > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Time:</span>
                <span>{totalMinutes} minutes</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Popup;