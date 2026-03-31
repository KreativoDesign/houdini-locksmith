import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Password changed successfully");
      setCurrent(""); setNext(""); setConfirm("");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) { setError("Current password is required"); return; }
    if (next.length < 12) { setError("New password must be at least 12 characters"); return; }
    if (!/[A-Z]/.test(next)) { setError("Password must contain at least one uppercase letter"); return; }
    if (!/[a-z]/.test(next)) { setError("Password must contain at least one lowercase letter"); return; }
    if (!/[0-9]/.test(next)) { setError("Password must contain at least one number"); return; }
    if (!/[^A-Za-z0-9]/.test(next)) { setError("Password must contain at least one special character"); return; }
    if (next !== confirm) { setError("New passwords do not match"); return; }
    mutation.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Change Password</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your account password.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Update Password</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Minimum 12 characters with uppercase, lowercase, number, and special character.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <div className="text-center">
                <p className="font-medium text-foreground">Password updated</p>
                <p className="text-sm text-muted-foreground mt-1">Your password has been changed successfully.</p>
              </div>
              <Button onClick={() => setLocation("/dashboard")} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="current">Current password</Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={show ? "text" : "password"}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    disabled={mutation.isPending}
                    className="h-11 pr-11"
                    placeholder="Your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new">New password</Label>
                <Input
                  id="new"
                  type={show ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  disabled={mutation.isPending}
                  className="h-11"
                  placeholder="At least 12 characters"
                />
                {next.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "12+ chars", ok: next.length >= 12 },
                      { label: "Uppercase", ok: /[A-Z]/.test(next) },
                      { label: "Lowercase", ok: /[a-z]/.test(next) },
                      { label: "Number", ok: /[0-9]/.test(next) },
                      { label: "Special", ok: /[^A-Za-z0-9]/.test(next) },
                    ].map((hint) => (
                      <span key={hint.label} className={`text-xs flex items-center gap-1 ${hint.ok ? "text-green-600" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hint.ok ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                        {hint.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={mutation.isPending}
                  className={`h-11 ${confirm && confirm !== next ? "border-destructive" : ""}`}
                  placeholder="Repeat new password"
                />
                {confirm && confirm !== next && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
                ) : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
