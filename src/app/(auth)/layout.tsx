export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px]" />
      
      <div className="z-10 text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 gradient-text">
          GoodsMandi
        </h1>
        <p className="text-slate-400">Campus Marketplace</p>
      </div>

      <div className="w-full max-w-md z-10 px-4">
        {children}
      </div>
    </div>
  )
}
