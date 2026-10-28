import { useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'
import { Shield, Trash2, Plus } from 'lucide-react'

type Order = { symbol:string; side:'buy'|'sell'; qty:number; type:'market'|'limit'; limit_price?:number; stop: number; target:number }

export default function Risk(){
  const [orders, setOrders] = useState<Order[]>([{symbol:'TSLA', side:'buy', qty:8, type:'market', limit_price:364.18, stop:358.32, target:370.04}])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const update = (i:number, patch:Partial<Order>) => setOrders(prev => prev.map((o,idx)=> idx===i?{...o,...patch}:o))
  const add = () => setOrders(o=>[...o, {symbol:'NVDA', side:'buy', qty:5, type:'market', stop:140, target:160}])
  const remove = (i:number) => setOrders(o=> o.length>1? o.filter((_,idx)=>idx!==i):o)

  const check = async()=>{
    setLoading(true)
    try{
      const payload = orders.map(o=>({
        symbol:o.symbol.toUpperCase(), side:o.side, qty:o.qty, type:o.type,
        limit_price:o.limit_price, stop_loss_stop_price:o.stop, take_profit_limit_price:o.target,
        order_class:'bracket', time_in_force:'day'
      }))
      const res = await api.riskCheck({orders: payload})
      setResult(res)
    }catch(e:any){ setResult({status:'ERROR', message:e.message}) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[20px] font-black text-white flex items-center gap-2"><span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center"><Shield size={16} className="text-white"/></span> Risk Manager</h1>
        <Badge color={result?.status==='PASS'?'green':result?.status==='BLOCK'?'red':'cyan'}>{result?.status||'PASS / BLOCK'}</Badge>
        <span className="text-xs text-slate-500 hidden sm:block">Paper order ko PASS chahiye — no override</span>
      </div>

      <Card accent="cyan" title="Build Orders" subtitle="Add karte jao — dropdown se, likhna nahi padega • Instant check" action={<button onClick={add} className="px-3 py-1.5 rounded-xl bg-[#0f1a30] border border-[#1b2b4a] text-cyan-400 text-xs font-black flex items-center gap-1"><Plus size={14}/> Add Order</button>}>
        <div className="space-y-3">
          {orders.map((o,i)=>(
            <div key={i} className="grid grid-cols-2 lg:grid-cols-8 gap-3 p-3 rounded-2xl bg-[#0a1220] border border-[#162032]">
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">SYMBOL</label>
                <input value={o.symbol} onChange={e=>update(i,{symbol:e.target.value.toUpperCase()})} placeholder="TSLA" className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm font-bold text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">SIDE</label>
                <select value={o.side} onChange={e=>update(i,{side:e.target.value as any})} className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm font-bold text-white">
                  <option value="buy">BUY</option><option value="sell">SELL</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">QTY</label>
                <input type="number" value={o.qty} onChange={e=>update(i,{qty: parseInt(e.target.value)||0})} className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm mono font-bold text-white" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">TYPE</label>
                <select value={o.type} onChange={e=>update(i,{type:e.target.value as any})} className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm font-bold text-white">
                  <option value="market">MARKET</option><option value="limit">LIMIT</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">ENTRY / LIMIT</label>
                <input type="number" step="0.01" value={o.limit_price||''} onChange={e=>update(i,{limit_price: parseFloat(e.target.value)||undefined})} placeholder="364.18" className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm mono text-white" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">STOP</label>
                <input type="number" step="0.01" value={o.stop} onChange={e=>update(i,{stop: parseFloat(e.target.value)||0})} className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-red-500/20 rounded-xl text-sm mono text-red-300" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest font-bold text-slate-500">TARGET</label>
                <input type="number" step="0.01" value={o.target} onChange={e=>update(i,{target: parseFloat(e.target.value)||0})} className="w-full mt-1 px-3 py-2.5 bg-[#0e1528] border border-emerald-500/20 rounded-xl text-sm mono text-emerald-300" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={()=>remove(i)} className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black flex items-center justify-center gap-1 hover:bg-red-500/15"><Trash2 size={14}/> Delete</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={check} disabled={loading} className="mt-4 w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-60 text-white rounded-xl text-sm font-black shadow-[0_0_30px_rgba(16,185,129,0.25)]">
          {loading?'Checking...':'Check Risk → PASS / BLOCK'}
        </button>
        <div className="text-xs text-slate-500 mt-2">Max loss • Daily loss • Trades/day • Reward/risk • Entry window • Position size • Cash • PDT — backend never bypass</div>
      </Card>

      {result && (
        <Card title={result.status} action={<Badge color={result.status==='PASS'?'green':'red'}>{result.status}</Badge>}>
          <div className={`p-4 rounded-2xl border text-sm font-black ${result.status==='PASS'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-300':'bg-red-500/10 border-red-500/20 text-red-300'}`}>
            {result.message}
          </div>
          {result.results?.map((r:any,i:number)=>(
            <div key={i} className={`mt-3 p-4 rounded-2xl border ${r.status==='PASS'?'bg-emerald-500/5 border-emerald-500/15 text-emerald-200':'bg-red-500/5 border-red-500/15 text-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-black">{r.symbol} • {r.status}</span>
                <span className="text-[10px] px-2 py-1 rounded-full border bg-slate-800/60 border-slate-700 text-slate-400">{r.status==='PASS'?'OK':'BLOCKED'}</span>
              </div>
              {r.reasons?.length ? <div className="text-xs mt-2 leading-5">{r.reasons.join(' • ')}</div> : null}
              {r.warnings?.length ? <div className="text-xs mt-2 text-amber-300">Warnings: {r.warnings.join(' • ')}</div> : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
