import { Suspense } from "react";
import { AdminPasswordSetupForm } from "@/src/modules/auth/components/AdminPasswordSetupForm";

export default function AdminCompleteRegistrationPage() {
  return (
    <main className="min-h-screen bg-[var(--cms-bg-page)] px-6 py-16 text-[var(--cms-text-primary)]">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
        <Suspense fallback={null}>
          <AdminPasswordSetupForm mode="complete-registration" />
        </Suspense>
      </section>
    </main>
  );
}
