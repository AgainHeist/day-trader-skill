import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Card, Badge } from '../components/Card'

export default function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [aiKey, setAiKey] = useState('')
  const [aiBase, setAiBase] = useState('')
  const [aiModel, setAiModel] = useState('')

  useEffect(()=>{
    api.settings().then(s=>{ setSettings(s); setAiKey(s.aiProvider?.apiKey || ''); setAiBase(s.aiProvider?.baseUrl || ''); setAiModel(s.aiProvider?.model || '') }).catch(()=>{})
  },[])

  const save = async (section: string, value:any) => {
    try { const r = await api.settingsSave({ [section]: value }); setSettings(r.settings) } catch(e:any){ alert(e.message) }
  }
  const saveAi = async () => {
    try { await api.settingsAi({ aiProvider: { apiKey: aiKey, baseUrl: aiBase, model: aiModel } }); alert('AI provider saved (server-side only)') } catch(e:any){ alert(e.message) }
  }

  if (!settings) return <div className="text-slate-500">Loading settings...</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center"><h1 className="text-2xl font-bold text-white">Settings</h1><Badge>Timezone: ET • API keys server-side only</Badge></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Market Data">
          <label className="text-xs text-slate-400">SEC User Agent</label>
          <input value={settings.sec?.userAgent || ''} onChange={e=> setSettings((s:any)=> ({...s, sec:{...s.sec, userAgent:e.target.value}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <button onClick={()=>save('sec', settings.sec)} className="mt-2 px-3 py-1.5 bg-cyan-600 text-white rounded text-xs">Save</button>
        </Card>

        <Card title="AI Provider (optional)" subtitle="Modular - OpenAI-compatible • Deterministic logic never uses AI for price/risk">
          <label className="text-xs text-slate-400">Provider</label><input value={settings.aiProvider?.provider || 'openai-compatible'} readOnly className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <label className="text-xs text-slate-400 mt-2 block">API Base URL</label><input value={aiBase} onChange={e=>setAiBase(e.target.value)} placeholder="https://api.openai.com/v1" className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <label className="text-xs text-slate-400 mt-2 block">API Key (server-side only, never exposed to frontend JS)</label><input type="password" value={aiKey} onChange={e=>setAiKey(e.target.value)} placeholder="sk-..." className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <label className="text-xs text-slate-400 mt-2 block">Model</label><input value={aiModel} onChange={e=>setAiModel(e.target.value)} placeholder="gpt-4o-mini" className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <button onClick={saveAi} className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold">Save AI Provider</button>
          <div className="text-xs text-slate-500 mt-2">If AI fails, core scanner/risk/paper functions continue • AI only for explanations/summaries</div>
        </Card>

        <Card title="Scanner">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><label className="text-xs text-slate-400">Min Price</label><input value={settings.scanner?.minPrice || 5} onChange={e=> setSettings((s:any)=>({...s, scanner:{...s.scanner, minPrice: parseFloat(e.target.value)}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
            <div><label className="text-xs text-slate-400">OR Minutes</label><input value={settings.scanner?.orMinutes || 15} onChange={e=> setSettings((s:any)=>({...s, scanner:{...s.scanner, orMinutes: parseInt(e.target.value)}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          </div>
          <button onClick={()=>save('scanner', settings.scanner)} className="mt-3 px-3 py-1.5 bg-cyan-600 text-white rounded text-xs">Save</button>
        </Card>

        <Card title="Risk">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><label className="text-xs text-slate-400">Max Loss/Trade</label><input value={settings.risk?.maxLossPerTradeUsd || 50} onChange={e=> setSettings((s:any)=>({...s, risk:{...s.risk, maxLossPerTradeUsd: parseFloat(e.target.value)}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
            <div><label className="text-xs text-slate-400">Budget</label><input value={settings.risk?.budget || 5000} onChange={e=> setSettings((s:any)=>({...s, risk:{...s.risk, budget: parseFloat(e.target.value)}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" /></div>
          </div>
          <button onClick={()=>save('risk', settings.risk)} className="mt-3 px-3 py-1.5 bg-cyan-600 text-white rounded text-xs">Save</button>
        </Card>

        <Card title="Exit Rules">
          <label className="text-xs text-slate-400">Flat By</label><input value={settings.exitRules?.flatBy || '15:55'} onChange={e=> setSettings((s:any)=>({...s, exitRules:{...s.exitRules, flatBy:e.target.value}}))} className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" />
          <button onClick={()=>save('exitRules', settings.exitRules)} className="mt-2 px-3 py-1.5 bg-cyan-600 text-white rounded text-xs">Save</button>
        </Card>

        <Card title="Security">
          <div className="text-xs text-slate-400">Secrets never exposed in frontend JS • Env vars on server • HTTPS • CSRF/XSS • Rate limiting • JWT auth</div>
        </Card>

        <Card title="Support - ALi BOSS" subtitle="Power By ALi">
          <div className="flex items-center gap-3 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
            <span className="text-2xl">✈</span>
            <div>
              <div className="font-bold text-white">Telegram Support</div>
              <a href="https://t.me/alionera" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 font-bold">@alionera</a>
              <div className="text-xs text-slate-400">24/7 support - ALi BOSS team</div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs font-bold tracking-widest text-slate-500">Power By ALi • ALi BOSS Premium Terminal</div>
        </Card>
      </div>
      <Card title="Raw Settings JSON">
        <pre className="p-3 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg text-xs overflow-x-auto max-h-[300px] overflow-y-auto">{JSON.stringify(settings, null, 2)}</pre>
      </Card>
    </div>
  )
}
