import { useEffect, useState, useRef } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

export default function ActivityChart({ currentActivity }) {
 const [data, setData] = useState([]);
 const activityRef = useRef(currentActivity);

 useEffect(() => {
   activityRef.current = currentActivity;
 }, [currentActivity]);

 useEffect(() => {
   setData(Array.from({ length: 30 }, () => ({ value: 0 })));

   const interval = setInterval(() => {
     setData((prevData) => {
       return [...prevData.slice(1), { value: activityRef.current || 0 }];
     });
   }, 1000);

   return () => clearInterval(interval);
 }, []);

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
 <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-zinc-400 px-2">
 <span>30s ago</span>
 <span>Now</span>
 </div>
 </div>
 );
}