import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
 const { isAuthenticated, loading } = useAuth();

 console.log('ProtectedRoute check:', { isAuthenticated, loading });

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="text-center">
 <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
 <p className="text-gray-600">Loading...</p>
 </div>
 </div>
 );
 }

 if (!isAuthenticated) {
 console.log('User not authenticated, redirecting to login');
 return <Navigate to="/login" replace />;
 }

 console.log('User authenticated, rendering protected content');
 return children;
}
