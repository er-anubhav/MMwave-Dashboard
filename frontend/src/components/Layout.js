import React from 'react';
import Sidenav from './Sidenav';

export default function Layout({ children }) {
 return (
 <div className="min-h-screen bg-slate-50 relative isolate">
 <Sidenav />
 <div className="p-4 xl:ml-[266px] relative z-10 text-gray-900">
 {children}
 </div>
 </div>
 );
}
