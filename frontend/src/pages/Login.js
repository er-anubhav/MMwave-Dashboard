import { useEffect,  useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Eye, EyeOff, ShieldCheck, Heart, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background flex items-stretch justify-center relative isolate overflow-hidden">
      {/* Background glowing orbs */}
      <div className="glow-orb bg-emerald-500/10 dark:bg-emerald-500/5 top-[-10%] left-[-10%]"></div>
      <div className="glow-orb bg-blue-500/10 dark:bg-blue-500/5 bottom-[-10%] right-[-10%]"></div>

      {/* Left Pane - Marketing / Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 dark:bg-zinc-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/40 via-transparent to-transparent opacity-70"></div>
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]"></div>

        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 relative z-10"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white  text-lg shadow-lg">
            L
          </div>
          <div>
            <span className=" text-lg tracking-wide">LYFSense</span>
            <span className="block text-[10px] text-emerald-400  tracking-widest uppercase">SaaS Portal</span>
          </div>
        </motion.div>

        <div className="space-y-8 relative z-10 my-auto max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl  leading-tight tracking-tight text-white"
          >
            Smart Presence & Vital Insights.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-gray-400 text-base"
          >
            Access real-time radar telemetry, vital sign anomalies, and automated fall detection metrics in one consolidated interface.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-4 pt-6 border-t border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Activity size={20} />
              </div>
              <div>
                <h4 className="text-sm ">Real-Time Telemetry Logs</h4>
                <p className="text-xs text-gray-400">Stream activity scores and switch states instantly.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm ">Fall Detection Alerting</h4>
                <p className="text-xs text-gray-400">Secure automations to trigger alarms upon critical events.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Heart size={20} />
              </div>
              <div>
                <h4 className="text-sm ">Sleep & Breathing Analytics</h4>
                <p className="text-xs text-gray-400">Passive monitoring for sleep quality and vital anomalies.</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-xs text-gray-500 relative z-10"
        >
          © 2026 LYFSense. All rights reserved.
        </motion.p>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-background z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-2xl border-gray-200/60 dark:border-border/60 shadow-xl glass-card">
            <CardHeader className="space-y-1.5 pb-6">
              <div className="lg:hidden flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white  text-sm">
                  L
                </div>
                <span className=" text-black dark:text-primary tracking-wide text-sm">LYFSense</span>
              </div>
              <CardTitle className="text-xl  text-black dark:text-primary">Welcome Back</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400 text-sm">
                Enter your credentials to manage your device matrix.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {typeof error === 'string' ? error : 'An error occurred'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs  text-gray-700 dark:text-zinc-300">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="rounded-xl bg-white/50 dark:bg-background/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 dark:border-border dark:focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs  text-gray-700 dark:text-zinc-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="rounded-xl bg-white/50 dark:bg-background/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 dark:border-border dark:focus:border-primary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button type="submit" className="w-full rounded-xl py-2.5  text-sm shadow-md bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:text-black dark:hover:bg-primary/95" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-emerald-600 dark:text-emerald-400  hover:underline">
                    Create one here
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
