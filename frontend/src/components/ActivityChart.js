import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

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
 <div className="w-full h-full pb-6">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data}>
 <YAxis 
 domain={[0, 60]} 
 hide={true}
 />
 <Tooltip 
 contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none' }}
 itemStyle={{ color: '#1C1917' }}
 labelStyle={{ display: 'none' }}
 />
 <Line 
 type="monotone" 
 dataKey="value" 
 stroke="#ffffff" 
 strokeWidth={3}
 dot={{ r: 2, fill: "#ffffff", strokeWidth: 0 }}
 activeDot={{ r: 5, fill: "#ffffff", strokeWidth: 0 }}
 animationDuration={300}
 />
 </LineChart>
 </ResponsiveContainer>
 <div className="flex justify-between mt-2 text-sm text-gray-500 px-2 ">
 <span>30s ago</span>
 <span>Now</span>
 </div>
 </div>
 );
}