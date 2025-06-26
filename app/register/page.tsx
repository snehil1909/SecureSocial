"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast, useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff } from "lucide-react"
import { z } from "zod"
import VirtualKeyboard from "@/components/virtual-keyboard"

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [useVirtualKeyboard, setUseVirtualKeyboard] = useState(false)
  const [step, setStep] = useState(1)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpPhone, setOtpPhone] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    //console.log("Submit called, current step:", step)

    if (step === 3) {
      setIsLoading(true)
      try {
        // First verify the OTPs before registration
        const verificationResponse = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            phone: formData.phone,
            emailOtp: otpEmail,
            phoneOtp: otpPhone,
          }),
        })

        if (!verificationResponse.ok) {
          const verificationData = await verificationResponse.json()
          throw new Error(verificationData.message || "Verification failed")
        }

        // Only if verification succeeds, proceed with registration
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Registration failed")
        }

        toast({
          title: "Registration successful",
          description: "Your account has been created. You can now log in.",
        })

        router.push("/login")
      } catch (error) {
        toast({
          title: "Registration failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    } else {
      handleNextStep()
    }
  }

  const handleNextStep = async () => {
    //console.log("handleNextStep called")

    if (step === 1) {
      const isValid = validateStep1()
      //console.log("Step 1 validation result:", isValid, "Current form data:", formData)
      if (isValid) setStep(2)
    } else if (step === 2) {
      const isValid = validateStep2()
      //console.log("Step 2 validation result:", isValid, "Current form data:", formData)
      if (isValid) {
        // Send OTPs before advancing to step 3
        setIsLoading(true)
        try {
          // Send email OTP
          await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "email",
              email: formData.email,
            }),
          })

          // Send phone OTP
          await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "phone",
              phone: formData.phone,
            }),
          })

          toast({
            title: "Verification codes sent",
            description: "Check your console logs for the codes (in development mode)",
          })

          setStep(3)
        } catch (error) {
          toast({
            title: "Failed to send verification codes",
            description: "Please try again",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }
  }

  const validateStep1 = () => {
    try {
      const { name, email, phone } = formData
      //console.log("Validating step 1 with:", { name, email, phone })

      // Create a new schema directly instead of accessing shape
      const step1Schema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email"),
        phone: z.string().min(10, "Please enter a valid phone number"),
      })

      step1Schema.parse({ name, email, phone })
      setErrors({})
      return true
    } catch (error) {
      //console.error("Validation error:", error)
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path) {
            const path = err.path[0].toString()
            newErrors[path] = err.message
            //console.log(`Field '${path}' validation error: ${err.message}`)
          }
        })
        setErrors(newErrors)
      } else {
        // Handle non-Zod errors
        //console.error("Non-Zod validation error:", error)
        setErrors({ form: "An unexpected error occurred" })
      }
      return false
    }
  }

  const validateStep2 = () => {
    try {
      const { password, confirmPassword } = formData
      //console.log("Validating step 2 with password length:", password?.length || 0)

      // Define the schema directly here
      const step2Schema = z
        .object({
          password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        })

      step2Schema.parse({ password, confirmPassword })
      setErrors({})
      return true
    } catch (error) {
      // Error handling
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        setErrors({ form: "An unexpected error occurred" })
      }
      return false
    }
  }

  const handleVirtualKeyboardInput = (value: string, field: "password" | "confirmPassword") => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            {step === 1 && "Enter your information to create an account"}
            {step === 2 && "Create a secure password"}
            {step === 3 && "Verify your email and phone"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              //console.log("Form submitted")
              handleSubmit(e)
            }}
            className="space-y-4"
          >
            {Object.keys(errors).length > 0 && (
              <div className="p-3 rounded bg-red-50 border border-red-200 mb-4">
                <p className="text-red-600 font-medium">Please fix the highlighted errors to continue</p>
              </div>
            )}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="virtual-keyboard"
                        checked={useVirtualKeyboard}
                        onChange={() => setUseVirtualKeyboard(!useVirtualKeyboard)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="virtual-keyboard" className="text-xs cursor-pointer">
                        Use virtual keyboard
                      </Label>
                    </div>
                  </div>
                  {!useVirtualKeyboard ? (
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  ) : (
                    <VirtualKeyboard
                      onInput={(value) => handleVirtualKeyboardInput(value, "password")}
                      maxLength={20}
                      disabled={isLoading}
                    />
                  )}
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  {!useVirtualKeyboard ? (
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  ) : (
                    <VirtualKeyboard
                      onInput={(value) => handleVirtualKeyboardInput(value, "confirmPassword")}
                      maxLength={20}
                      disabled={isLoading}
                    />
                  )}
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                <div className="space-y-1 text-sm">
                  <p>Password must contain:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>At least 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character</li>
                  </ul>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otpEmail">Email Verification Code</Label>
                  <Input
                    id="otpEmail"
                    placeholder="Enter 6-digit code"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    disabled={isLoading}
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otpPhone">Phone Verification Code</Label>
                  <Input
                    id="otpPhone"
                    placeholder="Enter 6-digit code"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    disabled={isLoading}
                    maxLength={6}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Processing..." : step < 3 ? "Continue" : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

const handleSendOTP = async (formData: RegisterFormData) => {
  try {
    // Send email OTP
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "email",
        email: formData.email,
      }),
    });

    toast({
      title: "Verification code sent",
      description: "Check your email for the verification code.",
    });

    setStep(3); // Proceed to the next step
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to send verification code. Please try again.",
      variant: "destructive",
    });
  }
};

function setStep(arg0: number) {
  throw new Error("Function not implemented.")
}

