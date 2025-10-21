import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Printer } from 'lucide-react';

interface BusinessCardsProps {
  storeName: string;
  specialty: string;
  description: string;
  vendorId: string;
  markets: string[];
}

export function BusinessCards({ storeName, specialty, description, vendorId, markets }: BusinessCardsProps) {
  const storeUrl = `https://fromfarmersmarkets.com/profile/${vendorId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print button - hidden when printing */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Business Cards</h2>
          <p className="text-muted-foreground mt-1">
            Print these cards to share at farmers markets
          </p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Cards
        </Button>
      </div>

      {/* Business card */}
      <div className="flex justify-center">
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

                {/* Description */}
                {description && (
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">About</p>
                    <p className="text-sm text-foreground/70 line-clamp-3">
                      {description}
                    </p>
                  </div>
                )}

                {/* Markets */}
                {markets.length > 0 && (
                  <div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {markets.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4 flex flex-col">
                {/* QR Code Placeholder */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 border-2 border-primary/20 rounded-lg flex items-center justify-center bg-muted/30">
                    <QrCode className="h-16 w-16 text-primary/40" />
                  </div>
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
