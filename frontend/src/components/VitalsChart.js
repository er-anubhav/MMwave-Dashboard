import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, Legend } from "recharts";

export default function VitalsChart({ currentHeartRate, currentRespiration }) {
 const [data, setData] = useState([]);

 useEffect(() => {
 if (data.length === 0) {
 setData(Array(30).fill({ heartRate: null, respiration: null }));
 }

 setData((prevData) => {
 const newData = [...prevData.slice(1), { 
 heartRate: currentHeartRate || null, 
 respiration: currentRespiration || null 
 }];
 return newData;
 });
 }, [currentHeartRate, currentRespiration]);

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
 <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#fff' }} />
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
 <div className="flex justify-between mt-2 text-sm text-gray-500 px-2 ">
 <span>30s ago</span>
 <span>Now</span>
 </div>
 </div>
 );
}
