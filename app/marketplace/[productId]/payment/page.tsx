"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { CheckCircle, Timer, AlertCircle } from "lucide-react";

export default function PaymentPage({ params }: { params: { productId: string } }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace to move to previous input
    if (e.key === "Backspace" && index > 0 && !otp[index]) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").substring(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last one
    const lastFilledIndex = newOtp.findLastIndex(val => val !== "");
    const nextIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
    const nextInput = document.getElementById(`otp-${nextIndex}`);
    if (nextInput) nextInput.focus();
  };

  const handlePayment = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a complete 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/marketplace/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: params.productId,
          otp: otpString,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Payment verification failed");
      }

      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });

      // Show success animation before redirect
      setIsLoading(false);
      // Wait for 2 seconds before redirecting
      setTimeout(() => {
        router.push("/marketplace");
      }, 2000);
    } catch (error) {
      console.error("Payment verification error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Payment verification failed",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto mt-12 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Authorization</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Enter the 6-digit OTP sent to your email to complete the purchase
        </p>
      </div>

      {/* Timer */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <Timer className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Code expires in: <span className="font-medium">{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
          </span>
        </div>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 mb-8" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-xl font-medium border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handlePayment}
        disabled={isLoading || otp.some(digit => digit === "") || timeLeft === 0}
        className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
          isLoading || otp.some(digit => digit === "") || timeLeft === 0
            ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } transition-colors duration-200`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Processing...
          </>
        ) : timeLeft === 0 ? (
          <>
            <AlertCircle className="h-5 w-5" />
            Code Expired
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            Verify & Pay
          </>
        )}
      </button>

      {/* Resend Code Option */}
      {timeLeft === 0 && (
        <button
          onClick={() => {
            // Implement resend logic here
            toast({
              title: "OTP Resent",
              description: "A new OTP has been sent to your email.",
            });
            setTimeLeft(600);
            setOtp(["", "", "", "", "", ""]);
          }}
          className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Resend Code
        </button>
      )}

      {/* Additional Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Having trouble? Contact our support team for assistance
        </p>
      </div>
    </motion.div>
  );
}