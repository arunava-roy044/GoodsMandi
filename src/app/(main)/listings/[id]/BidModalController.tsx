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
        className="btn-primary w-full"
      >
        Make an offer
      </button>
      <BidModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        listing={listing} 
      />
    </>
  );
}
