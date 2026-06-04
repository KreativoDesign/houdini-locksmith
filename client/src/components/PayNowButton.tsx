import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";

interface PayNowButtonProps {
  invoiceId: number;
  amount: number;
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const PayNowButton: React.FC<PayNowButtonProps> = ({
  invoiceId,
  amount,
  jobNumber,
  clientName,
  clientEmail,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  size = "md",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayNow = async () => {
    setIsLoading(true);

    try {
      // TODO: Integrate with PayFast
      // This is a placeholder for PayFast integration
      // In production, this should:
      // 1. Call backend to generate PayFast payment request
      // 2. Redirect to PayFast payment page
      // 3. Handle payment callback

      const paymentData = {
        invoiceId,
        amount,
        jobNumber,
        clientName,
        clientEmail,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        notifyUrl: `${window.location.origin}/api/payment/notify`,
      };

      console.log("Payment data:", paymentData);

      // Placeholder: Show success message
      // Show notification
      console.log("Payment processing...");

      // TODO: Redirect to PayFast
      // window.location.href = payFastPaymentUrl;

      onPaymentSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      console.error("Payment error:", error);

      // Show error notification
      console.error("Payment error:", errorMessage);

      onPaymentError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses: Record<string, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-6 py-3",
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handlePayNow}
        disabled={disabled || isLoading}
        className={`bg-green-600 hover:bg-green-700 text-white ${sizeClasses[size]} gap-2`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay Now - ${amount.toFixed(2)}
          </>
        )}
      </Button>

      {amount > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <p>
            You will be redirected to PayFast to complete your payment securely. Invoice #{invoiceId}
          </p>
        </div>
      )}
    </div>
  );
};

export { PayNowButton };
export default PayNowButton;
