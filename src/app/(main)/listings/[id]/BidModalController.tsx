'use client';

import { useState } from 'react';
import BidModal from '@/components/listings/BidModal';

interface BidModalControllerProps {
  listing: {
    id: string;
    title: string;
    asking_price: number;
  };
}

export default function BidModalController({ listing }: BidModalControllerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn-primary w-full text-lg shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
      >
        Place Bid
      </button>
      <BidModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        listing={listing} 
      />
    </>
  );
}
