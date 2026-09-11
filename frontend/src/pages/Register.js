import React, { useState } from "react";
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
import { Alert, AlertDescription } from "../components/ui/alert";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await register(formData.email, formData.password, formData.name);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "An error occurred during registration.");
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="flex h-screen h-[100dvh] items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        {/* Brand Header */}
        <div className="mb-4 text-center">
          <span className="text-xl font-normal tracking-tight text-foreground">
            BlareXSense Sign Up
          </span>
        </div>

        {/* Shadcn Card */}
        <Card className="border-border shadow-surface">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base font-normal text-foreground">
              Sign up
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {error && (
                <Alert variant="destructive" className="py-2 px-3 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="h-10 text-sm font-normal"
                />
              </div>

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
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="h-10 pr-12 text-sm font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 font-normal text-sm"
              >
                {loading ? "Creating account…" : "Sign up"}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-5 pt-4 border-t border-border/70 text-center">
              <p className="text-xs text-muted-foreground font-normal">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-normal text-primary hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}