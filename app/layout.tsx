import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title:'Waypoint — Intelligent Trip Planner', description:'Plan routes, itineraries and travel conditions with live internet data.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
