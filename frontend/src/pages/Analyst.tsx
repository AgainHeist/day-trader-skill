import { useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Analyst() {
  const [symbol, setSymbol] = useState('TSLA')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const fetch = async () => {
    setLoading(true)
    try { const r = await api.analyst(symbol); setData(r) } catch(e:any){ setData({status:'DATA UNAVAILABLE', error:e.message}) }
    setLoading(false)
  }
  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Earnings Analyst</h1><Badge>SEC XBRL • Real revenue/EPS/growth</Badge></div>
      <Card title="Fetch Earnings">
        <div className="flex gap-2">
          <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-32" />
          <button onClick={fetch} disabled={loading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">{loading?'Loading...':'Analyze'}</button>
        </div>
        <div className="text-xs text-slate-500 mt-2">Revenue • EPS • Growth • Quarterly • SEC/XBRL facts • Changes • No fabricated numbers</div>
      </Card>
      {data && (
        <Card title={`${symbol} Analyst`} subtitle={data.status}>
          {data.status==='DATA UNAVAILABLE' ? <div className="text-sm text-amber-400">DATA UNAVAILABLE: {data.error}</div> :
           <div className="space-y-3">
             {data.data ? <pre className="p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs overflow-x-auto max-h-[500px] overflow-y-auto">{JSON.stringify(data.data, null, 2)}</pre> : <div className="text-sm text-slate-500">{data.message || 'No data'}</div>}
             {data.revenue && <div className="text-sm"><span className="text-slate-400">Revenue:</span> {JSON.stringify(data.revenue)}</div>}
           </div>
          }
        </Card>
      )}
    </div>
  )
}
