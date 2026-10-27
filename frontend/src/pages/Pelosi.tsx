import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Pelosi() {
  const [member, setMember] = useState('pelosi')
  const [year, setYear] = useState('2026')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const fetch = async () => {
    setLoading(true)
    try { const r = await api.pelosi({ member, year }); setData(r) } catch(e:any){ setData({ status:'DATA UNAVAILABLE', error:e.message }) }
    setLoading(false)
  }
  useEffect(()=>{ fetch() },[])
  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Pelosi / Congress Tracker</h1><Badge>PUBLIC DISCLOSURE DATA</Badge></div>
      <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">Members must disclose trades over $1,000 within 45 days (STOCK Act). Not inside information. SEC not notified earlier.</div>
      <Card title="Congress Trades">
        <div className="flex gap-2">
          <input value={member} onChange={e=>setMember(e.target.value)} placeholder="pelosi" className="px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-40" />
          <input value={year} onChange={e=>setYear(e.target.value)} placeholder="2026" className="px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" />
          <button onClick={fetch} disabled={loading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">{loading?'Loading...':'Fetch'}</button>
        </div>
        <div className="text-xs text-slate-500 mt-2">Congress member • Filing date • Transaction date • Ticker • Amount range • Days to disclose</div>
      </Card>
      {data && (
        <Card title={`Filings - ${data.count ?? data.filings?.length ?? 0}`} subtitle={data.disclaimer}>
          {data.status==='DATA UNAVAILABLE' ? <div className="text-sm text-amber-400">DATA UNAVAILABLE: {data.error}</div> :
           !data.filings?.length && !data.rawText ? <div className="text-sm text-slate-500">No filings found for {member} {year}</div> :
           <div className="space-y-2">
             {(data.filings || []).map((f:any,i:number)=>(
               <div key={i} className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm">
                 <div className="font-semibold text-white">{f.name || f.member || f.docId || JSON.stringify(f).slice(0,200)}</div>
                 <div className="text-xs text-slate-400">{f.filingDate || f.filed || ''} • Doc {f.docId || f.docID || ''} • {f.ticker || ''}</div>
               </div>
             ))}
             {data.rawText && <pre className="p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs whitespace-pre-wrap">{data.rawText}</pre>}
           </div>
          }
          <div className="text-xs text-slate-500 mt-3">Source: House Clerk disclosures-clerk.house.gov/public_disc • PUBLIC DISCLOSURE DATA</div>
        </Card>
      )}
    </div>
  )
}
