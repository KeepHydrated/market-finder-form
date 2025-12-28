import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Send, Plus, Mail, Loader2, ShieldAlert, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const ALLOWED_EMAIL = 'nadiachibri@gmail.com';

interface Market {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

const DEFAULT_SUBJECT = "You're invited to sell at {{marketName}}!";
const DEFAULT_BODY = `Hello!

You've been invited to become a vendor at **{{marketName}}** through From Farmers Markets.

Join our growing community of local farmers, artisans, and producers to:
• Reach more customers in your area
• Manage your products and orders online
• Connect directly with buyers
• Grow your local business

Click the link below to apply:
{{signupLink}}

Best regards,
{{senderName}}`;

export default function VendorInviteAdmin() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [senderName, setSenderName] = useState('From Farmers Markets Team');
  
  // Email content
  const [emailSubject, setEmailSubject] = useState(DEFAULT_SUBJECT);
  const [emailBody, setEmailBody] = useState(DEFAULT_BODY);
  const [activeTab, setActiveTab] = useState('compose');

  // Check access
  useEffect(() => {
    if (!loading && (!user || user.email !== ALLOWED_EMAIL)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, loading, navigate, toast]);

  // Fetch all markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('id, name, address, city, state')
          .order('name');

        if (error) throw error;
        setMarkets(data || []);
      } catch (error) {
        console.error('Error fetching markets:', error);
        toast({
          title: "Error",
          description: "Failed to load markets.",
          variant: "destructive",
        });
      } finally {
        setLoadingMarkets(false);
      }
    };

    if (user?.email === ALLOWED_EMAIL) {
      fetchMarkets();
    }
  }, [user, toast]);

  const getPreviewContent = (template: string) => {
    const selectedMarket = markets.find(m => m.id === Number(selectedMarketId));
    const marketName = selectedMarket?.name || '[Market Name]';
    const marketId = selectedMarket?.id || '0';
    const signupLink = `https://fromfarmersmarkets.com/vendor-signup/${marketId}`;
    
    return template
      .replace(/\{\{marketName\}\}/g, marketName)
      .replace(/\{\{signupLink\}\}/g, signupLink)
      .replace(/\{\{senderName\}\}/g, senderName || 'From Farmers Markets Team');
  };

  const renderMarkdownPreview = (text: string) => {
    // Simple markdown to HTML conversion for preview
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-4 my-2">$&</ul>')
      .replace(/\n/g, '<br/>');
  };

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

    if (!selectedMarketId) {
      toast({
        title: "No Market Selected",
        description: "Please select a market.",
        variant: "destructive",
      });
      return;
    }

    if (!emailSubject.trim()) {
      toast({
        title: "No Subject",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!emailBody.trim()) {
      toast({
        title: "No Message",
        description: "Please enter an email message.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const selectedMarket = markets.find(m => m.id === Number(selectedMarketId));
      
      if (!selectedMarket) {
        throw new Error('Market not found');
      }

      const { data, error } = await supabase.functions.invoke('send-vendor-invite', {
        body: {
          emails,
          marketName: selectedMarket.name,
          marketId: selectedMarket.id,
          senderName: senderName.trim() || 'From Farmers Markets Team',
          customSubject: emailSubject.trim(),
          customBody: emailBody.trim(),
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

  // Show loading or access denied
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== ALLOWED_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Vendor Invite Admin</h1>
          <p className="text-muted-foreground">Compose and send email invitations to vendors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings & Recipients */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Market *</Label>
                  {loadingMarkets ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading markets...
                    </div>
                  ) : (
                    <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a market..." />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.id} value={String(market.id)}>
                            {market.name} - {market.city}, {market.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g., Nadia from From Farmers Markets"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>Add email addresses to send invites to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
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
                  Press Enter or comma to add. You can paste multiple emails.
                </p>

                {emails.length > 0 && (
                  <div className="space-y-2">
                    <Label>{emails.length} recipient{emails.length > 1 ? 's' : ''}</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50 max-h-32 overflow-y-auto">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Email Compose */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Content
              </CardTitle>
              <CardDescription>
                Use {"{{marketName}}"}, {"{{signupLink}}"}, {"{{senderName}}"} as placeholders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="compose">Compose</TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="compose" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Message *</Label>
                    <Textarea
                      id="body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Write your email message..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use **bold** for bold text and • for bullet points
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg p-4 bg-white text-black min-h-[380px]">
                    <div className="border-b pb-2 mb-4">
                      <p className="text-sm text-gray-500">Subject:</p>
                      <p className="font-semibold">{getPreviewContent(emailSubject)}</p>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: renderMarkdownPreview(getPreviewContent(emailBody)) 
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Send Button */}
        <Button
          onClick={sendInvites}
          disabled={emails.length === 0 || !selectedMarketId || isSending || !emailSubject.trim() || !emailBody.trim()}
          className="w-full"
          size="lg"
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
      </div>
    </div>
  );
}