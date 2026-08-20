import React from 'react';
import { CloudRain, Wind, Thermometer, Droplets, ShieldCheck, Clock3, BrainCircuit, MapPinned, RefreshCw, AlertTriangle } from 'lucide-react';
import { MapContainer, Polygon, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Weather = { temperature:number; humidity:number; rainProbability:number; rain6h:number; wind:number; gust:number };
type GateTone = 'emerald' | 'amber' | 'rose';

const FARM = { lat: 10.018, lon: 76.305 };
const FIELD: [number, number][] = [[10.0200,76.3015],[10.0220,76.3040],[10.0210,76.3090],[10.0170,76.3105],[10.0148,76.3065],[10.0160,76.3020]];

function gate(w: Weather): { label:string; tone:GateTone; reason:string } {
  if (w.rainProbability >= 50 || w.rain6h >= 2) return { label:'HOLD — RAIN RISK', tone:'rose', reason:'Rain may wash off an application or create runoff.' };
  if (w.wind >= 15 || w.gust >= 25) return { label:'HOLD — DRIFT RISK', tone:'amber', reason:'Wind/gusts are too high for a conservative application window.' };
  if (w.temperature >= 35) return { label:'HOLD — HEAT RISK', tone:'amber', reason:'High temperature can increase crop stress and evaporation.' };
  return { label:'FAVOURABLE — VERIFY LABEL', tone:'emerald', reason:'Weather gate is favourable; operator must still verify crop, diagnosis and registered product label.' };
}

const gateStyle: Record<GateTone,string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10',
  amber: 'border-amber-500/30 bg-amber-500/10',
  rose: 'border-rose-500/30 bg-rose-500/10',
};

