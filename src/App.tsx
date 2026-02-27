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
import AdminSettings from "./pages/AdminSettings";
import SubmitReferral from "./pages/SubmitReferral";
import NotFound from "./pages/NotFound";
import Preview from "./pages/Preview";
import Tools from "./pages/Tools";
import SellUpgradeSimulator from "./pages/SellUpgradeSimulator";
import LoanRepaymentCalculator from "./pages/LoanRepaymentCalculator";
import StampDutyCalculator from "./pages/StampDutyCalculator";
import NegativeGearingCalculator from "./pages/NegativeGearingCalculator";
import Settlements from "./pages/Settlements";
import ClientPortal from "./pages/ClientPortal";
import PortfolioAdvisor from "./pages/PortfolioAdvisor";
const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'broker' | 'referral_partner' | 'super_admin' | 'broker_or_admin' | 'broker_staff' }) {
  const { user, role, loading, isBrokerOrAdmin, isPreviewMode } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user && !isPreviewMode) return <Navigate to="/login" replace />;
  
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
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="broker_or_admin">
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/settlements" element={
              <ProtectedRoute requiredRole="broker_or_admin">
                <Settlements />
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
            <Route path="/tools/loan-repayment" element={
              <ProtectedRoute>
                <LoanRepaymentCalculator />
              </ProtectedRoute>
            } />
            <Route path="/tools/stamp-duty" element={
              <ProtectedRoute>
                <StampDutyCalculator />
              </ProtectedRoute>
            } />
            <Route path="/tools/negative-gearing" element={
              <ProtectedRoute requiredRole="broker_or_admin">
                <NegativeGearingCalculator />
              </ProtectedRoute>
            } />
            <Route path="/tools/portfolio-advisor" element={
              <ProtectedRoute requiredRole="broker_or_admin">
                <PortfolioAdvisor />
              </ProtectedRoute>
            } />
            <Route path="/preview" element={<Preview />} />
            <Route path="/client-portal/:token" element={<ClientPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
