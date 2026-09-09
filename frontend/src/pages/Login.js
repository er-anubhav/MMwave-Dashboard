import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Activity, AlertCircle, Eye, EyeOff, HeartPulse, ShieldCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* Left Column: Branding, Hero & Feature Highlights */}
      <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-border/70 bg-card/20">
        {/* Brand Header Lockup */}
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm"
            >
              B
            </span>
            <div>
              <span className="block text-base font-bold leading-tight tracking-tight text-foreground">
                BlareXSense
              </span>
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mt-0.5">
                SAAS PORTAL
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="my-8 lg:my-auto max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-[1.15]">
            Smart Presence &amp; Vital <span className="block">Insights.</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base leading-relaxed text-muted-foreground">
            Access real-time radar telemetry, vital sign anomalies, and automated fall detection metrics in one consolidated interface.
          </p>

          <div className="mt-8 pt-8 border-t border-border/80">
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary border border-border/50 shadow-surface-sm">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Real-Time Telemetry Logs</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Stream activity scores and switch states instantly.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary border border-border/50 shadow-surface-sm">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Fall Detection Alerting</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Secure automations to trigger alarms upon critical events.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary border border-border/50 shadow-surface-sm">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Sleep &amp; Breathing Analytics</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Passive monitoring for sleep quality and vital anomalies.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Left Column Footer */}
        <div className="hidden lg:block pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} BlareXSense. All rights reserved.
        </div>
      </div>

      {/* Right Column: Centered Login Card */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-16">
        <Card className="w-full max-w-[440px] border-border shadow-surface bg-card">
          <CardHeader className="space-y-1.5 p-6 sm:p-8 pb-4 sm:pb-4">
            <CardTitle id="login-heading" className="text-2xl font-bold tracking-tight text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground">
              Enter your credentials to manage your device matrix.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6 sm:px-8 pb-0">
              {error && (
                <Alert variant="destructive" className="rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {typeof error === "string" ? error : "An error occurred"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="er.tripathianubhav@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 p-6 sm:p-8 pt-6 sm:pt-6">
              <Button type="submit" className="w-full h-10 text-sm font-semibold" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create one here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Mobile Footer */}
      <div className="block lg:hidden p-6 text-center text-xs text-muted-foreground border-t border-border/50">
        © {new Date().getFullYear()} BlareXSense. All rights reserved.
      </div>
    </div>
  );
}

