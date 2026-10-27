import { useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Budget() {
  const [accountSize, setAccountSize] = useState('5000')
  const [maxRisk, setMaxRisk] = useState('50')
  const [entry, setEntry] = useState('364.18')
  const [stop, setStop] = useState('358.32')
  const [symbol, setSymbol] = useState('TSLA')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const calc = async () => {
    setError('')
    try {
      const res = await api.budgetCalc({ symbol, entry: parseFloat(entry), stop: parseFloat(stop), accountSize: parseFloat(accountSize), maxRiskPerTrade: parseFloat(maxRisk) })
      setResult(res)
    } catch(e:any){ setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Budget Manager</h1><Badge>Backend calculates - never trust browser size</Badge></div>
      <Card title="Position Sizing" subtitle="Whole shares • Caps • Cash buffer">
        <div className="grid sm:grid-cols-5 gap-3">
          <div><label className="text-xs text-slate-400">Symbol</label><input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Account Size</label><input value={accountSize} onChange={e=>setAccountSize(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Max Risk/Trade</label><input value={maxRisk} onChange={e=>setMaxRisk(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Entry</label><input value={entry} onChange={e=>setEntry(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          <div><label className="text-xs text-slate-400">Stop</label><input value={stop} onChange={e=>setStop(e.target.value)} className="block mt-1 w-full px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
        </div>
        <button onClick={calc} className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold">Calculate Position</button>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </Card>
      {result && (
        <Card title={`${symbol} • ${result.shares} shares`} subtitle={`Budget calc #${result.calculationId || ''}`} action={<Badge color="cyan">{result.budgetStatus}</Badge>}>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg"><div className="text-xs text-slate-400">Shares</div><div className="text-xl font-bold mono text-white">{result.shares}</div></div>
            <div className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg"><div className="text-xs text-slate-400">Position Value</div><div className="text-xl font-bold mono text-white">${result.totalValue}</div></div>
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><div className="text-xs text-slate-400">Max Loss at Stop</div><div className="text-xl font-bold mono text-red-400">${result.maxLoss}</div></div>
            <div className="p-3 bg-[#0f1629] border border-[#1e2d4a] rounded-lg"><div className="text-xs text-slate-400">Risk/Share</div><div className="mono font-bold">${result.riskPerShare?.toFixed(2) || '-'}</div></div>
          </div>
          {result.order && <pre className="mt-3 p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs overflow-x-auto">{JSON.stringify(result.order, null, 2)}</pre>}
        </Card>
      )}
    </div>
  )
}
