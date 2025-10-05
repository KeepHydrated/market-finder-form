import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, Wallet } from "lucide-react";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddPaymentDialog = ({ open, onOpenChange, onSuccess }: AddPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"card" | "paypal" | "apple_pay">("card");
  
  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  
  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState("");
  
  // Apple Pay fields
  const [applePayEmail, setApplePayEmail] = useState("");
  
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on payment type
    if (paymentType === "card") {
      if (!cardNumber || !cardholderName || !expMonth || !expYear || !cvv) {
        toast.error("Please fill in all card fields");
        return;
      }

      const cleanCardNumber = cardNumber.replace(/\s/g, "");
      if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
        toast.error("Invalid card number");
        return;
      }

      if (cvv.length < 3 || cvv.length > 4) {
        toast.error("Invalid CVV");
        return;
      }
    } else if (paymentType === "paypal") {
      if (!paypalEmail) {
        toast.error("Please enter your PayPal email");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else if (paymentType === "apple_pay") {
      if (!applePayEmail) {
        toast.error("Please enter your Apple ID email");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applePayEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let insertData: any = {
        user_id: user.id,
        payment_type: paymentType,
        is_default: isDefault,
      };

      if (paymentType === "card") {
        const cleanCardNumber = cardNumber.replace(/\s/g, "");
        
        let cardBrand = "Unknown";
        const firstDigit = cleanCardNumber[0];
        if (firstDigit === "4") cardBrand = "Visa";
        else if (firstDigit === "5") cardBrand = "Mastercard";
        else if (firstDigit === "3") cardBrand = "American Express";

        const lastFour = cleanCardNumber.slice(-4);

        // Check for duplicate card
        const { data: existingCards, error: checkError } = await supabase
          .from("payment_methods")
          .select("id")
          .eq("payment_type", "card")
          .eq("card_last_four", lastFour)
          .eq("card_brand", cardBrand);

        if (checkError) {
          toast.error("Error checking for duplicate cards");
          console.error(checkError);
          setLoading(false);
          return;
        }

        if (existingCards && existingCards.length > 0) {
          toast.error("This card has already been added");
          setLoading(false);
          return;
        }

        insertData = {
          ...insertData,
          card_last_four: lastFour,
          card_brand: cardBrand,
          card_exp_month: parseInt(expMonth),
          card_exp_year: parseInt(expYear),
          cardholder_name: cardholderName,
        };
      } else if (paymentType === "paypal") {
        // Check for duplicate PayPal account
        const { data: existingPayPal, error: checkError } = await supabase
          .from("payment_methods")
          .select("id")
          .eq("payment_type", "paypal")
          .eq("paypal_email", paypalEmail);

        if (checkError) {
          toast.error("Error checking for duplicate PayPal accounts");
          console.error(checkError);
          setLoading(false);
          return;
        }

        if (existingPayPal && existingPayPal.length > 0) {
          toast.error("This PayPal account has already been added");
          setLoading(false);
          return;
        }

        insertData = {
          ...insertData,
          paypal_email: paypalEmail,
        };
      } else if (paymentType === "apple_pay") {
        // Check for duplicate Apple Pay account
        const { data: existingApplePay, error: checkError } = await supabase
          .from("payment_methods")
          .select("id")
          .eq("payment_type", "apple_pay")
          .eq("apple_pay_email", applePayEmail);

        if (checkError) {
          toast.error("Error checking for duplicate Apple Pay accounts");
          console.error(checkError);
          setLoading(false);
          return;
        }

        if (existingApplePay && existingApplePay.length > 0) {
          toast.error("This Apple Pay account has already been added");
          setLoading(false);
          return;
        }

        insertData = {
          ...insertData,
          apple_pay_email: applePayEmail,
        };
      }

      const { error } = await supabase.from("payment_methods").insert(insertData);

      if (error) throw error;

      toast.success("Payment method added successfully");
      onOpenChange(false);
      onSuccess();

      // Reset form
      setCardNumber("");
      setCardholderName("");
      setExpMonth("");
      setExpYear("");
      setCvv("");
      setPaypalEmail("");
      setApplePayEmail("");
      setIsDefault(false);
    } catch (error: any) {
      toast.error("Failed to add payment method");
      console.error("Error adding payment method:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 16) {
      setCardNumber(formatCardNumber(value));
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Choose between card, PayPal, or Apple Pay
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "card" | "paypal" | "apple_pay")} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="paypal" className="gap-2">
                <Wallet className="h-4 w-4" />
                PayPal
              </TabsTrigger>
              <TabsTrigger value="apple_pay" className="gap-2">
                <Wallet className="h-4 w-4" />
                Apple Pay
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cardholder">Cardholder Name</Label>
                <Input
                  id="cardholder"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={loading}
                  required={paymentType === "card"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardnumber">Card Number</Label>
                <Input
                  id="cardnumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={loading}
                  maxLength={19}
                  required={paymentType === "card"}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expmonth">Exp. Month</Label>
                  <Select value={expMonth} onValueChange={setExpMonth} disabled={loading} required={paymentType === "card"}>
                    <SelectTrigger id="expmonth">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={String(month)}>
                          {String(month).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expyear">Exp. Year</Label>
                  <Select value={expYear} onValueChange={setExpYear} disabled={loading} required={paymentType === "card"}>
                    <SelectTrigger id="expyear">
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="password"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                    maxLength={4}
                    disabled={loading}
                    required={paymentType === "card"}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="paypal" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="paypal-email">PayPal Email</Label>
                <Input
                  id="paypal-email"
                  type="email"
                  placeholder="you@example.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  disabled={loading}
                  required={paymentType === "paypal"}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email associated with your PayPal account
                </p>
              </div>
            </TabsContent>

            <TabsContent value="apple_pay" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="apple-pay-email">Apple ID Email</Label>
                <Input
                  id="apple-pay-email"
                  type="email"
                  placeholder="you@icloud.com"
                  value={applePayEmail}
                  onChange={(e) => setApplePayEmail(e.target.value)}
                  disabled={loading}
                  required={paymentType === "apple_pay"}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email associated with your Apple ID
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <Label htmlFor="default" className="cursor-pointer">
              Set as default payment method
            </Label>
            <Switch
              id="default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Payment Method"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;
