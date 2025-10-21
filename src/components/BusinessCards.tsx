import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, ShoppingCart } from 'lucide-react';
import QRCode from 'qrcode';

interface Market {
  name: string;
  address?: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface BusinessCardsProps {
  storeName: string;
  specialty: string;
  description: string;
  vendorId: string;
  markets: Market[];
}

export function BusinessCards({ storeName, specialty, description, vendorId, markets }: BusinessCardsProps) {
  const storeUrl = `www.fromfarmersmarkets.com/vendor/${storeName.toLowerCase().replace(/\s+/g, '-')}`;
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrCodeRef.current) {
      QRCode.toCanvas(qrCodeRef.current, `https://${storeUrl}`, {
        width: 96,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, [storeUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleOrderCards = () => {
    window.open('https://www.gelato.com/products/business-cards', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Action buttons - hidden when printing */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Business Cards</h2>
          <p className="text-muted-foreground mt-1">
            Print or order professional business cards for farmers markets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Cards
          </Button>
          <Button onClick={handleOrderCards}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Order Cards on Gelato
          </Button>
        </div>
      </div>

      {/* Business card */}
      <div>
        <Card className="business-card overflow-hidden border print:break-inside-avoid w-full max-w-2xl bg-white">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Store Name & Specialty */}
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{storeName}</h3>
                  <p className="text-sm text-primary font-medium mt-0.5">{specialty}</p>
                </div>

                {/* Markets */}
                {markets.length > 0 && (
                  <div className="space-y-2">
                    {markets.map((market, index) => {
                      const address = market.address || market.structured_formatting?.secondary_text;
                      const cleanAddress = address?.replace(/, United States$/, '');
                      
                      return (
                        <div key={index} className="text-sm text-foreground/90">
                          <div className="font-medium">{market.structured_formatting?.main_text || market.name}</div>
                          {cleanAddress && (
                            <div className="text-xs text-muted-foreground">
                              {cleanAddress}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4 flex flex-col items-end">
                {/* QR Code */}
                <div className="flex justify-end">
                  <canvas 
                    ref={qrCodeRef}
                    className="w-24 h-24 border-2 border-primary/20 rounded-lg"
                  />
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold text-xs mt-0.5">W</span>
                    <span className="text-foreground/90 break-all leading-relaxed">
                      {storeUrl}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .business-card {
            width: 3.5in;
            height: 2in;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
