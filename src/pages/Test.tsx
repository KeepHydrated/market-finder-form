import { useState } from 'react';
import { FarmersMarketSearch } from '@/components/FarmersMarketSearch';

const Test = () => {
  const [selectedMarkets, setSelectedMarkets] = useState<any[]>([]);
  
  return (
    <div className="min-h-screen bg-background p-8">
      <FarmersMarketSearch 
        selectedMarkets={selectedMarkets} 
        onMarketsChange={setSelectedMarkets} 
      />
      <div className="mt-4">
        <p>Selected markets: {selectedMarkets.length}</p>
        {selectedMarkets.map(market => (
          <div key={market.place_id}>{market.name}</div>
        ))}
      </div>
    </div>
  );
};

export default Test;