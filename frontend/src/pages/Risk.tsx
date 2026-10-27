import { useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Risk() {
  const [orders, setOrders] = useState('[{"symbol":"TSLA","side":"buy","qty":8,"type":"market","limit_price":364.18,"stop_loss_stop_price":358.32,"take_profit_limit_price":370.04,"order_class":"bracket","time_in_force":"day"}]')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const check = async () => {
    setError('')
    try {
      let parsed:any
      try { parsed = JSON.parse(orders) } catch { parsed = [{symbol:'TSLA', side:'buy', qty:8}] }
      if (!Array.isArray(parsed)) parsed = [parsed]
      const res = await api.riskCheck({ orders: parsed })
      setResult(res)
    } catch(e:any){ setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Risk Manager</h1><Badge color={result?.status==='PASS' ? 'green' : result?.status==='BLOCK' ? 'red' : 'cyan'}>{result?.status || 'PASS / BLOCK'}</Badge></div>
      <Card title="Risk Check" subtitle="Max loss • Daily loss • Trades/day • Reward/risk • Entry window • Position size • Cash • PDT">
        <textarea value={orders} onChange={e=>setOrders(e.target.value)} rows={6} className="w-full p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-xs mono text-white" />
        <button onClick={check} className="mt-3 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold">Check Risk</button>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        <div className="text-xs text-slate-500 mt-2">Frontend never overrides backend PASS/BLOCK • Paper order needs PASS to proceed</div>
      </Card>
      {result && (
        <Card title={result.status} action={<Badge color={result.status==='PASS' ? 'green' : 'red'}>{result.status}</Badge>}>
          <div className={`p-4 rounded-lg border text-sm font-bold ${result.status==='PASS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {result.message}
          </div>
          {result.results?.length ? (
            <div className="mt-4 space-y-2">
              {result.results.map((r:any,i:number)=>(
                <div key={i} className={`p-3 rounded-lg border text-xs ${r.status==='PASS' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' : 'bg-red-500/5 border-red-500/20 text-red-300'}`}>
                  <div className="font-bold">{r.symbol} - {r.status}</div>
                  {r.reasons?.length ? <div className="mt-1">{r.reasons.join('; ')}</div> : null}
                  {r.warnings?.length ? <div className="mt-1 text-amber-400">Warnings: {r.warnings.join('; ')}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
          {result.reasons?.length ? <div className="mt-3 text-xs text-red-400">Reasons: {result.reasons.join('; ')}</div> : null}
        </Card>
      )}
    </div>
  )
}
