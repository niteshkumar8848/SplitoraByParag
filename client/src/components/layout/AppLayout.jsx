import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Chatbot from "../chatbot/Chatbot";
import useAuth from "../../hooks/useAuth";

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-100">
      <Sidebar user={user} />

      <div className="md:pl-64">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        {isSidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-surface-900/40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <Sidebar user={user} mobile onClose={() => setIsSidebarOpen(false)} />
          </>
        ) : null}

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* AI Chatbot — available on every protected page */}
      <Chatbot />
    </div>
  );
}
