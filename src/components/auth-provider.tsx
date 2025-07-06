
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from './app-sidebar';
import { Flower2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
     return (
        <div className="flex items-center justify-center h-screen w-full">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Flower2 className="w-12 h-12 text-primary" />
                <p className="text-muted-foreground">Loading Bloomora...</p>
            </div>
        </div>
     );
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <AuthContext.Provider value={{ user, loading }}>
        {isAuthPage || !user ? (
            children
        ) : (
            <AppSidebar>
                {children}
            </AppSidebar>
        )}
    </AuthContext.Provider>
  );
}
