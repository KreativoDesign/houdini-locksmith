import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";

function getInviteTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("invite");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  technician: "Technician",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  technician: "bg-green-100 text-green-700 border-green-200",
};

export default function Register() {
  const [, setLocation] = useLocation();
  const inviteToken = getInviteTokenFromUrl();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is the first user (no users in DB yet) — determines if setup mode
  const firstUserQuery = trpc.auth.isFirstUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isFirstUser = firstUserQuery.data === true;

  // Validate invite token if present
  const inviteQuery = trpc.auth.validateInvite.useQuery(
    { token: inviteToken ?? "", email: email || "placeholder@example.com" },
    {
      enabled: !!inviteToken && email.includes("@"),
      retry: false,
    }
  );

  // Pre-fill email from invite URL param if available
  useEffect(() => {
    if (inviteToken) {
      const params = new URLSearchParams(window.location.search);
      const preEmail = params.get("email");
      if (preEmail) setEmail(decodeURIComponent(preEmail));
    }
  }, [inviteToken]);

  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success(`Account created! Welcome, ${data.user.name ?? data.user.email}!`);
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

    if (!name.trim()) { setError("Full name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("A valid email address is required"); return; }
    if (password.length < 12) { setError("Password must be at least 12 characters"); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter"); return; }
    if (!/[a-z]/.test(password)) { setError("Password must contain at least one lowercase letter"); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number"); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError("Password must contain at least one special character"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    registerMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      inviteToken: inviteToken ?? undefined,
    });
  };

  const inviteValid = inviteQuery.data?.valid;
  const inviteRole = inviteQuery.data?.role;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: dark + mascot ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0a0f0a 0%, #0d1a0d 50%, #0a1205 100%)" }}
      >
        {/* Subtle radial glow */}
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
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
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
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
            alt="Houdini mascot holding the logo"
            className="w-64 h-auto object-contain drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 0 40px oklch(0.73 0.22 130 / 0.5))" }}
          />
        </div>

        {/* Bottom: contextual instructions */}
        <div className="relative z-10 px-10 pb-10 space-y-5">
          {isFirstUser ? (
            <>
              <div>
                <h2 className="text-xl font-bold text-white leading-snug">Welcome to Houdini.</h2>
                <p className="text-sm text-white/55 mt-1">You're the first user — your account will be set up as Administrator.</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Invite Managers and Technicians",
                  "Manage all departments and job cards",
                  "Approve pricing and view audit logs",
                  "Configure the entire system",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.73 0.22 130)" }} />
                    <span className="text-sm text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-white leading-snug">Join the team. Get to work.</h2>
                <p className="text-sm text-white/55 mt-1">Create your account to access the Houdini operations platform.</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Passwords are bcrypt-hashed (cost 12)",
                  "Sessions expire after 7 days",
                  "All logins are audit-logged",
                  "Your role is pre-configured by your admin",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.73 0.22 130)" }} />
                    <span className="text-sm text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-white/25 text-xs pt-2">© {new Date().getFullYear()} Houdini Locksmith & Security</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
              alt="Houdini logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-bold text-foreground text-lg">Houdini Locksmith</span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              {isFirstUser ? (
                <Shield className="w-5 h-5 text-primary" />
              ) : (
                <UserPlus className="w-5 h-5 text-primary" />
              )}
              <h2 className="text-2xl font-bold text-foreground">
                {isFirstUser ? "Create admin account" : "Create your account"}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {isFirstUser
                ? "You're the first user — you'll be set up as Administrator."
                : inviteToken
                  ? "You've been invited to join Houdini. Complete the form below."
                  : "Register with an invite link from your administrator."}
            </p>
          </div>

          {/* First-user admin notice */}
          {isFirstUser && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">First-time setup</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This account will be created with <strong>Administrator</strong> role automatically.
                </p>
              </div>
            </div>
          )}

          {/* Invite status banner */}
          {!isFirstUser && inviteToken && inviteRole && inviteValid && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Valid invite link</p>
                <p className="text-xs text-green-700 mt-0.5">
                  You will be registered as{" "}
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[inviteRole] ?? ""}`}>
                    {ROLE_LABELS[inviteRole] ?? inviteRole}
                  </span>
                </p>
              </div>
            </div>
          )}

          {!isFirstUser && inviteToken && inviteQuery.data && !inviteValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {inviteQuery.data.error ?? "This invite link is invalid or has expired."}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@houdini.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={registerMutation.isPending}
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
              {/* Password strength hints */}
              {password.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: "12+ chars", ok: password.length >= 12 },
                    { label: "Uppercase", ok: /[A-Z]/.test(password) },
                    { label: "Lowercase", ok: /[a-z]/.test(password) },
                    { label: "Number", ok: /[0-9]/.test(password) },
                    { label: "Special", ok: /[^A-Za-z0-9]/.test(password) },
                  ].map((hint) => (
                    <span
                      key={hint.label}
                      className={`text-xs flex items-center gap-1 ${hint.ok ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${hint.ok ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      {hint.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={registerMutation.isPending}
                className={`h-11 ${confirmPassword && confirmPassword !== password ? "border-destructive" : ""}`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={registerMutation.isPending || firstUserQuery.isLoading}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account…
                </>
              ) : isFirstUser ? (
                "Create admin account"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary font-medium hover:underline"
              onClick={(e) => { e.preventDefault(); setLocation("/login"); }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
