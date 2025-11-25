"use client";

import { useState } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Unsplash background image - kitchen/cooking theme */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-8 text-white w-full">
          {/* Logo */}
          <div>
            <Image
              src="/logo-dark.jpeg"
              alt="Dapoer Roema"
              width={180}
              height={80}
              className="rounded-lg"
            />
          </div>

          {/* Tagline */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Central Kitchen ERP</h1>
            <p className="text-lg text-white/80 max-w-md">
              Streamline your kitchen operations with our comprehensive management system.
              From inventory to production, we&apos;ve got you covered.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        {/* Header with theme toggle */}
        <div className="flex justify-between items-center p-4">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Image
              src="/logo-light.jpeg"
              alt="Dapoer Roema"
              width={120}
              height={50}
              className="dark:hidden rounded"
            />
            <Image
              src="/logo-dark.jpeg"
              alt="Dapoer Roema"
              width={120}
              height={50}
              className="hidden dark:block rounded"
            />
          </div>
          <div className="lg:ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Desktop logo above form */}
            <div className="hidden lg:flex justify-center mb-8">
              <Image
                src="/logo-light.jpeg"
                alt="Dapoer Roema"
                width={160}
                height={70}
                className="dark:hidden rounded"
              />
              <Image
                src="/logo-dark.jpeg"
                alt="Dapoer Roema"
                width={160}
                height={70}
                className="hidden dark:block rounded"
              />
            </div>

            {mode === "login" ? (
              <LoginForm onSwitchToRegister={() => setMode("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Dapoer Roema. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
