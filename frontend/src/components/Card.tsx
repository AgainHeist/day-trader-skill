export function Card({ children, className='', title, subtitle, action }: any) {
  return (
    <div className={`bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
          <div>
            {title && <div className="font-semibold text-white text-sm">{title}</div>}
            {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
export function Badge({ children, color='cyan' }: any) {
  const map:any = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    purple: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    gray: 'bg-slate-700 text-slate-300 border-slate-600',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border tracking-widest ${map[color] || map.cyan}`}>{children}</span>
}
export function Stat({ label, value, sub, color }: any) {
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-3">
      <div className="text-[11px] tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className={`text-lg font-bold mono mt-1 ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
