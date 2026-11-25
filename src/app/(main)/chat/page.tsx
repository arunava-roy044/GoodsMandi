// The conversation list lives in the chat layout. On laptops this fills the
// right-hand pane until a chat is picked; on phones it is hidden.
export default function ChatIndexPage() {
  return (
    <div className="glass-card flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-white mb-1">Pick a chat</h2>
      <p className="max-w-xs text-sm text-slate-400">
        Choose a conversation on the left to see your messages with a buyer or seller.
      </p>
    </div>
  );
}
