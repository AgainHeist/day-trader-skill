import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<any>(null)
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState<any>(null)

  const load = async () => {
    try { const w = await api.watchlist(); setWatchlist(w) } catch(e:any){ setWatchlist({ symbols: [] }) }
  }
  useEffect(()=>{ load() },[])

  const add = async () => {
    if (!symbol.trim()) return
    try { await api.watchlistAdd(symbol.trim()); setSymbol(''); load() } catch(e:any){ alert(e.message) }
  }
  const remove = async (sym: string) => {
    try { await api.watchlistRemove(sym); load() } catch(e:any){ alert(e.message) }
  }
  const check = async (sym: string) => {
    try { const q = await api.quote(sym); setQuote({ sym, ...q }) } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Watchlist</h1><Badge>Per-account persistence</Badge></div>
      <Card title="Manage Watchlist" subtitle="Add • Remove • Reorder • Start entry watcher • Create alert • Open chart/news">
        <div className="flex gap-2">
          <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-32" />
          <button onClick={add} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Add Symbol</button>
        </div>
      </Card>
      <Card title={`Watchlist - ${watchlist?.symbols?.length || 0} symbols`}>
        {watchlist?.symbols?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlist.symbols.map((s:any)=>(
              <div key={s.symbol} className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg flex justify-between items-center">
                <span className="font-bold mono text-cyan-400">{s.symbol}</span>
                <div className="flex gap-1">
                  <button onClick={()=>check(s.symbol)} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">Quote</button>
                  <button onClick={()=>remove(s.symbol)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-slate-500">Watchlist empty - add TSLA, NVDA, etc. Login to persist per account.</div>}
        {quote && <div className="mt-4 p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs"><span className="font-bold mono text-white">{quote.sym}</span> ${quote.price ?? '-'} {quote.change ? `(${quote.change})` : ''} • {quote.status}</div>}
      </Card>
    </div>
  )
}
