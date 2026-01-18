import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export default function ActivityChart({ currentActivity }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Initialize with 30 data points
    if (data.length === 0) {
      setData(Array(30).fill({ value: 0 }));
    }

    // Add new data point
    setData((prevData) => {
      const newData = [...prevData.slice(1), { value: currentActivity }];
      return newData;
    });
  }, [currentActivity]);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis 
            domain={[0, 60]} 
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#1C1917" 
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-between mt-2 text-xs font-mono text-[#78716C]">
        <span>30s ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}