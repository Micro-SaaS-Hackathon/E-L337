'use client';

import Image from "next/image";
import { useAuth } from "@/lib/auth-provider";
import AuthForm from "@/components/AuthForm";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.user_metadata?.onboarding_completed) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; 
  }

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Welcome to Clippy</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in or create an account to continue
          </p>
        </div>

        <div className="flex justify-center">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}