export const IntelligenceCenter: React.FC = () => {
  const [weather,setWeather] = React.useState<Weather|null>(null);
  const [loading,setLoading] = React.useState(true);
  const [error,setError] = React.useState('');
  const [updated,setUpdated] = React.useState('');

  const loadWeather = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // forecast_hours starts at the current forecast hour, unlike forecast_days,
      // which begins at midnight and can accidentally evaluate past conditions.
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${FARM.lat}&longitude=${FARM.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability,precipitation&forecast_hours=6&timezone=auto`;
      const r = await fetch(u);
      if (!r.ok) throw new Error(`Weather service returned ${r.status}`);
      const d = await r.json();
      const precipitation = (d.hourly?.precipitation ?? []).map((x:number)=>Number(x||0));
      const probabilities = (d.hourly?.precipitation_probability ?? []).map((x:number)=>Number(x||0));
      if (!d.current || precipitation.length === 0 || probabilities.length === 0) {
        throw new Error('Weather forecast is incomplete');
      }
      setWeather({
        temperature:Number(d.current.temperature_2m),
        humidity:Number(d.current.relative_humidity_2m),
        rainProbability:Math.max(...probabilities,0),
        rain6h:precipitation.reduce((a:number,b:number)=>a+b,0),
        wind:Number(d.current.wind_speed_10m),
        gust:Number(d.current.wind_gusts_10m),
      });
      setUpdated(new Date().toLocaleTimeString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Weather service unavailable');
    } finally {
      setLoading(false);
    }
  },[]);
  React.useEffect(()=>{void loadWeather();},[loadWeather]);

  const g = weather ? gate(weather) : null;
  const metrics = weather ? [
    ['RAIN',''+Math.round(weather.rainProbability)+'%',CloudRain],
    ['RAIN 6H',weather.rain6h.toFixed(1)+' mm',Droplets],
    ['WIND',Math.round(weather.wind)+' km/h',Wind],
    ['TEMP',Math.round(weather.temperature)+'°C',Thermometer],
  ] as const : [];

  return <div className="space-y-6 animate-in fade-in duration-500">
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-zinc-950 to-zinc-950 p-6 shadow-2xl">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400"><BrainCircuit size={15}/> AgriPrescribe Intelligence Core</div><h1 className="text-3xl font-black tracking-tight md:text-5xl">Treat less. Know more.</h1><p className="mt-2 max-w-2xl text-zinc-400">AI diagnosis + weather risk + time-based scouting + field intelligence. The system recommends when to investigate and when to hold—not an automatic pesticide dose.</p></div>
        <button onClick={()=>void loadWeather()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-bold hover:border-emerald-500/50 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={loading?'animate-spin':''}/> {loading?'Loading…':'Refresh weather'}</button>
      </div>
    </div>

    {error && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"><div className="flex items-center gap-2 font-bold"><AlertTriangle size={17}/> Live weather unavailable</div><p className="mt-1 text-rose-200/80">{error}. No spray-window decision is shown; retry before making an application decision.</p></div>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([name,value,Icon])=><div key={name} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:-translate-y-1 hover:border-emerald-500/30"><div className="flex items-center justify-between text-zinc-500"><span className="text-[11px] font-bold tracking-widest">{name}</span><Icon size={18}/></div><div className="mt-3 text-2xl font-black">{value}</div></div>)}</div>

    {g && <div className={`rounded-2xl border p-5 ${gateStyle[g.tone]}`}><div className="flex items-start gap-4"><ShieldCheck className="mt-1 shrink-0"/><div><div className="font-black tracking-wide">{g.label}</div><p className="mt-1 text-sm text-zinc-300">{g.reason}</p></div></div></div>}

    <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70"><div className="flex items-center justify-between border-b border-zinc-800 p-4"><div><h2 className="font-black">Field intelligence map</h2><p className="text-xs text-zinc-500">Prototype field polygon and scouting observations — not a road map</p></div><MapPinned className="text-emerald-400" size={19}/></div><div className="h-[430px]"><MapContainer center={[FARM.lat,FARM.lon]} zoom={16} scrollWheelZoom className="h-full w-full"><TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/><Polygon positions={FIELD} pathOptions={{color:'#34d399',fillColor:'#34d399',fillOpacity:.18,weight:3}}/><CircleMarker center={[10.019,76.306]} radius={10} pathOptions={{color:'#f59e0b',fillColor:'#f59e0b',fillOpacity:.8}}><Popup>Zone A · Monitor</Popup></CircleMarker><CircleMarker center={[10.018,76.308]} radius={10} pathOptions={{color:'#ef4444',fillColor:'#ef4444',fillOpacity:.8}}><Popup>Zone B · High attention</Popup></CircleMarker><CircleMarker center={[10.017,76.304]} radius={9} pathOptions={{color:'#22c55e',fillColor:'#22c55e',fillOpacity:.8}}><Popup>Zone C · Healthy</Popup></CircleMarker></MapContainer></div></section>

      <section className="space-y-4"><div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex items-center gap-2 text-emerald-400"><Clock3 size={18}/><h2 className="font-black text-zinc-100">Time-based scouting</h2></div><div className="mt-5 space-y-3">{[['06:30','Zone A','Routine survey','emerald'],['09:00','Zone B','Re-check disease pressure','rose'],['16:30','Zone C','Canopy & pest survey','amber']].map(([time,zone,text,tone])=><div key={time} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3"><div className="font-mono text-xs text-zinc-500">{time}</div><div className="h-2 w-2 rounded-full" style={{background:tone==='rose'?'#f43f5e':tone==='amber'?'#f59e0b':'#34d399'}}/><div><div className="text-sm font-bold">{zone}</div><div className="text-xs text-zinc-500">{text}</div></div></div>)}</div></div>
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex items-center gap-2 text-amber-400"><AlertTriangle size={18}/><h2 className="font-black">Decision chain</h2></div><ol className="mt-4 space-y-3 text-sm text-zinc-300">{['Capture clear crop image','Validate AI diagnosis & confidence','Check disease pressure and history','Check rain, wind, heat and leaf wetness','Verify label + operator approval','Authorize hardware only after all gates pass'].map((x,i)=><li key={x} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-800 text-xs font-black text-emerald-400">{i+1}</span>{x}</li>)}</ol></div></section>
    </div>
    <div className="text-right text-[11px] text-zinc-600">Weather updated {updated || '—'} · Forecast source: Open-Meteo · Weather is a decision-support signal, not a pesticide label.</div>
  </div>;
};
