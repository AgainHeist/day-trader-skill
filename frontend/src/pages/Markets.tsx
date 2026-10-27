import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { Card, Badge } from '../components/Card'

export default function Markets() {
  const [searchParams] = useSearchParams()
  const { symbol, setSymbol } = useStore()
  const sym = (searchParams.get('symbol') || symbol).toUpperCase()
  const [quote, setQuote] = useState<any>(null)
  const [chart, setChart] = useState<any>(null)
  const [range, setRange] = useState('1d')
  const [interval, setInterval] = useState('5m')
  const [error, setError] = useState('')

  useEffect(()=>{ setSymbol(sym) },[sym])
  useEffect(()=>{
    setError('')
    api.quote(sym).then(setQuote).catch((e:any)=>{ setQuote({status:'DATA UNAVAILABLE', error:e.message}); setError(e.message)})
    api.chart(sym, range, interval).then(setChart).catch((e:any)=> setError(e.message))
  },[sym, range, interval])

  const lastUpdate = quote?.regularMarketTime ? new Date(quote.regularMarketTime*1000).toLocaleString('en-US',{timeZone:'America/New_York'}) : new Date().toLocaleString()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <h1 className="text-2xl font-bold text-white">Live Market - {sym}</h1>
        <Badge color={quote?.status==='LIVE' ? 'green' : quote?.status==='DATA UNAVAILABLE' ? 'amber' : 'cyan'}>{quote?.status || 'LIVE DATA'}</Badge>
        {quote?.status==='DATA UNAVAILABLE' && <span className="text-xs text-amber-400">Provider lag or rate-limit - Yahoo Finance is unofficial and can lag</span>}
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card title={`${sym} Chart`} subtitle={`${range} / ${interval} • Last update: ${lastUpdate} ET`} action={
            <div className="flex gap-2">
              <select value={range} onChange={e=>setRange(e.target.value)} className="px-2 py-1 bg-[#0f1629] border border-[#1e2d4a] rounded text-xs text-white"><option value="1d">1D</option><option value="5d">5D</option><option value="1mo">1M</option><option value="60d">60D</option></select>
              <select value={interval} onChange={e=>setInterval(e.target.value)} className="px-2 py-1 bg-[#0f1629] border border-[#1e2d4a] rounded text-xs text-white"><option value="1m">1m</option><option value="5m">5m</option><option value="15m">15m</option><option value="1d">1d</option></select>
            </div>
          }>
            {chart?.bars?.length ? (
              <div>
                <div className="h-[400px]"><CandleChart bars={chart.bars.slice(-80)} /></div>
                <div className="text-xs text-slate-500 mt-2">Source: Yahoo Finance (unofficial, can lag, bars not ticks). Never claim tick-by-tick real-time.</div>
              </div>
            ) : <div className="h-[400px] flex items-center justify-center text-slate-500">{error ? `DATA UNAVAILABLE: ${error}` : 'Loading...'}</div>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Quote" subtitle={sym}>
            {quote ? (
              <div className="space-y-2">
                <div className="text-3xl font-bold mono text-white">{quote.price != null ? `$${quote.price}` : '-'}</div>
                {quote.change != null && <div className={`text-sm font-bold ${quote.change>=0 ? 'text-emerald-400' : 'text-red-400'}`}>{quote.change>0?'+':''}{quote.change} ({quote.changePercent>0?'+':''}{quote.changePercent ?? ''}%)</div>}
                <div className="text-xs text-slate-500">Previous Close: {quote.previousClose ?? '-'} • Status: {quote.status}</div>
                {quote.error && <div className="text-xs text-amber-400">{quote.error}</div>}
                <div className="text-xs text-slate-500">Exchange: {quote.exchange || '-'} • {quote.marketState}</div>
              </div>
            ) : <div className="text-sm text-slate-500">Loading...</div>}
          </Card>
          <Card title="Market Status">
            <div className="text-xs text-slate-400">10:15 AM ET target • Real 1m/5m bars, not every tick</div>
            <div className="mt-2 text-xs text-slate-500">Data interval: {interval} • Yahoo Finance can rate-limit - exponential backoff handled server-side</div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CandleChart({ bars }: any) {
  if (!bars.length) return null
  const highs = bars.map((b:any)=>b.high).filter((v:any)=>v!=null)
  const lows = bars.map((b:any)=>b.low).filter((v:any)=>v!=null)
  const min = Math.min(...lows), max = Math.max(...highs)
  const range = max - min || 1
  const pad = 6
  return (
    <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" className="w-full h-full">
      {bars.map((b:any,i:number)=>{
        if (b.open==null || b.close==null || b.high==null || b.low==null) return null
        const x = (i / bars.length * (100 - pad*2)) + pad
        const w = Math.max(0.3, (100 - pad*2)/bars.length * 0.6)
        const yHigh = 100 - ((b.high - min)/range)*100
        const yLow = 100 - ((b.low - min)/range)*100
        const yOpen = 100 - ((b.open - min)/range)*100
        const yClose = 100 - ((b.close - min)/range)*100
        const green = b.close >= b.open
        const top = Math.min(yOpen, yClose), h = Math.abs(yOpen - yClose) || 0.5
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={green ? '#10b981' : '#ef4444'} strokeWidth={0.3} />
            <rect x={x - w/2} y={top} width={w} height={Math.max(h,0.8)} fill={green ? '#10b981' : '#ef4444'} rx={0.1} />
          </g>
        )
      })}
    </svg>
  )
}
