import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ws } from '../lib/ws'
import { Card, Badge } from '../components/Card'

export default function Paper() {
  const [preview, setPreview] = useState<any>(null)
  const [positions, setPositions] = useState<any>(null)
  const [orders, setOrders] = useState<any>(null)
  const [balance, setBalance] = useState<any>(null)

  const load = async () => {
    try { setPositions(await api.paperPositions()) } catch {}
    try { setOrders(await api.paperOrders()) } catch {}
    try { setBalance(await api.paperBalance()) } catch {}
  }
  useEffect(()=>{ load(); const off = ws.on('paper.order.updated', ()=>{ load() }); return ()=> { off() } },[])

  const doPreview = async () => {
    try {
      const p = await api.paperPreview({})
      setPreview(p)
    } catch(e:any){ setPreview({ error: e.message }) }
  }
  const confirm = async (idx:number) => {
    try {
      const r = await api.paperConfirm({ index: idx, reply: 'yes' })
      alert(r.message || 'Order placed (paper)')
      load()
    } catch(e:any){ alert(e.message) }
  }
  const flatten = async (sym:string) => {
    try { const r = await api.paperFlatten(sym); alert(r.message); load() } catch(e:any){ alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Paper Trading</h1><Badge color="amber">PAPER MODE - simulation only</Badge><Badge color="green">Never real-money auto</Badge></div>
      <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 font-bold text-center">PAPER MODE - Paper trading is the default. No real-money order is sent without your explicit yes + Allow once card. This is simulation.</div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card title="Balance"><div className="text-xl font-bold mono">${balance?.totalEquity ?? '5000'}</div><div className="text-xs text-slate-400">Cash ${balance?.cash ?? 5000} • Market value ${balance?.marketValue ?? 0}</div></Card>
        <Card title="Flow" subtitle="Signal → Exit → TM → Budget → Risk PASS → Preview → Confirm">
          <button onClick={doPreview} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Preview Orders</button>
          <div className="text-xs text-slate-500 mt-2">Modular: paper layer separated from analysis</div>
        </Card>
        <Card title="Positions" subtitle={`${positions?.count || 0} open`}>
          {positions?.positions?.length ? positions.positions.map((p:any)=>(
            <div key={p.symbol} className="flex justify-between items-center py-2 border-b border-[#1f2937] text-sm">
              <span className="font-bold mono text-cyan-400">{p.symbol} x{p.qty} @ ${p.avgPrice}</span>
              <span className={`mono ${p.unrealizedPL>=0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.unrealizedPL != null ? `${p.unrealizedPL>0?'+':''}${p.unrealizedPL}` : ''}</span>
              <button onClick={()=>flatten(p.symbol)} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">Flatten</button>
            </div>
          )) : <div className="text-sm text-slate-500">No open positions</div>}
        </Card>
      </div>

      {preview && (
        <Card title="Order Preview" subtitle={preview.error || `${preview.count} orders`}>
          {preview.error ? <div className="text-sm text-red-400">{preview.error}</div> :
           preview.orders?.map((o:any,i:number)=>(
             <div key={i} className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg mb-3">
               <div className="text-sm font-bold text-white">{o.symbol} {o.side} {o.qty} @ {o.livePrice ?? o.limitPrice ?? 'market'} • {o.orderClass}</div>
               <div className="text-xs text-slate-400">Stop {o.stopLoss} • Take profit {o.takeProfit} • Live ${o.livePrice ?? '-'}</div>
               <button onClick={()=>confirm(i+1)} className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold">Confirm (Paper) - Explicit Yes</button>
             </div>
           ))
          }
        </Card>
      )}

      <Card title={`Order History - ${orders?.count || 0}`}>
        {orders?.orders?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-500"><th className="text-left">Symbol</th><th>Side</th><th>Qty</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>{orders.orders.map((o:any)=> <tr key={o.id} className="border-b border-[#1f2937]"><td className="mono text-cyan-400 py-1.5">{o.symbol}</td><td>{o.side}</td><td>{o.qty}</td><td>{o.type}</td><td><Badge color={o.status==='placed' ? 'green' : 'gray'}>{o.status}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="text-sm text-slate-500">No orders</div>}
      </Card>
    </div>
  )
}
