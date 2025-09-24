import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./main.css";

// Dummy weekly data (frontend only)
const weeklyData = [
  { day: "Mon", hours: 2 },
  { day: "Tue", hours: 3 },
  { day: "Wed", hours: 1.5 },
  { day: "Thu", hours: 4 },
  { day: "Fri", hours: 2.5 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 3 },
];

function App() {
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState("");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
        alert(`LockedIn!
    Task: ${task}
    Duration: ${duration} minutes`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-8">
        {/* App Name */}
        <h1 className="text-5xl font-bold text-blue-600 text-center">LockedIn</h1>

        {/* Task & Duration Form */}
        <form onSubmit={handleStart} className="space-y-4">
          {/* Task Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 text-center">
              What is your task?
            </label>
            <input
              type="text"
              placeholder="e.g., Research movies for project"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* Duration Input */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 text-center">
              How long do you want to focus? (minutes)
            </label>
            <input
              type="number"
              placeholder="e.g., 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-center focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* Start/Schedule Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Start / Schedule Focus Time
          </button>
        </form>

        {/* Weekly Report Section */}
        <div className="bg-gray-50 rounded-xl p-4 shadow-inner">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Weekly Report
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Settings Button */}
        <div className="text-center">
          <a
            href="options.html"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
          >
            Go to Settings
          </a>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);