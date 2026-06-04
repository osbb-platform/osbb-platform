import { Suspense } from "react";
import { AdminPasswordSetupForm } from "@/src/modules/auth/components/AdminPasswordSetupForm";

export default function AdminResetPasswordPage() {
  return (
    <main className="cms-theme-root min-h-screen bg-[var(--cms-bg)] px-6 py-16 text-[var(--cms-text)]">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
        <Suspense fallback={null}>
          <AdminPasswordSetupForm mode="reset" />
        </Suspense>
      </section>
    </main>
  );
}
