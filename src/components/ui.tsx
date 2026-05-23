import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Card(props: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm ${props.className ?? ''}`}>{props.children}</div>
}

export function Button(props: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string
  disabled?: boolean
}) {
  const v = props.variant ?? 'secondary'
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<string, string> = {
    primary: 'bg-amber-400 text-black hover:bg-amber-300',
    secondary: 'bg-white/10 text-white hover:bg-white/15',
    danger: 'bg-rose-500/90 text-white hover:bg-rose-400',
    ghost: 'bg-transparent text-white/80 hover:bg-white/10',
  }
  return (
    <button type={props.type ?? 'button'} disabled={props.disabled} onClick={props.onClick} className={`${base} ${variants[v]} ${props.className ?? ''}`}>
      {props.children}
    </button>
  )
}

export function Input(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  right?: React.ReactNode
  readOnly?: boolean
}) {
  return (
    <label className="grid gap-1">
      <div className="text-xs font-semibold text-white/70">{props.label}</div>
      <div className="relative">
        <input
          readOnly={props.readOnly}
          type={props.type ?? 'text'}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/60"
        />
        {props.right ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{props.right}</div> : null}
      </div>
    </label>
  )
}

export function Textarea(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label className="grid gap-1">
      <div className="text-xs font-semibold text-white/70">{props.label}</div>
      <textarea
        readOnly={props.readOnly}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/60"
      />
    </label>
  )
}

export function Modal(props: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    if (props.open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto w-[92vw] max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-[#0b0f1a] shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-base font-bold text-white">{props.title}</div>
            <button onClick={props.onClose} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 pb-5">{props.children}</div>
          {props.footer ? <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">{props.footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Pill(props: { children: React.ReactNode; tone?: 'amber' | 'slate' | 'rose' }) {
  const tone = props.tone ?? 'slate'
  const tones: Record<string, string> = {
    amber: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    slate: 'bg-white/5 text-white/70 border-white/10',
    rose: 'bg-rose-400/15 text-rose-200 border-rose-400/30',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{props.children}</span>
}
