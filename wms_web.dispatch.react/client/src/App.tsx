import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { useAuth } from './context/AuthContext';
import AppHeader from './layout/AppHeader';
import AppSidebar from './layout/AppSidebar';
import SessionManager from './components/SessionManager';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Parcels from './pages/Parcels';
import BranchParcels from './pages/BranchParcels';
import CreateDispatch from './pages/CreateDispatch';
import ViewDispatch from './pages/ViewDispatch';
import ContractCustomers from './pages/ContractCustomers';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import FinancialDashboard from './pages/FinancialDashboard';
import PaymentsManagement from './pages/PaymentsManagement';
import ExpensesManagement from './pages/ExpensesManagement';
import Reports from './pages/Reports';
import SMSMessaging from './pages/SMSMessaging';
import UserManagement from './pages/UserManagement';
import AdminParcelManagement from './pages/AdminParcelManagement';
import NotFound from './pages/NotFound';

// Protected Route component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, canAccessMenu } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Use the canAccessMenu function instead of manual role checking
  if (allowedRoles && user) {
    const currentPath = window.location.pathname;
    if (!canAccessMenu(currentPath)) {
      return <Navigate to="/dashboard" />;
    }
  }

  return <>{children}</>;
};

// Modern Layout with Green Theme - Like Django but better
const ModernLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <SidebarProvider>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>
        {/* Green-themed Sidebar like Django */}
        <AppSidebar />
        
        {/* Main content area */}
        <div className="lg:ml-[290px] transition-all duration-300">
          {/* Header */}
          <AppHeader darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          
          {/* Page content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SessionManager>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
          {/* Login page without layout */}
          <Route path="/login" element={<Login />} />
          
          {/* All authenticated pages with modern green layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <Dashboard />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parcels"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <Parcels />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/branch-parcels"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <BranchParcels />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatches/create"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <CreateDispatch />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatches/view"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <ViewDispatch />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contract-customers"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <ContractCustomers />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-dashboard"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <FinancialDashboard />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <Invoices />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/create"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <CreateInvoice />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <PaymentsManagement />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <ExpensesManagement />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <Reports />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sms-messaging"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <SMSMessaging />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <UserManagement />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parcels"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <AdminParcelManagement />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ModernLayout>
                  <NotFound />
                </ModernLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SessionManager>
    </AuthProvider>
  );
};

export default App;
