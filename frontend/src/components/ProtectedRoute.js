import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
 const { isAuthenticated, loading } = useAuth();

 if (loading) {
 return (
 <div className="flex min-h-screen items-center justify-center">
 <div className="text-center">
 <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
 <p className="text-sm text-muted-foreground">Loading…</p>
 </div>
 </div>
 );
 }

 if (!isAuthenticated) {
 return <Navigate to="/login" replace />;
 }
 return children;
}