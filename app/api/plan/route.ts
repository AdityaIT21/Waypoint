import {NextRequest,NextResponse} from 'next/server';
type WeatherDay = {
  date: string;
  description: string;
  temp: number;
  min: number;
  rain: number;
};
const headers={'User-Agent':'Waypoint/2.0 travel planner (demo)'};
async function geocode(q:string){
  const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const r=await fetch(u,{headers,cache:'no-store'});
                                 if(!r.ok)throw new Error('Geocoding service unavailable.');
                                 const d=await r.json();
                                 if(!d[0])throw new Error(`Could not find “${q}”. Try a city, landmark or region.`);
                                 return {name:d[0].display_name.split(',')[0],lat:+d[0].lat,lon:+d[0].lon,country:d[0].display_name};
                                }
async function route(a:any,b:any,mode:string){const profile=mode==='cycling'?'bike':mode==='walking'?'foot':'car';
                                              const u=`https://router.project-osrm.org/route/v1/${profile}/${a.lon},${a.lat};
                                              ${b.lon},${b.lat}?overview=full&geometries=geojson`;
                                              const r=await fetch(u,{cache:'no-store'});
                                              if(!r.ok)throw new Error('Routing service unavailable.');
                                              const d=await r.json();
                                              if(d.code!=='Ok')throw new Error('No route found for those locations.');
                                              return {distanceKm:d.routes[0].distance/1000,durationMin:d.routes[0].duration/60,geometry:d.routes[0].geometry.coordinates};
                                             }
async function weather(p:any): Promise<WeatherDay[]> {
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const r=await fetch(u,{cache:'no-store'});
  if(!r.ok) return []; const d=await r.json();
  const labels:any={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Heavy showers',95:'Thunderstorm'};
  return d.daily.time.slice(0, 7).map(
  (date: string, i: number): WeatherDay => ({
    date,
    description:
      labels[d.daily.weather_code[i]] || 'Mixed conditions',
    temp: d.daily.temperature_2m_max[i],
    min: d.daily.temperature_2m_min[i],
    rain: d.daily.precipitation_probability_max[i],
  })
);
}
function makeDays(a:any,b:any,style:string,interests:string[],distance:number,start?:string,end?:string){let n=Math.max(1,Math.min(7,Math.ceil(distance/250))); if(start&&end){const diff=Math.round((new Date(end).getTime()-new Date(start).getTime())/86400000)+1; if(diff>0) n=Math.min(14,diff);}const primary=interests.length?interests:['Nature'];return Array.from({length:n},(_,i)=>({title:i===0?`Arrive in ${a.name}`:i===n-1?`Reach ${b.name}`:`Day ${i+1} — explore at your pace`,summary:i===0?`Settle in, orient yourself and keep the first day deliberately light.`:i===n-1?`Make the final approach part of the experience rather than a transfer.`:`A ${style.toLowerCase()} day shaped around ${primary[i%primary.length].toLowerCase()}.`,activities:[primary[i%primary.length],style==='Slow travel'?'Long lunch':'Local food',i%2?'Scenic stop':'Neighbourhood walk']}));}
export async function POST(req:NextRequest){try{const body=await req.json();if(!body.origin||!body.destination) return NextResponse.json({error:'Origin and destination are required.'},{status:400});const [a,b]=await Promise.all([geocode(body.origin),geocode(body.destination)]);const r=await route(a,b,body.mode||'driving');const weatherData=await weather(b);const notes:string[]=[];const wet = weatherData.filter((x: WeatherDay) => x.rain >= 60).length; if(wet) notes.push(`${wet} day(s) in the forecast have a 60%+ precipitation probability. Keep outdoor plans flexible.`); else notes.push('No major precipitation signal in the 7-day destination forecast. Conditions can change beyond the forecast window.'); if(r.distanceKm>500) notes.push('This is a long overland transfer. Consider breaking the route into an overnight stop rather than treating it as a single travel day.'); else notes.push('Route distance is manageable as a single transfer, but scenic stops can change the practical travel time.'); notes.push('Live road-closure and traffic data is not included by the free routing endpoint; check local authority or navigation data before departure.');return NextResponse.json({origin:a,destination:b,route:r,weather:weatherData.map((x: WeatherDay)=>({...x,label:x.rain>=60?'Rain risk':'Favourable'})),notes,days:makeDays(a,b,body.style||'Balanced',body.interests||[],r.distanceKm,body.start,body.end)});}catch(e:any){return NextResponse.json({error:e.message||'Unexpected error.'},{status:500});}}
