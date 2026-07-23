import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// CDN URLs for the mascot images
const MASCOT_KEY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-key_2a264431.jpeg";
const MASCOT_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-logo-neon_8a8a6775.png";

const FEATURES = [
  "Manage enquiries from first call to invoice",
  "Assign technicians and track job status in real-time",
  "Capture client signatures on mobile",
  "Generate PDF job cards and pricing approvals",
];

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
      {/* ── Left panel: dark + mascot ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0a0f0a 0%, #0d1a0d 50%, #0a1205 100%)" }}
      >
        {/* Subtle radial glow behind mascot */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 55%, oklch(0.73 0.22 130 / 0.18) 0%, transparent 70%)",
          }}
        />

        {/* Top: brand name */}
        <div className="relative z-10 px-10 pt-10 flex items-center gap-3">
          <img
            src={MASCOT_LOGO_URL}
            alt="Houdini Locksmith logo"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <p className="font-bold text-white text-lg leading-none tracking-tight">Houdini</p>
            <p className="text-xs text-white/50 mt-0.5 tracking-wide">Locksmith & Security</p>
          </div>
        </div>

        {/* Centre: mascot image */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
          <img
            src={MASCOT_KEY_URL}
            alt="Houdini mascot holding a key"
            className="w-72 h-auto object-contain drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 0 40px oklch(0.73 0.22 130 / 0.5))" }}
          />
        </div>

        {/* Bottom: instructions / feature list */}
        <div className="relative z-10 px-10 pb-10 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-white leading-snug">
              Your complete operations platform
            </h2>
            <p className="text-sm text-white/55 mt-1">
              Sign in to manage jobs, technicians, and clients — all in one place.
            </p>
          </div>

          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "oklch(0.73 0.22 130)" }}
                />
                <span className="text-sm text-white/70">{f}</span>
              </li>
            ))}
          </ul>

          <p className="text-white/25 text-xs pt-2">
            © {new Date().getFullYear()} Houdini Locksmith & Security
          </p>
        </div>
      </div>

      {/* ── Right panel: login form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo (shown only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <img
              src={MASCOT_LOGO_URL}
              alt="Houdini logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
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
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
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
              onClick={(e) => {
                e.preventDefault();
                setLocation("/register");
              }}
            >
              Register with an invite
            </a>
          </p>

          {/* Access level hint */}
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Access levels
            </p>
            <div className="space-y-1.5">
              {[
                { role: "Admin",      color: "bg-red-100 text-red-700",   desc: "Full system access" },
                { role: "Manager",    color: "bg-blue-100 text-blue-700", desc: "Review, pricing & reports" },
                { role: "Technician", color: "bg-lime-100 text-lime-700", desc: "Assigned jobs only" },
              ].map((r) => (
                <div key={r.role} className="flex items-center gap-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.color}`}>
                    {r.role}
                  </span>
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
