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
import Tools from "./pages/Tools";
import SellUpgradeSimulator from "./pages/SellUpgradeSimulator";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'broker' | 'referral_partner' | 'super_admin' | 'broker_or_admin' }) {
  const { user, role, loading, isBrokerOrAdmin } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  
  // No role requirement - just needs auth
  if (!requiredRole) return <>{children}</>;
  
  // Role-based routing
  if (requiredRole === 'broker_or_admin') {
    if (isBrokerOrAdmin) return <>{children}</>;
    return <Navigate to="/dashboard" replace />;
  }
  
  // Specific role required
  if (role === requiredRole) return <>{children}</>;
  
  // Wrong role - redirect to correct dashboard
  if (isBrokerOrAdmin) return <Navigate to="/admin" replace />;
  if (role === 'referral_partner') return <Navigate to="/dashboard" replace />;
  
  // No role at all - send to home
  return <Navigate to="/" replace />;
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
            <Route path="/tools" element={
              <ProtectedRoute>
                <Tools />
              </ProtectedRoute>
            } />
            <Route path="/tools/sell-upgrade-simulator" element={
              <ProtectedRoute>
                <SellUpgradeSimulator />
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
