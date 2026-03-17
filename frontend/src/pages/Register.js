import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register() {
 const navigate = useNavigate();
 const { register } = useAuth();
 const [formData, setFormData] = useState({
 name: '',
 email: '',
 password: '',
 confirmPassword: ''
 });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const validatePassword = (password) => {
 const minLength = password.length >= 8;
 const hasUpperCase = /[A-Z]/.test(password);
 const hasLowerCase = /[a-z]/.test(password);
 const hasNumber = /[0-9]/.test(password);
 const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

 return {
 minLength,
 hasUpperCase,
 hasLowerCase,
 hasNumber,
 hasSpecialChar,
 isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
 };
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setError('');

 if (formData.password !== formData.confirmPassword) {
 setError('Passwords do not match');
 return;
 }

 const passwordValidation = validatePassword(formData.password);
 if (!passwordValidation.isValid) {
 setError('Password does not meet requirements');
 return;
 }

 setLoading(true);

 const result = await register(formData.email, formData.password, formData.name);

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

 const passwordValidation = validatePassword(formData.password);

 return (
 <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
 <Card className="w-full max-w-md">
 <CardHeader className="space-y-1">
 <CardTitle className="text-base text-black">Create an account</CardTitle>
 <CardDescription>
 Enter your information to create a new account
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
 <Label htmlFor="name">Full Name</Label>
 <Input
 id="name"
 name="name"
 type="text"
 placeholder="John Doe"
 value={formData.name}
 onChange={handleChange}
 required
 disabled={loading}
 />
 </div>

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
 
 {formData.password && (
 <div className="text-sm space-y-1 mt-2">
 <PasswordRequirement met={passwordValidation.minLength}>
 At least 8 characters
 </PasswordRequirement>
 <PasswordRequirement met={passwordValidation.hasUpperCase}>
 One uppercase letter
 </PasswordRequirement>
 <PasswordRequirement met={passwordValidation.hasLowerCase}>
 One lowercase letter
 </PasswordRequirement>
 <PasswordRequirement met={passwordValidation.hasNumber}>
 One number
 </PasswordRequirement>
 <PasswordRequirement met={passwordValidation.hasSpecialChar}>
 One special character
 </PasswordRequirement>
 </div>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="confirmPassword">Confirm Password</Label>
 <Input
 id="confirmPassword"
 name="confirmPassword"
 type="password"
 placeholder="••••••••"
 value={formData.confirmPassword}
 onChange={handleChange}
 required
 disabled={loading}
 />
 </div>
 </CardContent>

 <CardFooter className="flex flex-col space-y-4">
 <Button type="submit" className="w-full" disabled={loading}>
 {loading ? 'Creating account...' : 'Register'}
 </Button>

 <p className="text-sm text-center text-gray-600">
 Already have an account?{' '}
 <Link to="/login" className="text-blue-600 hover:underline">
 Login here
 </Link>
 </p>
 </CardFooter>
 </form>
 </Card>
 </div>
 );
}

function PasswordRequirement({ met, children }) {
 return (
 <div className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-gray-500'}`}>
 <CheckCircle2 className={`h-3 w-3 ${met ? '' : 'opacity-30'}`} />
 <span>{children}</span>
 </div>
 );
}
