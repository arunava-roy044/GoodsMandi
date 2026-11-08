import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 py-12">
      <div className="text-center mb-8">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
          GoodsMandi
        </Link>
        <p className="text-sm text-slate-500 mt-1">Buy and sell within UPES</p>
      </div>

      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
