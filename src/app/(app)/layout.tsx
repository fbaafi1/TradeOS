import React from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Main content — offset for desktop sidebar (w-56), top bar on mobile (h-14) */}
      <main className="md:pl-56">
        <div className="mx-auto max-w-screen-xl px-4 py-6 pt-20 md:pt-6 md:px-6 lg:px-8 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
