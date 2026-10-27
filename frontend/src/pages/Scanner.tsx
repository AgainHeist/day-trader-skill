import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ws } from '../lib/ws'
import { Card, Badge } from '../components/Card'

export default function Scanner() {
  const [mode, setMode] = useState('orb')
  const [at, setAt] = useState('10:15')
  const [symbols, setSymbols] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    api.scannerStatus().then(setHistory).catch(()=>{})
    const off = ws.on('scanner.progress', (d:any)=> { setProgress(d.progress||0); setStatusText(d.status); if(d.progress===100) setRunning(false) })
    const off2 = ws.on('scanner.result', (d:any)=> setResult(d))
    return ()=>{ off(); off2(); }
  }, [])

  const run = async () => {
    setRunning(true); setProgress(5); setStatusText('SCANNING...'); setResult(null)
    try {
      const body:any = { mode, at: mode==='orb' ? at : undefined, orMinutes: 15, maxConfirm: 200, minPrice: 5, minVolume: mode==='daily'?1000000:0 }
      if (symbols.trim()) body.symbols = symbols.trim()
      const res = await api.scannerRun(body)
      // Poll status
      const poll = setInterval(async ()=>{
        try {
          const s = await api.scannerStatusById(res.runId)
          setStatusText(s.status)
          setProgress(s.status==='running'?50:100)
          if (s.status!=='running') {
            clearInterval(poll)
            setRunning(false)
            const r = await api.scannerResults(res.runId)
            setResult(r)
            api.scannerStatus().then(setHistory).catch(()=>{})
          }
        } catch {}
      }, 2000)
      setTimeout(()=> clearInterval(poll), 30000)
    } catch(e:any) {
      setStatusText('DATA UNAVAILABLE: '+e.message)
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Scanner</h1>
        <Badge color="cyan">5-minute bars • Two-stage ORB</Badge>
        <Badge color="amber">Real data - no fakes</Badge>
      </div>

      <Card title="Run Scanner" subtitle="Universe • Daily • Opening Range Breakout • Watchlist • Specific Symbols">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400">Mode</label>
            <select value={mode} onChange={e=>setMode(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white">
              <option value="orb">Opening Range Breakout</option>
              <option value="daily">Daily (pre-market)</option>
              <option value="universe">Universe</option>
            </select>
          </div>
          {mode==='orb' && (
            <div>
              <label className="text-xs text-slate-400">At (ET)</label>
              <input value={at} onChange={e=>setAt(e.target.value)} placeholder="10:15" className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" />
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400">Specific Symbols (comma separated, optional)</label>
            <input value={symbols} onChange={e=>setSymbols(e.target.value)} placeholder="TSLA,NVDA,AAPL" className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          </div>
          <button onClick={run} disabled={running} className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
            {running ? 'SCANNING...' : 'Run Scan'}
          </button>
        </div>

        {running || statusText ? (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400"><span>Progress</span><span>{progress}% • {statusText}</span></div>
            <div className="h-2 bg-[#0f1629] rounded-full overflow-hidden mt-1 border border-[#1e2d4a]">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{width:`${progress}%`}}></div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Supports: incomplete bars, missing bars, holidays, early closes, partial results</div>
          </div>
        ) : null}
      </Card>

      {result && (
        <Card title={`Results - ${result.hits?.length || 0} hits`} subtitle={`Run #${result.runId} • ${result.status} • Scanned ${result.scanned || 0} • Failed ${result.failed || 0}`} action={result.partial ? <Badge color="amber">PARTIAL DATA</Badge> : <Badge color="green">SCAN COMPLETE</Badge>}>
          {result.hits?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-500 border-b border-[#1f2937]"><th className="text-left py-2">Symbol</th><th className="text-left">Setup</th><th className="text-right">Price</th><th className="text-right">Range High</th><th className="text-right">Range Low</th><th className="text-right">% Above</th><th className="text-right">Volume</th><th className="text-left">Data Status</th></tr></thead>
                <tbody>
                  {result.hits.map((h:any)=>(
                    <tr key={h.symbol} className="border-b border-[#1f2937]/50 hover:bg-[#0f1629]">
                      <td className="py-2 font-bold mono text-cyan-400">{h.symbol}</td>
                      <td>{h.setup || h.raw?.setup || 'orb'}</td>
                      <td className="text-right mono">{h.price ?? h.raw?.price ?? '-'}</td>
                      <td className="text-right mono">{h.rangeHigh ?? h.raw?.range_high ?? '-'}</td>
                      <td className="text-right mono">{h.rangeLow ?? h.raw?.range_low ?? '-'}</td>
                      <td className="text-right mono">{h.pctAbove ? `${h.pctAbove.toFixed(2)}%` : '-'}</td>
                      <td className="text-right mono">{h.volume ?? ''}</td>
                      <td><Badge color={h.raw?.failed ? 'amber' : 'green'}>{result.partial ? 'PARTIAL DATA' : 'ok'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="text-sm text-slate-500">No hits - {result.status}</div>}
          {result.partial && <div className="mt-3 text-xs text-amber-400">Fetched {result.scanned} of {(result.scanned||0)+(result.failed||0)} charts ({result.failed} failed or had no data) - Never round a partial scan up to “the whole market”.</div>}
        </Card>
      )}

      <Card title="Recent Runs">
        {history.length ? (
          <div className="space-y-2">
            {history.slice(0,10).map((r:any)=>(
              <div key={r.id} className="flex justify-between items-center py-2 border-b border-[#1f2937] last:border-0 text-sm">
                <span className="mono text-slate-300">#{r.id} • {r.mode} • {r.status}</span>
                <span className="text-slate-400">{r.hits} hits • scanned {r.scanned} • failed {r.failed}</span>
                <span className="text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-slate-500">No runs yet</div>}
      </Card>
    </div>
  )
}
