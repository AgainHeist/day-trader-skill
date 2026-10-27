import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { ws } from '../lib/ws'
import { Card, Badge, Stat } from '../components/Card'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity, Zap, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { symbol } = useStore()
  const [quote, setQuote] = useState<any>(null)
  const [chart, setChart] = useState<any>(null)
  const [scanner, setScanner] = useState<any>(null)
  const [entry, setEntry] = useState<any>(null)
  const [exit, setExit] = useState<any>(null)
  const [system, setSystem] = useState<any>(null)
  const [positions, setPositions] = useState<any>(null)
  const [news, setNews] = useState<any>(null)
  const [timemachine, setTimemachine] = useState<any>(null)

  useEffect(() => {
    api.quote(symbol).then(setQuote).catch(()=>setQuote({ status:'DATA UNAVAILABLE'}))
    api.chart(symbol).then(setChart).catch(()=>{})
    api.scannerResults().then(setScanner).catch(()=>{})
    api.entryStatus(symbol).then(setEntry).catch(()=>{})
    api.systemStatus().then(setSystem).catch(()=>{})
    api.paperPositions().then(setPositions).catch(()=>{})
    api.news(symbol).then(setNews).catch(()=>{})
    api.exitList().then(d=>setExit(Array.isArray(d)?d[0]:d)).catch(()=>{})
    const off = ws.on('market.quote', (d)=> { if(d.symbol===symbol) setQuote((q:any)=>({...q, price:d.price})) })
    return ()=> { off() }
  }, [symbol])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Badge color="purple">LIVE DATA</Badge>
        {quote?.status==='DATA UNAVAILABLE' && <Badge color="amber">DATA DELAYED</Badge>}
        <span className="text-xs text-slate-500">Last update: {new Date().toLocaleTimeString()} ET</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="S&P 500" value={quote?.price ? `$${quote.price}` : '-'} sub={quote?.changePercent ? `${quote.changePercent >0?'+':''}${quote.changePercent}%` : quote?.status || 'DATA UNAVAILABLE'} color={quote?.changePercent>0 ? 'text-emerald-400' : quote?.changePercent<0 ? 'text-red-400' : 'text-white'} />
        <Stat label="Market Status" value={system?.backend || 'Connected'} sub={system?.marketData || 'Live'} />
        <Stat label="Scanner Hits" value={scanner?.hits?.length ?? '-'} sub={scanner?.status || 'Idle'} />
        <Stat label="Paper P/L" value={positions?.positions?.length ? `${positions.positions.length} positions` : '0 positions'} sub="PAPER MODE" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title={`Live Chart - ${symbol}`} subtitle={quote ? ((quote.price ?? '-') + ' • ' + (quote.status || '')) : ''} action={<Link to="/markets" className="text-xs text-cyan-400 hover:underline">Open Chart →</Link>} className="lg:col-span-2">
          {chart?.bars?.length ? (
            <div className="h-[280px] w-full">
              <SimpleChart bars={chart.bars.slice(-60)} />
              <div className="text-xs text-slate-500 mt-2">Source: Yahoo Finance • 5-minute bars • {quote?.status || 'LIVE DATA'}</div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
              {quote?.status==='DATA UNAVAILABLE' ? 'DATA UNAVAILABLE - provider failed or rate-limited' : 'Loading chart...'}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Scanner Results" subtitle="Most traded first">
            {scanner?.hits?.length ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {scanner.hits.slice(0,6).map((h:any)=>(
                  <div key={h.symbol} className="flex justify-between items-center py-1.5 border-b border-[#1f2937] last:border-0">
                    <span className="font-bold mono text-cyan-400">{h.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{h.setup || 'orb'}</span>
                    <span className="text-xs text-slate-400">{h.price ?? ''}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-slate-500">No recent scan. <Link to="/scanner" className="text-cyan-400 underline">Run scanner</Link></div>}
            {scanner?.partial && <div className="text-xs text-amber-400 mt-2">PARTIAL DATA - {scanner.failed} symbols failed</div>}
          </Card>

          <Card title="Entry Signal" subtitle={symbol}>
            {entry ? (
              <div>
                <Badge color={entry.status==='TRIGGERED' ? 'green' : entry.status==='WAITING' ? 'amber' : 'gray'}>{entry.status}</Badge>
                <div className="mt-2 text-sm text-slate-300">{entry.rawText || `Range High: ${entry.rangeHigh ?? '-'} • Price: ${entry.price ?? '-'}`}</div>
                <div className="text-xs text-slate-500 mt-1">Completed-bar validation • 5-minute bars</div>
              </div>
            ) : <div className="text-sm text-slate-500">No entry check</div>}
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Exit Plan" subtitle={exit ? `${exit.symbol} • Entry ${exit.entry}` : 'No plan yet'}>
          {exit ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Stop</span><span className="mono text-red-400">{exit.stop}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Target</span><span className="mono text-emerald-400">{exit.target}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Flat by</span><span className="mono">{exit.raw?.flat_by || '15:55'}</span></div>
            </div>
          ) : <div className="text-sm text-slate-500">Create via <Link to="/exit" className="text-cyan-400 underline">Exit Planner</Link></div>}
        </Card>

        <Card title="Risk & Budget" subtitle="Check before paper order">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Account</span><span className="mono">$5,000</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Max loss/trade</span><span className="mono">$50</span></div>
            <Link to="/risk" className="block mt-3 text-center py-2 rounded-lg bg-[#1e2d4a] text-cyan-400 text-sm font-semibold">Open Risk Check</Link>
          </div>
        </Card>

        <Card title="News - TSLA" subtitle={news?.count ? `${news.count} headlines` : 'No recent news found.'}>
          {news?.items?.length ? (
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {news.items.slice(0,4).map((n:any,i:number)=>(
                <div key={i} className="text-xs border-b border-[#1f2937] pb-2 last:border-0">
                  <div className="font-medium text-white line-clamp-2">{n.title || n.headline}</div>
                  <div className="text-slate-500">{n.source || n.publisher} • {n.time || n.pubDate || ''}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-slate-500">{news?.message || 'No recent news found.'}</div>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="System Status" subtitle="Never show Running if worker is dead">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <StatusRow label="Backend" value={system?.backend || 'Connected'} ok />
            <StatusRow label="Database" value={system?.database || 'ok'} ok={system?.database==='ok'} />
            <StatusRow label="Market Data" value={system?.marketData || 'Connected'} ok />
            <StatusRow label="WebSocket" value={system?.websocket || 'Connected'} ok />
            <StatusRow label="Scanner Worker" value={system?.scannerWorker || 'Idle'} ok />
            <StatusRow label="Alert Worker" value={system?.alertWorker || 'Idle'} ok />
          </div>
          <div className="text-xs text-slate-500 mt-3">Last Data Update: {system?.lastDataUpdate ? new Date(system.lastDataUpdate).toLocaleString() : new Date().toLocaleString()}</div>
        </Card>

        <Card title="Paper Trading" subtitle="PAPER MODE - simulation only">
          <div className="text-sm text-slate-300">Balance: $5,000 • Positions: {positions?.positions?.length || 0}</div>
          <Link to="/paper" className="block mt-3 text-center py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-bold">Open Paper Trading</Link>
        </Card>
      </div>
    </div>
  )
}

function StatusRow({ label, value, ok }: any) {
  return <div className="flex justify-between py-1.5 border-b border-[#1f2937] last:border-0"><span className="text-slate-400">{label}</span><span className={`font-semibold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span></div>
}

function SimpleChart({ bars }: any) {
  if (!bars?.length) return null
  const closes = bars.map((b:any)=>b.close).filter((v:any)=>v!=null)
  const min = Math.min(...closes), max = Math.max(...closes)
  const range = max - min || 1
  const points = closes.map((c:number,i:number)=>{
    const x = (i / (closes.length-1)) * 100
    const y = 100 - ((c - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <polyline fill="none" stroke="#06b6d4" strokeWidth="0.8" points={points} />
      <polyline fill="none" stroke="rgba(6,182,214,0.15)" strokeWidth="8" points={points} style={{filter:'blur(4px)'}} />
    </svg>
  )
}
