import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';

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
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleExportDesign = async () => {
    if (cardRef.current) {
      try {
        const dataUrl = await toPng(cardRef.current, { 
          quality: 1.0,
          pixelRatio: 3,
        });
        const link = document.createElement('a');
        link.download = `${storeName.toLowerCase().replace(/\s+/g, '-')}-business-card.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export design:', err);
      }
    }
  };

  return (
    <div className="space-y-6 pt-4 md:pt-0">
      {/* Action buttons - hidden when printing */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Business Cards</h2>
          <p className="text-muted-foreground mt-1 mb-4 md:mb-0">
            Print or order professional business cards for farmers markets
          </p>
        </div>
        <Button variant="outline" onClick={handleExportDesign}>
          <Download className="h-4 w-4 mr-2" />
          Export Design
        </Button>
      </div>

      {/* Business card */}
      <div className="flex justify-center">
        <Card ref={cardRef} className="business-card overflow-hidden border print:break-inside-avoid w-full bg-white" style={{ maxWidth: '700px', aspectRatio: '3.5 / 2' }}>
          <CardContent className="p-6 md:p-8 h-full">
            <div className="grid grid-cols-2 gap-4 md:gap-8 h-full">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Store Name & Specialty */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{storeName}</h3>
                  <p className="text-xs md:text-sm text-primary font-medium mt-0.5">{specialty}</p>
                </div>

                {/* Markets */}
                {markets.length > 0 && (
                  <div className="space-y-2">
                    {markets.map((market, index) => {
                      const address = market.address || market.structured_formatting?.secondary_text;
                      const cleanAddress = address?.replace(/, United States$/, '');
                      
                      return (
                        <div key={index} className="text-xs md:text-sm text-foreground/90">
                          <div className="font-medium">{market.structured_formatting?.main_text || market.name}</div>
                          {cleanAddress && (
                            <div className="text-[10px] md:text-xs text-muted-foreground">
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
                    className="w-20 h-20 md:w-24 md:h-24 border-2 border-primary/20 rounded-lg"
                  />
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs md:text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold text-[10px] md:text-xs mt-0.5">W</span>
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
          
          header, nav, [role="navigation"] {
            display: none !important;
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
