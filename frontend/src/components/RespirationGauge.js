import { useEffect, useState, useRef } from "react";
import { BarChart, Bar, ResponsiveContainer, YAxis, Cell } from "recharts";

export default function RespirationGauge({ currentRate }) {
 const [data, setData] = useState([]);
 const rateRef = useRef(currentRate);

 useEffect(() => {
   rateRef.current = currentRate;
 }, [currentRate]);

 useEffect(() => {
   setData(Array.from({ length: 20 }, () => ({ value: 0 })));

   const interval = setInterval(() => {
     setData((prevData) => {
       return [...prevData.slice(1), { value: rateRef.current || 0 }];
     });
   }, 1000);

   return () => clearInterval(interval);
 }, []);

 const getColor = (value) => {
 if (value >= 12 && value <= 18) {
 return "#16A34A"; // Normal range - green
 } else if (value > 18 && value <= 20) {
 return "#F59E0B"; // Elevated - amber
 } else if (value > 0) {
 return "#DC2626"; // Abnormal - red
 }
 return "#E7E5E4"; // No data - gray
 };

 return (
 <div className="h-48">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data}>
 <YAxis 
 domain={[0, 25]} 
 hide={true}
 />
 <Bar 
 dataKey="value" 
 radius={3}
 animationDuration={300}
 >
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 <div className="flex justify-between text-sm text-gray-400">
 <span>0</span>
 <span>40 bpm</span>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-[#16A34A]"></div>
 <span className="text-[#78716C]">Normal (12-18)</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-[#F59E0B]"></div>
 <span className="text-[#78716C]">Elevated</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-[#DC2626]"></div>
 <span className="text-[#78716C]">Abnormal</span>
 </div>
 </div>
 </div>
 );
}