import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 pt-20 md:pt-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
