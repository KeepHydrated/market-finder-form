import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Market Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{marketName}</h3>
          </div>

          {marketAddress && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Address</span>
              </div>
              <p className="text-muted-foreground pl-6">{marketAddress}</p>
            </div>
          )}


          {marketHours && Object.keys(marketHours).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Market Hours</span>
              </div>
              <div className="space-y-2 pl-6">
                {Object.entries(marketHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-muted-foreground">{getDayFullName(day)}</span>
                    <span className="text-sm">
                      {hours.start} {hours.startPeriod} - {hours.end} {hours.endPeriod}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!marketAddress && (!marketHours || Object.keys(marketHours).length === 0) && (
            <p className="text-muted-foreground text-sm">
              This appears to be a search result rather than a custom market submission.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};