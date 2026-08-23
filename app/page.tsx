'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
const MapView=dynamic(()=>import('../components/MapView'),{ssr:false,loading:()=> <div className="map-loading">Loading map…</div>});

type Stop={name:string;lat:number;lon:number;country?:string};
type Plan={origin:Stop;destination:Stop;route:any;weather:any[];days:any[];notes:string[]};

const interests=['Mountains','Beaches','Culture','Food','Adventure','Nature','Wellness','Nightlife','Photography','Road trip'];
const travelStyles=['Balanced','Slow travel','Packed','Scenic','Budget','Comfort'];

export default function Home(){
 const [origin,setOrigin]=useState('Delhi'); const [destination,setDestination]=useState('Manali');
 const [start,setStart]=useState(''); const [end,setEnd]=useState(''); const [style,setStyle]=useState('Balanced');
 const [mode,setMode]=useState('driving'); const [selected,setSelected]=useState<string[]>(['Mountains','Nature']);
 const [plan,setPlan]=useState<Plan|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 const toggle=(x:string)=>setSelected(s=>s.includes(x)?s.filter(i=>i!==x):[...s,x]);
 async function generate(){setLoading(true);setError(''); try{const r=await fetch('/api/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin,destination,start,end,style,mode,interests:selected})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Could not build the trip.'); setPlan(d);}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 const days=plan?.days||[];
 return <main>
  <header className="topbar"><div className="brand"><span className="mark">W</span><span>WAYPOINT</span></div><div className="tag">TRAVEL, WITH INTENTION.</div></header>
  <section className="hero"><div><p className="eyebrow">INTELLIGENT TRAVEL PLANNING</p><h1>Don’t just reach<br/><em>the destination.</em></h1><p className="hero-copy">Waypoint builds a route around how you want to travel — then checks the real-world conditions along the way.</p></div><div className="hero-orbit"><div className="orbit-card"><span>LIVE DATA</span><strong>Route + Weather</strong><small>Internet-connected planning</small></div></div></section>
  <section className="planner">
   <div className="planner-head"><div><p className="eyebrow">01 / YOUR JOURNEY</p><h2>Where are you going?</h2></div><div className="mode-tabs">{['driving','cycling','walking'].map(m=><button key={m} className={mode===m?'active':''} onClick={()=>setMode(m)}>{m}</button>)}</div></div>
   <div className="route-inputs"><label><span>FROM</span><input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Delhi"/></label><div className="arrow">→</div><label><span>TO</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Manali"/></label></div>
   <div className="date-row"><label><span>START</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><span>END</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><label><span>TRAVEL STYLE</span><select value={style} onChange={e=>setStyle(e.target.value)}>{travelStyles.map(x=><option key={x}>{x}</option>)}</select></label></div>
   <div className="interest"><div><p className="eyebrow">02 / WHAT MATTERS</p><h2>Shape the journey.</h2></div><div className="chips">{interests.map(x=><button key={x} className={selected.includes(x)?'chip selected':'chip'} onClick={()=>toggle(x)}>{x}</button>)}</div></div>
   <button className="generate" onClick={generate} disabled={loading}>{loading?'BUILDING YOUR WAYPOINT…':'BUILD MY WAYPOINT'}</button>
   {error&&<div className="error">{error}</div>}
  </section>
  {plan&&<section className="results">
   <div className="result-head"><div><p className="eyebrow">03 / YOUR WAYPOINT</p><h2>{plan.origin.name} <span>→</span> {plan.destination.name}</h2><p>{Math.round(plan.route.distanceKm)} km · {Math.round(plan.route.durationMin/60*10)/10} hr by {mode}</p></div><div className="conditions"><strong>{plan.weather[0]?.label||'Conditions checked'}</strong><span>{plan.weather[0]?.temp!=null?`${Math.round(plan.weather[0].temp)}°C`:''} · {plan.weather[0]?.description||''}</span></div></div>
   <div className="map-wrap"><MapView origin={plan.origin} destination={plan.destination} geometry={plan.route.geometry}/></div>
   <div className="route-stats"><div><small>DISTANCE</small><strong>{Math.round(plan.route.distanceKm)} km</strong></div><div><small>TRAVEL TIME</small><strong>{Math.floor(plan.route.durationMin/60)}h {Math.round(plan.route.durationMin%60)}m</strong></div><div><small>DATA</small><strong>Live web</strong></div><div><small>STYLE</small><strong>{style}</strong></div></div>
   <div className="conditions-grid"><div><p className="eyebrow">ROAD INTELLIGENCE</p><h3>What to watch</h3>{plan.notes.map((n,i)=><div className="note" key={i}><span>0{i+1}</span><p>{n}</p></div>)}</div><div><p className="eyebrow">FORECAST WINDOW</p><h3>Weather along the trip</h3><div className="weather-list">{plan.weather.map((w,i)=><div className="weather" key={i}><div><strong>{w.date}</strong><span>{w.description}</span></div><b>{Math.round(w.temp)}°</b></div>)}</div></div></div>
   <div className="itinerary"><p className="eyebrow">04 / SUGGESTED ITINERARY</p><h2>A route with room to breathe.</h2>{days.map((d:any,i:number)=><article key={i} className="day"><div className="day-no">{String(i+1).padStart(2,'0')}</div><div><h3>{d.title}</h3><p>{d.summary}</p><div className="activities">{d.activities.map((a:string)=><span key={a}>{a}</span>)}</div></div></article>)}</div>
  </section>}
  <footer><span>WAYPOINT</span><span>Built for travellers who care about the way there.</span></footer>
 </main>
}
