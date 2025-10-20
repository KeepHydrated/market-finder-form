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
  const storeUrl = `${window.location.origin}/profile/${vendorId}`;

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

      {/* Business cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
        {[1, 2, 3, 4, 5, 6].map((cardNum) => (
          <Card key={cardNum} className="business-card overflow-hidden border-2 print:break-inside-avoid">
            <CardContent className="p-6 space-y-3">
              {/* Store Name */}
              <div className="border-b-2 border-primary pb-3">
                <h3 className="text-2xl font-bold text-primary">{storeName}</h3>
                <p className="text-sm text-muted-foreground font-medium">{specialty}</p>
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm line-clamp-2 text-foreground/80">
                  {description}
                </p>
              )}

              {/* Markets */}
              {markets.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Find us at:</span>
                  <p className="line-clamp-2">{markets.join(', ')}</p>
                </div>
              )}

              {/* Store Link */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Shop Online:</span>
                </div>
                <p className="text-xs font-mono break-all text-primary">
                  {storeUrl}
                </p>
              </div>

              {/* QR Code suggestion */}
              <div className="text-xs text-center text-muted-foreground italic pt-2">
                Scan QR code to visit our store
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Print instructions - hidden when printing */}
      <Card className="print:hidden bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Printing Tips:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Print on cardstock (heavy paper) for best results</li>
            <li>Standard business card size: 3.5" × 2"</li>
            <li>Cut along the card edges after printing</li>
            <li>Consider adding a QR code generator to make scanning easier</li>
          </ul>
        </CardContent>
      </Card>

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
