'use client';

import { usePathname } from 'next/navigation';
import ConversationList from '@/components/chat/ConversationList';

// Phones: one screen at a time (the list, or an open chat).
// Laptops: the list stays on the left and the open chat sits on the right.
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inThread = pathname.replace(/\/$/, '') !== '/chat';

  return (
    // Fill the screen below the navbar (4rem) minus the page padding (4rem)
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[460px] max-w-6xl gap-4">
      <aside
        className={`${inThread ? 'hidden lg:flex' : 'flex'} w-full flex-col overflow-hidden glass-card lg:w-[360px] lg:shrink-0`}
      >
        <ConversationList />
      </aside>
      <section className={`${inThread ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col`}>{children}</section>
    </div>
  );
}
