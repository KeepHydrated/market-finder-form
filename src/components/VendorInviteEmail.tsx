import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Send, Plus, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Market {
  name: string;
  place_id?: string;
}

interface VendorInviteEmailProps {
  markets: Market[];
}

export const VendorInviteEmail: React.FC<VendorInviteEmailProps> = ({ markets }) => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [senderName, setSenderName] = useState('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim().toLowerCase();
    if (trimmedEmail && isValidEmail(trimmedEmail) && !emails.includes(trimmedEmail)) {
      setEmails([...emails, trimmedEmail]);
      setCurrentEmail('');
    } else if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    } else if (emails.includes(trimmedEmail)) {
      toast({
        title: "Duplicate Email",
        description: "This email has already been added.",
        variant: "destructive",
      });
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedEmails = pastedText
      .split(/[,;\s\n]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email && isValidEmail(email) && !emails.includes(email));
    
    if (pastedEmails.length > 0) {
      setEmails([...emails, ...pastedEmails]);
      toast({
        title: "Emails Added",
        description: `Added ${pastedEmails.length} email${pastedEmails.length > 1 ? 's' : ''}.`,
      });
    }
  };

  const sendInvites = async () => {
    if (emails.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one email address.",
        variant: "destructive",
      });
      return;
    }

    if (markets.length === 0) {
      toast({
        title: "No Market Selected",
        description: "You need to have a market associated with your shop.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const selectedMarket = markets[selectedMarketIndex];
      
      // Get market ID from the database
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('id, name')
        .eq('name', selectedMarket.name)
        .limit(1)
        .maybeSingle();

      let marketId = marketData?.id;
      
      // If market doesn't exist in DB, try to find by place_id or create message without ID
      if (!marketId && selectedMarket.place_id) {
        const { data: marketByPlaceId } = await supabase
          .from('markets')
          .select('id')
          .eq('google_place_id', selectedMarket.place_id)
          .limit(1)
          .maybeSingle();
        
        marketId = marketByPlaceId?.id;
      }

      if (!marketId) {
        toast({
          title: "Market Not Found",
          description: "Could not find the market in the database. Please make sure your market is saved.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-vendor-invite', {
        body: {
          emails,
          marketName: selectedMarket.name,
          marketId,
          senderName: senderName.trim() || undefined,
        },
      });

      if (error) throw error;

      const result = data as { sent: number; failed: number; errors?: any[] };

      if (result.sent > 0) {
        toast({
          title: "Invites Sent!",
          description: `Successfully sent ${result.sent} invite${result.sent > 1 ? 's' : ''}.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
        });
        setEmails([]);
      } else {
        throw new Error('No emails were sent successfully');
      }

    } catch (error: any) {
      console.error('Error sending invites:', error);
      toast({
        title: "Failed to Send",
        description: error.message || "There was an error sending the invites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (markets.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite Vendors
        </CardTitle>
        <CardDescription>
          Send email invitations to vendors to join your farmers market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {markets.length > 1 && (
          <div className="space-y-2">
            <Label>Select Market</Label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={selectedMarketIndex}
              onChange={(e) => setSelectedMarketIndex(Number(e.target.value))}
            >
              {markets.map((market, index) => (
                <option key={index} value={index}>
                  {market.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {markets.length === 1 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{markets[0].name}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="senderName">Your Name (optional)</Label>
          <Input
            id="senderName"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g., John from Canyon Market"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emails">Email Addresses</Label>
          <div className="flex gap-2">
            <Input
              id="emails"
              type="email"
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              placeholder="Enter email and press Enter"
              disabled={isSending}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addEmail}
              disabled={!currentEmail.trim() || isSending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter or comma to add. You can also paste multiple emails.
          </p>
        </div>

        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
            {emails.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1 pr-1">
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={isSending}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Button
          onClick={sendInvites}
          disabled={emails.length === 0 || isSending}
          className="w-full"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send {emails.length > 0 ? `${emails.length} Invite${emails.length > 1 ? 's' : ''}` : 'Invites'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
