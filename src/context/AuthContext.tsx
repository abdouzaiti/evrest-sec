import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  activeRole: 'director' | 'secretary';
  switchRole: (role: 'director' | 'secretary') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'director' | 'secretary'>('director');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking session
    const savedUserStr = localStorage.getItem('user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && (savedUser.email === 'mohamed@everest.dz' || savedUser.email === 'secretary@everest.dz')) {
          setUser(savedUser);
          setActiveRole(savedUser.role);
        } else {
          localStorage.removeItem('user');
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const normalizedUsername = username.toLowerCase().trim();
    if (normalizedUsername === 'mohamed' && password === 'mostarunclub') {
      const mockUser: User = {
        uid: '1',
        email: 'mohamed@everest.dz',
        displayName: 'Directeur Mohamed',
        role: 'director'
      };
      setUser(mockUser);
      setActiveRole('director');
      localStorage.setItem('user', JSON.stringify(mockUser));
      setIsLoading(false);
    } else if ((normalizedUsername === 'secretary' || normalizedUsername === 'secretaire') && password === 'everest123') {
      const mockUser: User = {
        uid: '2',
        email: 'secretary@everest.dz',
        displayName: 'Sécrétariat Everest',
        role: 'secretary'
      };
      setUser(mockUser);
      setActiveRole('secretary');
      localStorage.setItem('user', JSON.stringify(mockUser));
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const switchRole = (role: 'director' | 'secretary') => {
    setActiveRole(role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, activeRole, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
