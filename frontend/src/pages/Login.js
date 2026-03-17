import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Login() {
 const navigate = useNavigate();
 const { login } = useAuth();
 const [formData, setFormData] = useState({
 email: '',
 password: ''
 });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

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
 <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
 <Card className="w-full max-w-md">
 <CardHeader className="space-y-1">
 <CardTitle className="text-base text-black">Login</CardTitle>
 <CardDescription>
 Enter your email and password to access your dashboard
 </CardDescription>
 </CardHeader>
 <form onSubmit={handleSubmit}>
 <CardContent className="space-y-4">
 {error && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>
 {typeof error === 'string' ? error : 'An error occurred'}
 </AlertDescription>
 </Alert>
 )}

 <div className="space-y-2">
 <Label htmlFor="email">Email</Label>
 <Input
 id="email"
 name="email"
 type="email"
 placeholder="you@example.com"
 value={formData.email}
 onChange={handleChange}
 required
 disabled={loading}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="password">Password</Label>
 <Input
 id="password"
 name="password"
 type="password"
 placeholder="••••••••"
 value={formData.password}
 onChange={handleChange}
 required
 disabled={loading}
 />
 </div>
 </CardContent>

 <CardFooter className="flex flex-col space-y-4">
 <Button type="submit" className="w-full" disabled={loading}>
 {loading ? 'Logging in...' : 'Login'}
 </Button>

 <p className="text-sm text-center text-gray-600">
 Don't have an account?{' '}
 <Link to="/register" className="text-blue-600 hover:underline">
 Register here
 </Link>
 </p>
 </CardFooter>
 </form>
 </Card>
 </div>
 );
}
