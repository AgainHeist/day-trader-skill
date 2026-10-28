import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ws } from '../lib/ws'
import { useStore } from '../lib/store'
import { Card, Badge } from '../components/Card'

export default function Entry() {
  const { symbol } = useStore()
  const [sym, setSym] = useState(symbol)
  const [setup, setSetup] = useState('orb')
  const [interval, setInterval] = useState('5m')
  const [level, setLevel] = useState('')
  const [result, setResult] = useState<any>(null)
  const [watching, setWatching] = useState(false)

  useEffect(()=>{
    const off = ws.on('entry.updated', (d:any)=> { if(d.symbol===sym.toUpperCase()) setResult(d.data || d) })
    const off2 = ws.on('entry.triggered', (d:any)=> { if(d.symbol===sym.toUpperCase()) { setResult(d.data || d); setWatching(false) }})
    return ()=> { off(); off2() }
  }, [sym])

  const check = async () => {
    const body:any = { symbol: sym, setup, interval, orMinutes: 15 }
    if (setup==='level' && level) body.level = parseFloat(level)
    try { const res = await api.entryCheck(body); setResult(res) } catch(e:any){ setResult({status:'NO DATA', error:e.message}) }
  }
  const watch = async () => {
    try { await api.entryWatch({ symbol: sym, setup, interval, every: 10 }); setWatching(true) } catch(e:any){ setResult({status:'NO DATA', error:e.message}) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <h1 className="text-2xl font-bold text-white">Entry Timer</h1>
        <Badge color="cyan">1m / 5m • Completed-bar validation</Badge>
        <Badge color="amber">Only completed bars trigger</Badge>
      </div>
      <Card title="Check Entry" subtitle="A price poking above level intra-candle is NOT an entry. Only CLOSED above level.">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="text-xs text-slate-400">Symbol</label><input value={sym} onChange={e=>setSym(e.target.value.toUpperCase())} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" /></div>
          <div><label className="text-xs text-slate-400">Setup</label><select value={setup} onChange={e=>setSetup(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white"><option value="orb">ORB</option><option value="level">Level</option></select></div>
          <div><label className="text-xs text-slate-400">Interval</label><select value={interval} onChange={e=>setInterval(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white"><option value="5m">5m</option><option value="1m">1m</option></select></div>
          {setup==='level' && <div><label className="text-xs text-slate-400">Level</label><input value={level} onChange={e=>setLevel(e.target.value)} placeholder="371.20" className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" /></div>}
          <button onClick={check} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Check</button>
          <button onClick={watch} disabled={watching} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">{watching?'Watching...':'Watch'}</button>
        </div>
        <div className="text-xs text-slate-500 mt-2">Yahoo 1m/5m bars • WAITING / TRIGGERED / EXPIRED / NOT OPEN / NO DATA • Auto-updates via WebSocket - no refresh needed</div>
      </Card>

      {result && (
        <Card title={`${result.symbol || sym.toUpperCase()} - ${result.status}`} subtitle={result.setup ? `Setup: ${result.setup} • Interval: ${result.interval || interval}` : ''} action={<Badge color={result.status==='TRIGGERED' ? 'green' : result.status==='WAITING' ? 'amber' : result.status==='EXPIRED' ? 'red' : 'gray'}>{result.status}</Badge>}>
          <div className="space-y-2 text-sm">
            {result.status==='TRIGGERED' ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="font-bold text-emerald-400">TRIGGERED at {result.triggerTime || result.entryTime || '-'} • Price {result.price ?? result.triggerPrice ?? '-'}</div>
                <div className="text-xs text-slate-400">First completed bar that CLOSED above {result.rangeHigh ? `range high ${result.rangeHigh}` : `level ${result.level || level}`}</div>
              </div>
            ) : result.status==='WAITING' ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-amber-400">WAITING - not yet above level • Distance: {result.distancePct ? `${result.distancePct}%` : '-'}</div>
                <div className="text-xs text-slate-400">Range: {result.rangeHigh ?? '-'} / {result.rangeLow ?? '-'}</div>
              </div>
            ) : result.status==='EXPIRED' ? <div className="text-amber-400">EXPIRED - no trigger by 15:30 (or early close)</div> :
              result.status==='NOT OPEN' ? <div className="text-slate-400">NOT OPEN - market closed</div> :
              <div className="text-slate-400">{result.rawText || result.error || 'NO DATA'}</div>
            }
            {result.raw && <pre className="mt-3 p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs overflow-x-auto">{JSON.stringify(result.raw, null, 2)}</pre>}
          </div>
        </Card>
      )}
    </div>
  )
}
