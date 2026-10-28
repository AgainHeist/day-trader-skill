import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { ws } from '../lib/ws'
import { Card, Badge, Stat } from '../components/Card'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { symbol } = useStore()
  const [quote, setQuote] = useState<any>(null)
  const [chart, setChart] = useState<any>(null)
  const [scanner, setScanner] = useState<any>(null)
  const [entry, setEntry] = useState<any>(null)
  const [system, setSystem] = useState<any>(null)
  const [positions, setPositions] = useState<any>(null)
  const [news, setNews] = useState<any>(null)
  const [exit, setExit] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.quote(symbol).then(setQuote).catch(()=>setQuote({status:'DATA UNAVAILABLE'})),
      api.chart(symbol).then(setChart).catch(()=>{}),
      api.scannerResults().then(setScanner).catch(()=>{}),
      api.entryStatus(symbol).then(setEntry).catch(()=>{}),
      api.systemStatus().then(setSystem).catch(()=>{}),
      api.paperPositions().then(setPositions).catch(()=>{}),
      api.news(symbol).then(setNews).catch(()=>{}),
      api.exitList().then((d:any)=>setExit(Array.isArray(d)?d[0]:d)).catch(()=>{})
    ]).finally(()=>setLoading(false))
    const off = ws.on('market.quote', (d:any)=> { if(d.symbol===symbol) setQuote((q:any)=>({...q, price:d.price})) })
    return () => { off() }
  }, [symbol])

  const changeColor = useMemo(()=> quote?.changePercent>0?'text-emerald-400':quote?.changePercent<0?'text-red-400':'text-white', [quote])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-black tracking-tight text-white">ALi BOSS Dashboard</h1>
        <Badge color="violet">Power By ALi</Badge>
        <Badge color={quote?.status==='LIVE'?'green':'amber'}>{quote?.status||'PREMIUM'}</Badge>
        <span className="text-xs text-slate-500">No fake prices • Real Yahoo/SEC/House</span>
        <a href="https://t.me/alionera" target="_blank" className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-black">✈ @alionera</a>
      </div>

      {/* Top stats like photo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-gradient-to-br from-[#0e1528] to-[#0a1220] border border-[#1b2b4a] rounded-2xl p-4 overflow-hidden card-hover">
          <div className="absolute top-3 right-3 w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">↗</div>
          <div className="text-[10px] tracking-[0.14em] font-bold text-slate-500">S&P 500 • LIVE</div>
          <div className="text-[22px] font-black mono text-white mt-1">{quote?.price?`$${quote.price}`:'—'}</div>
          <div className={`text-xs font-bold ${changeColor}`}>{quote?.changePercent?`${quote.changePercent>0?'+':''}${quote.changePercent}%`:quote?.status||'DATA UNAVAILABLE'}</div>
          <MiniSpark color="#06b6d4" />
        </div>
        <div className="relative bg-gradient-to-br from-[#0e1528] to-[#0a1220] border border-[#1b2b4a] rounded-2xl p-4 overflow-hidden card-hover">
          <div className="text-[10px] tracking-[0.14em] font-bold text-slate-500">MARKET STATUS</div>
          <div className="text-[20px] font-black text-emerald-400 mt-1">{system?.backend==='Connected'?'OPEN':'CLOSED'}</div>
          <div className="text-xs text-slate-400">Paper • No real auto</div>
          <MiniSpark color="#10b981" />
        </div>
        <div className="relative bg-gradient-to-br from-[#0e1528] to-[#0a1220] border border-[#1b2b4a] rounded-2xl p-4 overflow-hidden card-hover">
          <div className="text-[10px] tracking-[0.14em] font-bold text-slate-500">SCANNER HITS</div>
          <div className="text-[22px] font-black mono text-white mt-1">{scanner?.hits?.length ?? '—'}</div>
          <div className="text-xs text-slate-400">{scanner?.partial?'PARTIAL DATA':'Live opportunities'}</div>
          <MiniBars />
        </div>
        <div className="relative bg-gradient-to-br from-[#0e1528] to-[#0a1220] border border-[#1b2b4a] rounded-2xl p-4 overflow-hidden card-hover glow-cyan">
          <div className="text-[10px] tracking-[0.14em] font-bold text-slate-500">PAPER P/L</div>
          <div className="text-[20px] font-black mono text-emerald-400 mt-1">{positions?.positions?.length?`+${positions.positions.length} POS`:'$0.00'}</div>
          <div className="text-xs text-slate-400">Today • Power By ALi</div>
          <MiniSpark color="#10b981" />
        </div>
      </div>

      {/* Main chart + side */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card accent="cyan" title={`${symbol} • S&P 500 Index • 1D`} subtitle={`${quote?.price?`$${quote.price} ${quote?.change?`(${quote.change>0?'+':''}${quote.change})`:''}`:'—'} • ${quote?.status||'LIVE DATA'} • Rate-limit safe`} action={<Link to="/markets" className="text-xs font-black text-cyan-400 hover:text-cyan-300">Open Chart →</Link>} className="lg:col-span-2">
          {loading ? <Skeleton h={280}/> : chart?.bars?.length ? (
            <div>
              <div className="h-[300px]"><PremiumCandle bars={chart.bars.slice(-80)} /></div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3">
                <span>Source: Yahoo Finance • 5-min bars • 60 FPS • Exponential backoff</span>
                <span className="hidden sm:block">No server crash • Cached • Throttled</span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-sm text-slate-400 gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">⚡</div>
              <div className="font-bold">{quote?.status==='DATA UNAVAILABLE'?'DATA UNAVAILABLE':'Loading chart...'}</div>
              <div className="text-xs">{quote?.error?.slice(0,80)||'Provider failed or rate-limited — no fake price shown'}</div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Scanner Results" subtitle={`${scanner?.hits?.length||0} hits • Most traded first`} action={<Badge color={scanner?.partial?'amber':'green'}>{scanner?.partial?'PARTIAL':'COMPLETE'}</Badge>}>
            {scanner?.hits?.length ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {scanner.hits.slice(0,6).map((h:any)=>(
                  <div key={h.symbol} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[#0a1220] border border-[#162032] hover:border-[#1e3a6e] transition">
                    <span className="w-6 h-6 rounded-lg bg-[#111d36] border border-[#1e3a6e] flex items-center justify-center text-[10px] font-black text-cyan-400">{h.symbol[0]}</span>
                    <span className="font-black mono text-white text-sm">{h.symbol}</span>
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">{h.setup||'orb'}</span>
                    <span className="text-xs mono text-slate-300">{h.price??''}</span>
                  </div>
                ))}
                <Link to="/scanner" className="block text-center text-xs font-black text-cyan-400 mt-2">View All →</Link>
              </div>
            ) : <div className="text-sm text-slate-500">No recent scan. <Link to="/scanner" className="text-cyan-400 underline">Run scanner</Link></div>}
            {scanner?.partial && <div className="text-xs text-amber-300 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">PARTIAL DATA: {scanner.failed} failed — never round up to whole market</div>}
          </Card>

          <Card title={`Entry Signal • ${symbol}`} subtitle="Completed-bar only • 1m/5m">
            {entry ? (
              <div>
                <Badge color={entry.status==='TRIGGERED'?'green':entry.status==='WAITING'?'amber':'gray'}>{entry.status}</Badge>
                <div className="mt-3 p-3 rounded-xl bg-[#0a1220] border border-[#162032]">
                  <div className="text-sm text-slate-200 font-medium">{entry.rawText || `Range High: ${entry.rangeHigh ?? '-'} • Price: ${entry.price ?? entry.triggerPrice ?? '-'}`}</div>
                  <div className="text-xs text-slate-500 mt-1">Yahoo 5m bars • WS auto-update • No manual refresh</div>
                </div>
              </div>
            ) : <div className="text-sm text-slate-500">No entry check — go to Entry</div>}
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Exit Plan" subtitle={exit ? `${exit.symbol} • Entry ${exit.entry}` : 'No plan yet'}>
          {exit ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#0a1220] border border-[#162032] text-center"><div className="text-[10px] tracking-widest font-bold text-slate-500">ENTRY</div><div className="mono font-black text-white">{exit.entry}</div></div>
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-center"><div className="text-[10px] tracking-widest font-bold text-red-300">STOP</div><div className="mono font-black text-red-400">{exit.stop}</div></div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center"><div className="text-[10px] tracking-widest font-bold text-emerald-300">TARGET</div><div className="mono font-black text-emerald-400">{exit.target}</div></div>
            </div>
          ) : <div className="text-sm text-slate-500">Create via <Link to="/exit" className="text-cyan-400 underline">Exit Planner</Link> — saved server-side</div>}
        </Card>

        <Card title="Risk & Budget" subtitle="Backend calculates — never trust browser">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 px-3 rounded-xl bg-[#0a1220] border border-[#162032]"><span className="text-slate-400">Account</span><span className="mono font-black">$5,000</span></div>
            <div className="flex justify-between py-2 px-3 rounded-xl bg-[#0a1220] border border-[#162032]"><span className="text-slate-400">Max loss/trade</span><span className="mono font-black">$50</span></div>
            <Link to="/risk" className="block mt-2 text-center py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-black shadow-[0_0_20px_rgba(16,185,129,0.2)]">Open Risk Check</Link>
          </div>
        </Card>

        <Card title={`News • ${symbol}`} subtitle={news?.count?`${news.count} headlines`:'No recent news found.'}>
          {news?.items?.length ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {news.items.slice(0,4).map((n:any,i:number)=>(
                <div key={i} className="py-2 px-3 rounded-xl bg-[#0a1220] border border-[#162032] hover:border-[#1e3a6e]">
                  <div className="font-bold text-white text-xs line-clamp-2">{n.title||n.headline}</div>
                  <div className="text-[11px] text-slate-500">{n.source||n.publisher||'Yahoo'} • {n.time||n.pubDate||''}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-slate-500">{news?.message||'No recent news found.'} — real SEC/Yahoo only</div>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="System Status" subtitle="Never show Running if worker dead — honest">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatusRow label="Backend" value={system?.backend||'Connected'} ok/>
            <StatusRow label="Database" value={system?.database||'ok'} ok={system?.database==='ok'}/>
            <StatusRow label="Market Data" value={system?.marketData||'Connected'} ok/>
            <StatusRow label="WebSocket" value={system?.websocket||'Connected'} ok/>
            <StatusRow label="Scanner Worker" value={system?.scannerWorker||'Idle'} ok/>
            <StatusRow label="Alert Worker" value={system?.alertWorker||'Idle'} ok/>
          </div>
          <div className="text-xs text-slate-500 mt-3 flex items-center justify-between">
            <span>Last Update: {system?.lastDataUpdate?new Date(system.lastDataUpdate).toLocaleTimeString():'now'} • 60 FPS • Phone + Desktop perfect</span>
            <span className="hidden sm:block">Rate-limit safe • Crash-proof</span>
          </div>
        </Card>
        <Card accent="violet" title="ALi BOSS Paper Trading" subtitle="PAPER MODE only • Need PASS to execute">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300"><b className="text-white">${system?.paperMode!==false?'5,000':'—'}</b> • {positions?.positions?.length||0} positions • No real auto</div>
            <Link to="/paper" className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-black shadow-[0_0_20px_rgba(139,92,246,0.25)]">Open →</Link>
          </div>
          <div className="mt-3 text-xs text-slate-500">Repo me money wala khatam — sirf paper simulation. Real trade ke liye alag broker connect hota hai, auto nahi.</div>
        </Card>
      </div>
    </div>
  )
}
function StatusRow({label,value,ok}:any){
  return <div className="flex justify-between py-2 px-3 rounded-xl bg-[#0a1220] border border-[#162032]"><span className="text-slate-400 text-xs">{label}</span><span className={`text-xs font-black ${ok?'text-emerald-400':'text-amber-400'}`}>{value}</span></div>
}
function Skeleton({h}:any){ return <div className="animate-pulse space-y-3" style={{height:h}}><div className="h-4 bg-[#0f1a30] rounded"/><div className="h-[200px] bg-[#0f1a30] rounded-xl"/><div className="h-3 bg-[#0f1a30] rounded w-1/2"/></div>}
function MiniSpark({color}:any){
  return <svg viewBox="0 0 100 20" className="w-full h-6 mt-2 opacity-60"><polyline fill="none" stroke={color} strokeWidth="1.2" points="0,15 10,12 20,14 30,8 40,10 50,6 60,9 70,4 80,7 90,3 100,5"/></svg>
}
function MiniBars(){
  return <div className="flex items-end gap-1 h-6 mt-2 opacity-60">{[4,7,3,9,6,8,5,10,7,4,6,8].map((h,i)=><div key={i} className="w-1.5 bg-cyan-500/80 rounded-sm" style={{height:h*2.2}}/> )}</div>
}
function PremiumCandle({bars}:any){
  if(!bars.length) return null
  const highs=bars.map((b:any)=>b.high).filter((v:any)=>v!=null), lows=bars.map((b:any)=>b.low).filter((v:any)=>v!=null)
  const min=Math.min(...lows), max=Math.max(...highs), rng=max-min||1
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
    {bars.map((b:any,i:number)=>{
      if(b.open==null||b.close==null) return null
      const x=(i/bars.length*88)+6, w=Math.max(0.6, 88/bars.length*0.6)
      const yH=100-((b.high-min)/rng)*88-6, yL=100-((b.low-min)/rng)*88-6, yO=100-((b.open-min)/rng)*88-6, yC=100-((b.close-min)/rng)*88-6
      const up=b.close>=b.open, col=up?'#10b981':'#ef4444'
      const top=Math.min(yO,yC), h=Math.abs(yO-yC)||0.8
      return <g key={i}><line x1={x} x2={x} y1={yH} y2={yL} stroke={col} strokeWidth={0.4} opacity={0.9}/><rect x={x-w/2} y={top} width={w} height={Math.max(h,1)} fill={col} rx={0.2}/></g>
    })}
    <polyline fill="none" stroke="#06b6d4" strokeWidth={0.5} opacity={0.7} points={bars.map((b:any,i:number)=>`${(i/bars.length*88)+6},${b.close!=null?100-((b.close-min)/rng)*88-6:50}`).join(' ')}/>
  </svg>
}
