import { useEffect, useState, useRef } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";

export default function MovementChart({ currentMovement }) {
 const [data, setData] = useState([]);
 const movementRef = useRef(currentMovement);

 useEffect(() => {
   movementRef.current = currentMovement;
 }, [currentMovement]);

 useEffect(() => {
   setData(Array.from({ length: 30 }, () => ({ value: 0 })));

   const interval = setInterval(() => {
     setData((prevData) => {
       return [...prevData.slice(1), { value: movementRef.current || 0 }];
     });
   }, 1000);

   return () => clearInterval(interval);
 }, []);

 return (
 <div className="w-full h-full pb-6">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={data}>
 <defs>
 <linearGradient id="movementGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4}/>
 <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <YAxis 
 domain={[0, 15]} 
 hide={true}
 />
 <Tooltip 
 contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none' }}
 itemStyle={{ color: '#1C1917' }}
 labelStyle={{ display: 'none' }}
 />
 <Area 
 type="monotone" 
 dataKey="value" 
 stroke="#ffffff" 
 strokeWidth={3}
 fill="url(#movementGradient)"
 animationDuration={300}
 activeDot={{ r: 6, fill: "#ffffff", strokeWidth: 0 }}
 />
 </AreaChart>
 </ResponsiveContainer>
 <div className="flex justify-between text-sm font-mono text-white/70 px-2 mt-2">
 <span>30s ago</span>
 <span>Now</span>
 </div>
 </div>
 );
}