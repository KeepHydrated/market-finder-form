import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Store } from "lucide-react";

interface MarketDetailsModalProps {
  open: boolean;
  onClose: () => void;
  marketName: string;
  marketAddress?: string;
  marketDays?: string[];
  marketHours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
}

const getDayFullName = (day: string) => {
  const dayMap: Record<string, string> = {
    'Mon': 'Monday',
    'Tue': 'Tuesday', 
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday'
  };
  return dayMap[day] || day;
};

export const MarketDetailsModal = ({ 
  open, 
  onClose, 
  marketName, 
  marketAddress, 
  marketDays, 
  marketHours 
}: MarketDetailsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6 [&>button]:hidden">
        
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-base font-normal">{marketName}</span>
          </div>

          {marketAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground text-base font-normal">{marketAddress}</p>
            </div>
          )}


          {marketHours && Object.keys(marketHours).length > 0 && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-2">
                {Object.entries(marketHours).map(([day, hours]) => (
                  <div key={day} className="flex">
                    <span className="text-muted-foreground text-base font-normal">{getDayFullName(day)}</span>
                    <span className="text-muted-foreground text-base font-normal">, {hours.start} {hours.startPeriod} - {hours.end} {hours.endPeriod}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!marketAddress && (!marketHours || Object.keys(marketHours).length === 0) && (
            <p className="text-muted-foreground">
              This appears to be a search result rather than a custom market submission.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};