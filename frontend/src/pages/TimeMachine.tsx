import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ws } from '../lib/ws'
import { Card, Badge } from '../components/Card'

export default function TimeMachine() {
  const [symbol, setSymbol] = useState('TSLA')
  const [entry, setEntry] = useState('364.18')
  const [stop, setStop] = useState('358.32')
  const [target, setTarget] = useState('370.04')
  const [entryTime, setEntryTime] = useState('10:15 AM')
  const [replays, setReplays] = useState(10000)
  const [seed, setSeed] = useState(19)
  const [runId, setRunId] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<any>(null)

  useEffect(()=>{
    const off = ws.on('timemachine.progress', (d:any)=> { if(runId && d.runId===runId){ setProgress(d.progress||0); setStatus(d.status) }})
    const off2 = ws.on('timemachine.completed', (d:any)=> { if(runId && d.runId===runId){ setStatus('complete'); setProgress(100); fetchResult(d.runId) }})
    return ()=>{ off(); off2() }
  }, [runId])

  const fetchResult = async (id:number) => {
    try { const r = await api.timemachineGet(id); setResult(r.result || r.doc || r); setStatus(r.status) } catch {}
  }

  const run = async () => {
    setResult(null); setProgress(5); setStatus('running')
    try {
      const res = await api.timemachineRun({ symbol, entry: parseFloat(entry), stop: parseFloat(stop), target: parseFloat(target), entryTime, replays, seed, date: '2026-10-19' })
      setRunId(res.runId)
      // Poll fallback
      const poll = setInterval(async ()=>{
        try {
          const r = await api.timemachineGet(res.runId)
          setStatus(r.status); setProgress(r.progress||50)
          if (r.status==='complete' || r.status==='error') { clearInterval(poll); if(r.status==='complete') setResult(r.result) }
        } catch {}
      }, 2000)
      setTimeout(()=>clearInterval(poll), 60000)
    } catch(e:any){ setStatus('error: '+e.message) }
  }

  const mc = result?.mc || result?.doc?.mc
  const hist = result?.history || result?.doc?.history

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Time Machine</h1><Badge color="purple">10,000 replays • 60-day 5m window</Badge></div>
      <div className="px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-xs text-violet-300 font-bold tracking-wide">SIMULATION - NOT A GUARANTEE - Not a prediction. Built from stock's own recent 60 days of 5-minute bars.</div>

      <Card title="Run Simulation" subtitle="Seed makes it reproducible">
        <div className="grid sm:grid-cols-6 gap-3">
          <div><label className="text-xs text-slate-400">Symbol</label><input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Entry</label><input value={entry} onChange={e=>setEntry(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Stop</label><input value={stop} onChange={e=>setStop(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Target</label><input value={target} onChange={e=>setTarget(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Entry Time</label><input value={entryTime} onChange={e=>setEntryTime(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Replays/Seed</label><div className="flex gap-1 mt-1"><input value={replays} onChange={e=>setReplays(parseInt(e.target.value)||10000)} className="w-full px-2 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /><input value={seed} onChange={e=>setSeed(parseInt(e.target.value)||19)} className="w-16 px-2 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div></div>
        </div>
        <button onClick={run} className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold">Run 10,000 Replays</button>
        {status && <div className="mt-3"><div className="flex justify-between text-xs text-slate-400"><span>{status}</span><span>{progress}%</span></div><div className="h-2 bg-[#0f1629] rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-violet-600 to-cyan-600 transition-all" style={{width:`${progress}%`}}></div></div></div>}
      </Card>

      {mc && (
        <Card title="Simulation Results" subtitle={`${mc.replays} replays • seed ${mc.seed} • ${mc.pool_sessions || ''} sessions • ${mc.bars_left || ''} bars left • ${mc.pool_from || ''} to ${mc.pool_to || ''}`}>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center"><div className="text-xs text-slate-400">Target first</div><div className="text-xl font-bold text-emerald-400">{(mc.p_target*100).toFixed(1)}%</div></div>
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center"><div className="text-xs text-slate-400">Stop first</div><div className="text-xl font-bold text-red-400">{(mc.p_stop*100).toFixed(1)}%</div></div>
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-center"><div className="text-xs text-slate-400">Neither</div><div className="text-xl font-bold text-white">{(mc.p_neither*100).toFixed(1)}%</div></div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center"><div className="text-xs text-slate-400">Green</div><div className="text-xl font-bold text-cyan-400">{(mc.p_green*100).toFixed(1)}%</div></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div><span className="text-slate-400">Median close:</span> <span className="mono font-bold">{mc.median_close}</span> 90% between {mc.p5_close}–{mc.p95_close}</div>
            <div><span className="text-slate-400">Avg R:</span> <span className="mono font-bold">{mc.avg_R}</span></div>
            <div><span className="text-slate-400">Hist bins:</span> <span className="mono text-xs">{mc.hist?.bins?.slice(0,6).join(', ')}...</span></div>
          </div>
          {hist && <div className="mt-4 text-sm"><span className="text-slate-400">History:</span> {hist.sessions} sessions, {hist.triggered} triggered, {hist.target} target, {hist.stop} stop, {hist.close} neither • Avg R {hist.avg_R}</div>}
          <div className="mt-4 p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg">
            <div className="font-bold text-white">{result.verdict || result.doc?.verdict}</div>
            <div className="text-xs text-slate-400 mt-1">{(result.verdict_notes || result.doc?.verdict_notes || []).join(' ')}</div>
          </div>
          <div className="mt-4 h-[200px] border border-[#1e2d4a] rounded-lg p-2 bg-[#0a0e1a]">
            <div className="text-xs text-slate-500 mb-2">Fan chart (5 bands) • Histogram below</div>
            {mc.bands && <FanChart bands={mc.bands} hist={mc.hist} />}
          </div>
        </Card>
      )}
      {result?.error && <Card title="Error" className="border-amber-500/30"><div className="text-sm text-amber-400">{result.error}</div></Card>}
    </div>
  )
}

function FanChart({ bands, hist }: any) {
  if (!bands?.length) return <div className="text-xs text-slate-500">No bands</div>
  const all = bands.flat()
  const min = Math.min(...all), max = Math.max(...all)
  const range = max - min || 1
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-[100px]">
      {[0,1,2,3,4].map(idx=> {
        const col = ['#ef4444','#f59e0b','#06b6d4','#10b981','#8b5cf6'][idx]
        const pts = bands.map((b:any,i:number)=> `${(i/bands.length)*100},${100 - ((b[idx]-min)/range)*100}`).join(' ')
        return <polyline key={idx} fill="none" stroke={col} strokeWidth={0.6} opacity={0.7} points={pts} />
      })}
    </svg>
  )
}
