export function Card({ children, className='', title, subtitle, action, accent }: any) {
  return (
    <div className={`relative bg-[#0e1528]/90 backdrop-blur border border-[#1c2a4a]/80 rounded-2xl overflow-hidden card-hover ${accent==='cyan'?'glow-cyan':accent==='violet'?'glow-violet':''} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      {(title || subtitle || action) && (
        <div className="relative px-5 py-4 flex items-center justify-between border-b border-[#1c2a4a]/60">
          <div>
            {title && <div className="font-semibold text-white text-[13px] tracking-wide">{title}</div>}
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="relative p-5">{children}</div>
    </div>
  )
}
export function Badge({ children, color='cyan' }: any) {
  const map:any = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,214,0.15)]',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    gray: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
  }
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-widest ${map[color]||map.cyan}`}>{children}</span>
}
export function Stat({ label, value, sub, trend, color }: any) {
  return (
    <div className="relative bg-[#0e1528]/90 border border-[#1c2a4a]/60 rounded-2xl p-4 overflow-hidden card-hover">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      <div className="relative">
        <div className="text-[10px] tracking-[0.14em] text-slate-500 font-bold">{label}</div>
        <div className={`text-[22px] font-bold mono mt-1 tracking-tight ${color||'text-white'}`}>{value}</div>
        {sub && <div className={`text-xs mt-1 font-medium ${trend==='up'?'text-emerald-400':trend==='down'?'text-red-400':'text-slate-500'}`}>{sub}</div>}
      </div>
    </div>
  )
}
