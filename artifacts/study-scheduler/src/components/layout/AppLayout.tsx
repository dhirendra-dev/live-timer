import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, Plus, Settings as SettingsIcon } from "lucide-react";
import { useStore } from "../../hooks/use-store";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings } = useStore();

  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <BookOpen size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">StudyScheduler</span>
        </div>
        
        <nav className="p-4 flex-1 flex flex-col gap-2">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${location === '/' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link href="/lecture/new" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${location === '/lecture/new' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <Plus size={18} />
            <span>Add Lecture</span>
          </Link>
          <div className="flex-1" />
          <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${location === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <SettingsIcon size={18} />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>
      
      <main className="flex-1 overflow-auto">
        <div className="container max-w-5xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
