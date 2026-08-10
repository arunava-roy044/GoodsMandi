export function Spinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg', text?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} rounded-full border-slate-700 border-t-emerald-500 animate-spin`} />
      {text && <span className="mt-2 text-sm text-slate-400 font-medium">{text}</span>}
    </div>
  )
}
