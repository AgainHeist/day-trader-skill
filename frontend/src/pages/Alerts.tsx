import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ws } from '../lib/ws'
import { Card, Badge } from '../components/Card'

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [symbol, setSymbol] = useState('TSLA')
  const [type, setType] = useState('below')
  const [price, setPrice] = useState('358.32')
  const [at, setAt] = useState('15:55')
  const [label, setLabel] = useState('')

  const load = async () => { try{ const r = await api.alerts(); setAlerts(r) } catch{} if(Array.isArray(await api.alerts().catch(()=>[]))) {} }
  useEffect(()=>{ load(); const off = ws.on('alert.created', load); const off2 = ws.on('alert.triggered', load); return ()=>{ off(); off2() } }, [])

  // Fix: alerts endpoint returns array directly
  useEffect(()=>{
    api.alerts().then((r:any)=> {
      if (Array.isArray(r)) setAlerts(r)
      else if (Array.isArray(r.alerts)) setAlerts(r.alerts)
      else setAlerts([])
    }).catch(()=>{})
  },[])

  const add = async () => {
    try {
      const body:any = { symbol: symbol.toUpperCase(), ruleType: type, label: label || `${symbol} ${type}`, price: price ? parseFloat(price) : undefined, at: type==='time' ? at : undefined }
      if (type==='opening_bell') { body.ruleType='opening_bell' }
      await api.alertsCreate(body)
      // reload
      const r:any = await api.alerts()
      setAlerts(Array.isArray(r) ? r : r.alerts || [])
      if ('Notification' in window && Notification.permission==='granted') new Notification('Alert created', { body: `${symbol} ${type}` })
      // request permission
      if ('Notification' in window && Notification.permission!=='granted') Notification.requestPermission()
    } catch(e:any){ alert(e.message) }
  }
  const remove = async (id:number) => {
    try{ await api.alertsDelete(id); const r:any = await api.alerts(); setAlerts(Array.isArray(r) ? r : r.alerts || []) } catch {}
  }
  const fromPlan = async () => {
    try { await api.alertsCreate({ fromPlan: true }); const r:any = await api.alerts(); setAlerts(Array.isArray(r) ? r : r.alerts || []) } catch(e:any){ alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Alerts</h1><Badge>WebSocket • No refresh needed</Badge></div>
      <Card title="Create Alert" subtitle="Stop • Target • Flat by close • Price • Opening bell • In-app + Browser + Sound">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="text-xs text-slate-400">Symbol</label><input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" /></div>
          <div><label className="text-xs text-slate-400">Type</label><select value={type} onChange={e=>setType(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white"><option value="below">Stop (below)</option><option value="above">Target (above)</option><option value="time">Time</option><option value="opening_bell">Opening Bell</option></select></div>
          {type!=='time' && type!=='opening_bell' && <div><label className="text-xs text-slate-400">Price</label><input value={price} onChange={e=>setPrice(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" /></div>}
          {type==='time' && <div><label className="text-xs text-slate-400">At (ET)</label><input value={at} onChange={e=>setAt(e.target.value)} className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-24" /></div>}
          <div><label className="text-xs text-slate-400">Label</label><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="flat by close" className="block mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white w-36" /></div>
          <button onClick={add} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Add Alert</button>
          <button onClick={fromPlan} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold">Add from Plan</button>
        </div>
        <div className="text-xs text-slate-500 mt-2">Backend monitors continuously • Idempotent - one event doesn't spam • History tracked</div>
      </Card>
      <Card title={`Active Alerts - ${alerts.length}`} subtitle="Browser notifications when permission granted • Sound + dashboard">
        {alerts.length ? (
          <div className="space-y-2">
            {alerts.map((a:any)=>(
              <div key={a.id} className={`flex justify-between items-center p-3 rounded-lg border ${a.triggered ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0f1629] border-[#1e2d4a]'}`}>
                <div className="text-sm"><span className="font-bold mono text-cyan-400">{a.symbol || '-'}</span> <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-xs">{a.ruleType || a.rule_type} {a.price ? `@ ${a.price}` : ''} {a.atTime || a.at_time || ''}</span> <span className="ml-2 text-slate-400 text-xs">{a.label}</span> {a.triggered && <Badge color="green">TRIGGERED</Badge>}</div>
                <button onClick={()=>remove(a.id)} className="text-xs px-2 py-1 bg-red-500/15 text-red-400 rounded">Delete</button>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-slate-500">No alerts yet</div>}
      </Card>
    </div>
  )
}
