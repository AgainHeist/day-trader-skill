import { useState } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { Card, Badge } from '../components/Card'

export default function Exit() {
  const { symbol } = useStore()
  const [sym, setSym] = useState(symbol)
  const [entry, setEntry] = useState('364.18')
  const [orHigh, setOrHigh] = useState('362.18')
  const [orLow, setOrLow] = useState('354.47')
  const [stop, setStop] = useState('or-mid')
  const [target, setTarget] = useState('1R')
  const [plan, setPlan] = useState<any>(null)
  const [error, setError] = useState('')

  const create = async () => {
    setError('')
    try {
      const body:any = { symbol: sym, entry: parseFloat(entry), orHigh: parseFloat(orHigh), orLow: parseFloat(orLow), stop, target, setup: 'orb', interval: '5m' }
      const res = await api.exitPlan(body)
      setPlan(res)
    } catch(e:any){ setError(e.message); setPlan(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Exit Planner</h1><Badge>Entry → Stop → Target → Flat by</Badge></div>
      <Card title="Plan Exit" subtitle="Stop is a plan, not a guarantee - gap can fill past it">
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div><label className="text-xs text-slate-400">Symbol</label><input value={sym} onChange={e=>setSym(e.target.value.toUpperCase())} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Entry</label><input value={entry} onChange={e=>setEntry(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">OR High</label><input value={orHigh} onChange={e=>setOrHigh(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">OR Low</label><input value={orLow} onChange={e=>setOrLow(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Stop</label><select value={stop} onChange={e=>setStop(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white"><option value="or-mid">or-mid</option><option value="or-low">or-low</option><option value="pct:1">pct:1%</option></select></div>
          <div><label className="text-xs text-slate-400">Target</label><select value={target} onChange={e=>setTarget(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white"><option value="1R">1R</option><option value="2R">2R</option></select></div>
        </div>
        <button onClick={create} className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Calculate Plan</button>
        {error && <div className="mt-3 text-sm text-red-400">BLOCKED: {error}</div>}
        <div className="text-xs text-slate-500 mt-2">Data flow: Entry → Exit Plan → Time Machine → Budget → Risk - downstream never uses different entry/stop silently</div>
      </Card>

      {plan && (
        <Card title={`${plan.symbol} Exit Plan`} subtitle={`Saved server-side for Time Machine / Budget / Risk`} action={<Badge color="green">READY</Badge>}>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg"><div className="text-xs text-slate-400">Entry</div><div className="font-bold mono text-white">{plan.entry}</div></div>
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><div className="text-xs text-slate-400">Stop ({plan.stopRule})</div><div className="font-bold mono text-red-400">{plan.stop}</div><div className="text-xs text-slate-500">{plan.stopLabel}</div></div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"><div className="text-xs text-slate-400">Target ({plan.targetR}R)</div><div className="font-bold mono text-emerald-400">{plan.target}</div><div className="text-xs text-slate-500">{plan.targetLabel}</div></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
            <div><span className="text-slate-400">R per share:</span> <span className="mono font-bold">{plan.riskPerShare}</span></div>
            <div><span className="text-slate-400">Reward/Risk:</span> <span className="mono font-bold">{plan.rewardRisk}</span></div>
            <div><span className="text-slate-400">Flat by:</span> <span className="mono font-bold">{plan.flatBy}</span></div>
          </div>
          {plan.openingRange && <div className="text-xs text-slate-400 mt-2">Opening range: {plan.openingRange.high} / {plan.openingRange.low} • {plan.openingRange.minutes} min</div>}
        </Card>
      )}
    </div>
  )
}
