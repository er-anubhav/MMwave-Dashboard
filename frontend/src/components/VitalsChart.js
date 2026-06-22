import { useEffect, useState, useRef } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, Legend } from "recharts";

export default function VitalsChart({ currentHeartRate, currentRespiration }) {
 const [data, setData] = useState([]);
 const vitalsRef = useRef({ heartRate: currentHeartRate, respiration: currentRespiration });

 useEffect(() => {
   vitalsRef.current = { heartRate: currentHeartRate, respiration: currentRespiration };
 }, [currentHeartRate, currentRespiration]);

 useEffect(() => {
   setData(Array.from({ length: 30 }, () => ({ heartRate: null, respiration: null })));

   const interval = setInterval(() => {
     setData((prevData) => {
       return [
         ...prevData.slice(1),
         {
           heartRate: vitalsRef.current.heartRate || null,
           respiration: vitalsRef.current.respiration || null
         }
       ];
     });
   }, 1000);

   return () => clearInterval(interval);
 }, []);

 return (
 <div className="w-full h-full pb-6">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data}>
 <YAxis 
 domain={[0, 150]} 
 hide={true}
 />
 <Tooltip 
 contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none' }}
 itemStyle={{ color: '#1C1917' }}
 labelStyle={{ display: 'none' }}
 />
 <Legend verticalAlign="top" height={36} iconType="circle" formatter={(value) => <span className="text-gray-700 dark:text-zinc-300 font-medium">{value}</span>} wrapperStyle={{ fontSize: '12px' }} />
 <Line 
 type="monotone" 
 dataKey="heartRate" 
 name="Heart Rate (bpm)"
 stroke="#ffcccc" 
 strokeWidth={3}
 dot={false}
 activeDot={{ r: 5, fill: "#ffcccc", strokeWidth: 0 }}
 animationDuration={300}
 connectNulls={true}
 />
 <Line 
 type="monotone" 
 dataKey="respiration" 
 name="Respiration (bpm)"
 stroke="#ffffff" 
 strokeWidth={3}
 dot={false}
 activeDot={{ r: 5, fill: "#ffffff", strokeWidth: 0 }}
 animationDuration={300}
 connectNulls={true}
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
