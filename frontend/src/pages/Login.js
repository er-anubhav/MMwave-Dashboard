import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("blarex_remembered_email");
      if (savedEmail) {
        setFormData((prev) => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Please fill in both fields.");
      return;
    }

    setError("");
    setLoading(true);

    const result = await login(formData.email, formData.password);
    if (result.success) {
      try {
        if (rememberMe) {
          localStorage.setItem("blarex_remembered_email", formData.email);
        } else {
          localStorage.removeItem("blarex_remembered_email");
        }
      } catch {
        // Ignore localStorage restrictions
      }
      navigate("/");
    } else {
      setError(result.error || "Invalid credentials.");
    }

    setLoading(false);
  };

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <div className="flex h-screen h-[100dvh] items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        {/* Brand Header */}
        <div className="mb-4 text-center">
          <span className="text-xl font-normal tracking-tight text-foreground">
            BlareXSense Login
          </span>
        </div>

        {/* Shadcn Card */}
        <Card className="border-border shadow-surface">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base font-normal text-foreground">
              Sign in
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {error && (
                <Alert variant="destructive" className="py-2 px-3 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="h-10 text-sm font-normal"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="h-10 pr-12 text-sm font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  disabled={loading}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-xs text-muted-foreground font-normal cursor-pointer select-none"
                >
                  Remember me
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 font-normal text-sm"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-5 pt-4 border-t border-border/70 text-center">
              <p className="text-xs text-muted-foreground font-normal">
                Don&apos;t have an account?{" "}
                <Link
                  to="/register"
                  className="font-normal text-primary hover:underline underline-offset-4"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
