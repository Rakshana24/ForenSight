import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  user_id: string;
  email_id: string;
  first_name: string;
  last_name: string;
  role_details?: {
    role_id: string;
    role_name: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (typeof window.catalyst !== 'undefined') {
          const response = await window.catalyst.auth.isUserAuthenticated();
          setUser(response.content);
        } else {
          console.warn('Catalyst SDK not loaded');
        }
      } catch (err) {
        console.warn('User not authenticated, redirecting to login...', err);
        window.location.href = 'https://forensight-60076316494.development.catalystserverless.in/__catalyst/auth/login';
      } finally {
        setLoading(false);
      }
    };

    // Wait a brief moment to ensure window.catalyst is populated by the injected scripts
    const timer = setTimeout(() => {
      checkAuth();
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const logout = () => {
    setUser(null);
    if (typeof window.catalyst !== 'undefined') {
      window.catalyst.auth.signOut(window.location.origin + '/app/index.html');
    } else {
      window.location.href = 'https://forensight-60076316494.development.catalystserverless.in/__catalyst/auth/login';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        background: '#0F0F13',
        color: '#38BDF8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>Connecting to Catalyst Authentication...</h3>
        <p style={{ color: '#1E3A8A', marginTop: '10px', fontSize: '0.9rem' }}>Please wait while we verify your session.</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
