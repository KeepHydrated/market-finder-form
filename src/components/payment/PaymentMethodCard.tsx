import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, CreditCard, Wallet } from "lucide-react";

interface PaymentMethod {
  id: string;
  payment_type: string;
  card_last_four?: string | null;
  card_brand?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
  cardholder_name?: string | null;
  paypal_email?: string | null;
  apple_pay_email?: string | null;
  is_default: boolean;
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

const PaymentMethodCard = ({ method, onSetDefault, onDelete }: PaymentMethodCardProps) => {
  const getBrandColor = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes("visa")) return "text-blue-600";
    if (brandLower.includes("mastercard")) return "text-orange-600";
    if (brandLower.includes("amex")) return "text-blue-700";
    return "text-primary";
  };

  const isPayPal = method.payment_type === "paypal";
  const isApplePay = method.payment_type === "apple_pay";

  return (
    <Card className="p-4 border-border/50 hover:border-primary/30 transition-all duration-300 bg-gradient-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
            isPayPal ? "bg-[#0070ba]" : isApplePay ? "bg-black" : "bg-gradient-primary"
          }`}>
            {isPayPal || isApplePay ? (
              <Wallet className="h-6 w-6 text-white" />
            ) : (
              <CreditCard className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isPayPal ? (
                <>
                  <p className="font-semibold text-foreground">PayPal</p>
                  <span className="text-sm text-muted-foreground">
                    {method.paypal_email}
                  </span>
                </>
              ) : isApplePay ? (
                <>
                  <p className="font-semibold text-foreground">Apple Pay</p>
                  <span className="text-sm text-muted-foreground">
                    {method.apple_pay_email}
                  </span>
                </>
              ) : (
                <>
                  <p className="font-semibold text-foreground">
                    {method.card_brand?.toUpperCase()}
                  </p>
                  <span className={`font-mono text-muted-foreground ${getBrandColor(method.card_brand || "")}`}>
                    •••• {method.card_last_four}
                  </span>
                </>
              )}
              {method.is_default && (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            {!isPayPal && !isApplePay && (
              <>
                <p className="text-sm text-muted-foreground mt-1">
                  {method.cardholder_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {String(method.card_exp_month).padStart(2, "0")}/{method.card_exp_year}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!method.is_default && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(method.id)}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Star className="h-4 w-4 mr-1" />
              Set Default
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(method.id)}
            className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PaymentMethodCard;
