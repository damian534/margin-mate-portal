import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import PartnerDashboard from "./pages/PartnerDashboard";
import AdminCRM from "./pages/AdminCRM";
import SubmitReferral from "./pages/SubmitReferral";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'broker' | 'referral_partner' | 'super_admin' | 'broker_or_admin' }) {
  const { user, role, loading, isBrokerOrAdmin, isCodeAccess } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user && !isCodeAccess) return <Navigate to="/login" />;
  // If user is authenticated but role hasn't loaded yet, keep showing loading
  if (requiredRole && user && !role && !isCodeAccess) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  // Redirect mismatched roles to their correct dashboard instead of home
  if (requiredRole === 'broker_or_admin' && !isBrokerOrAdmin) {
    return role === 'referral_partner' ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
  }
  if (requiredRole && requiredRole !== 'broker_or_admin' && role !== requiredRole) {
    return isBrokerOrAdmin ? <Navigate to="/admin" /> : <Navigate to="/login" />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="referral_partner">
                <PartnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="broker_or_admin">
                <AdminCRM />
              </ProtectedRoute>
            } />
            <Route path="/submit-referral" element={
              <ProtectedRoute>
                <SubmitReferral />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
