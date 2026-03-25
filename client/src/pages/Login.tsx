import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(`Welcome back, ${data.user.name ?? data.user.email}!`);
      // Route based on role
      const role = data.user.role;
      if (role === "admin") setLocation("/admin");
      else if (role === "manager") setLocation("/manager");
      else setLocation("/technician");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sidebar-foreground text-lg leading-none">Houdini</p>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">Locksmith & Security</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Manage every job,<br />
            <span className="text-primary">from first call to invoice.</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
            A complete operations platform for your locksmith and security business.
            Track enquiries, assign technicians, capture signatures, and approve pricing — all in one place.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "Departments", value: "4" },
              { label: "API Modules", value: "11" },
              { label: "Job Statuses", value: "7" },
              { label: "Time Slots/Day", value: "13" },
            ].map((stat) => (
              <div key={stat.label} className="bg-sidebar-accent rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-sidebar-foreground/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-foreground/40 text-sm">
          © {new Date().getFullYear()} Houdini Locksmith & Security
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg">Houdini Locksmith</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter your credentials to access the management system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@houdini.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="text-primary font-medium hover:underline"
              onClick={(e) => { e.preventDefault(); setLocation("/register"); }}
            >
              Register with an invite
            </a>
          </p>

          {/* Role hint */}
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Access levels</p>
            <div className="space-y-1.5">
              {[
                { role: "Admin", color: "bg-red-100 text-red-700", desc: "Full system access" },
                { role: "Manager", color: "bg-blue-100 text-blue-700", desc: "Review, pricing & reports" },
                { role: "Technician", color: "bg-green-100 text-green-700", desc: "Assigned jobs only" },
              ].map((r) => (
                <div key={r.role} className="flex items-center gap-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.color}`}>{r.role}</span>
                  <span className="text-xs text-muted-foreground">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
