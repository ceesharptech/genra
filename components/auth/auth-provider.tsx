"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { identifyUser, resetUser } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  initialUser,
  initialProfile,
  children,
}: {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  const lastIdentifiedRef = React.useRef<string | null>(initialUser?.id ?? null);

  // Identify on initial render if user already authenticated
  useEffect(() => {
    if (initialUser?.id) {
      identifyUser(initialUser.id);
    }
  }, [initialUser?.id]);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      const currentUserId = currentUser?.id ?? null;
      if (currentUserId && currentUserId !== lastIdentifiedRef.current) {
        lastIdentifiedRef.current = currentUserId;
        identifyUser(currentUserId);
      } else if (!currentUserId && lastIdentifiedRef.current !== null) {
        lastIdentifiedRef.current = null;
        resetUser();
      }

      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        setProfile(data ?? null);
      } else {
        setProfile(null);
      }

      startTransition(() => {
        router.refresh();
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async () => {
    setIsLoading(true);
    try {
      lastIdentifiedRef.current = null;
      resetUser();
      // 1. Sign out on the browser client to clear localStorage/storage and notify listeners
      await supabase.auth.signOut();
      // 2. Sign out on the server to clear auth cookies
      await signOutAction();
      // 3. Immediately clear React auth state
      setUser(null);
      setProfile(null);
      // 4. Navigate to home and flush Server Components cache
      router.replace("/");
      router.refresh();
    } catch {
      lastIdentifiedRef.current = null;
      resetUser();
      setUser(null);
      setProfile(null);
      router.replace("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
