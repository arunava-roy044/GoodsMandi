import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
          <span className="text-base font-semibold text-white">GoodsMandi</span>
          <p className="text-sm text-slate-500 mt-1">Buy and sell within the UPES student community.</p>
        </div>
        
        <div className="flex space-x-6 text-sm">
          <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span className="text-slate-400">
            &copy; {new Date().getFullYear()} GoodsMandi
          </span>
        </div>
      </div>
    </footer>
  )
}
