import { type FC, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';

// Views
import { AuthPage } from './views/AuthPage';
import { MemoryPage } from './views/MemoryPage';
import { WelcomePage } from './views/WelcomePage';
import { PlansPage } from './views/PlansPage';

// Protected Route Component
const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App: FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Routes */}

          <Route
            path="/memory"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MemoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <WelcomePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PlansPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/memory" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" expand={false} richColors closeButton />
    </AuthProvider>
  );
};

export default App;
