"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/lib/auth-client";
import { BUILD_INFO } from "@/lib/build-info";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Determine if the input is an email or username
      const isEmailInput = isEmail(formData.username);

      let result;
      if (isEmailInput) {
        // Use email sign-in for email addresses
        result = await authClient.signIn.email({
          email: formData.username,
          password: formData.password,
        });
      } else {
        // Use username sign-in for usernames
        result = await authClient.signIn.username({
          username: formData.username,
          password: formData.password,
        });
      }

      if (result.error) {
        setError(result.error.message || "Invalid credentials");
      } else {
        // Redirect to welcome page on successful login
        router.push("/welcome");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if input looks like an email
  const isEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">Username or Email</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username or email"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={isLoading}
              autoComplete={isEmail(formData.username) ? "email" : "username"}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                tabIndex={-1}
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  // TODO: Implement forgot password flow
                  alert("Forgot password feature coming soon!");
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rememberMe: checked === true })
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 mt-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary hover:underline font-medium"
            >
              Create one
            </button>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Build: {BUILD_INFO.timestamp}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
