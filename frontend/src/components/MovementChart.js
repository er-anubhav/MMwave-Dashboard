import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

export default function MovementChart({ currentMovement }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Initialize with 30 data points
    if (data.length === 0) {
      setData(Array(30).fill({ value: 0 }));
    }

    // Add new data point
    setData((prevData) => {
      const newData = [...prevData.slice(1), { value: currentMovement }];
      return newData;
    });
  }, [currentMovement]);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="movementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis 
            domain={[0, 15]} 
            hide={true}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#4F46E5" 
            strokeWidth={2}
            fill="url(#movementGradient)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between mt-2 text-xs font-mono text-[#78716C]">
        <span>30s ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}