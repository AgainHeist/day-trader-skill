import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { Card, Badge } from '../components/Card'

export default function News() {
  const { symbol } = useStore()
  const [sym, setSym] = useState(symbol)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetch = async (s: string) => {
    setLoading(true)
    try { const res = await api.news(s); setData(res) } catch(e:any){ setData({ status:'DATA UNAVAILABLE', error:e.message }) }
    setLoading(false)
  }
  useEffect(()=> { fetch(sym) }, [])
  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <h1 className="text-2xl font-bold text-white">News Monitor</h1>
        <Badge>Yahoo Finance + SEC EDGAR</Badge>
      </div>
      <Card title="Search">
        <div className="flex gap-2">
          <input value={sym} onChange={e=>setSym(e.target.value.toUpperCase())} placeholder="TSLA" className="px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-32" />
          <button onClick={()=>fetch(sym)} disabled={loading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">{loading?'Loading...':'Fetch'}</button>
          <span className="text-xs text-slate-500 self-center">Latest headlines • headline time • source • related ticker • earnings/deal tags • SEC filings</span>
        </div>
      </Card>
      <Card title={data?.status==='DATA UNAVAILABLE' ? 'DATA UNAVAILABLE' : data?.status==='ok' ? `${sym} - ${data.count || 0} items` : 'News'} subtitle={data?.message || ''}>
        {data?.status==='DATA UNAVAILABLE' ? <div className="text-sm text-amber-400">DATA UNAVAILABLE: {data.error || 'Provider failed'}</div> :
         !data?.items?.length ? <div className="text-sm text-slate-500">No recent news found.</div> :
         <div className="space-y-3">
           {data.items.map((it:any,i:number)=>(
             <div key={i} className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg">
               <div className="font-semibold text-white text-sm">{it.title || it.headline || it.summary || JSON.stringify(it).slice(0,200)}</div>
               <div className="text-xs text-slate-400 mt-1">{it.source || it.publisher || it.provider || ''} • {it.time || it.pubDate || it.published || it.date || ''} {it.ticker ? `• ${it.ticker}` : ''}</div>
               {it.link && <a href={it.link} target="_blank" className="text-xs text-cyan-400 hover:underline">Source link</a>}
               {it.tags && <div className="flex gap-1 mt-1">{(Array.isArray(it.tags)?it.tags:[it.tags]).map((t:string)=><Badge key={t} color="purple">{t}</Badge>)}</div>}
             </div>
           ))}
         </div>
        }
      </Card>
    </div>
  )
}
