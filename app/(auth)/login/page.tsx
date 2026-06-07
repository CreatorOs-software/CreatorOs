"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, ArrowRight, Info } from "lucide-react";
import { login } from "@/domains/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await login({ email, password });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-accent-yellow/10 p-12 flex-col justify-between">
        <div>
          <div className="rounded-lg border border-foreground/20 px-4 py-2 inline-block">
            <span className="text-xl font-semibold text-foreground">
              TalentOS
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-light tracking-tight text-balance">
            Manage your team <span className="font-semibold">effortlessly</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            The all-in-one HR platform for modern companies. Track performance,
            manage payroll, and keep your team happy.
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div>
            <p className="text-3xl font-semibold">78+</p>
            <p className="text-sm text-muted-foreground">Active Employees</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">203</p>
            <p className="text-sm text-muted-foreground">Projects</p>
          </div>
          <div>
            <p className="text-3xl font-semibold">98%</p>
            <p className="text-sm text-muted-foreground">Satisfaction</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="rounded-lg border border-foreground/20 px-4 py-2 inline-block mb-8">
              <span className="text-xl font-semibold text-foreground">
                TalentOS
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-light tracking-tight">
              Welcome <span className="font-semibold">back</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-card border border-border-light rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-card border border-border-light rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all pr-12"
                  required
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <button className="text-foreground hover:underline font-medium">
              Contact admin
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
