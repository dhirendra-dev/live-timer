import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Monitor, Bell, Download, Upload } from "lucide-react";
import { useRef } from "react";

export default function SettingsPage() {
  const { settings, updateSettings, lectures, sessions } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeToggle = (checked: boolean) => {
    updateSettings({ ...settings, theme: checked ? "dark" : "light" });
  };

  const handleNotificationsToggle = async (checked: boolean) => {
    if (checked) {
      if (!("Notification" in window)) {
        toast({ title: "Not Supported", description: "This browser does not support notifications.", variant: "destructive" });
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        updateSettings({ ...settings, notificationsEnabled: true });
        toast({ title: "Notifications Enabled", description: "You will receive reminders 10 minutes before sessions." });
      } else {
        toast({ title: "Permission Denied", description: "Please enable notifications in your browser settings.", variant: "destructive" });
      }
    } else {
      updateSettings({ ...settings, notificationsEnabled: false });
    }
  };

  const handleExport = () => {
    const data = {
      lectures,
      sessions,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-scheduler-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Your data has been downloaded." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.lectures && data.sessions) {
          localStorage.setItem("study_lectures", JSON.stringify(data.lectures));
          localStorage.setItem("study_sessions", JSON.stringify(data.sessions));
          if (data.settings) {
            localStorage.setItem("study_settings", JSON.stringify(data.settings));
          }
          toast({ title: "Import Successful", description: "Your data has been restored. Reloading..." });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        toast({ title: "Import Failed", description: "The file is not a valid Study Scheduler export.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your app preferences and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Appearance</CardTitle>
          <CardDescription>Customize how the app looks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
            </div>
            <Switch checked={settings.theme === "dark"} onCheckedChange={handleThemeToggle} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
          <CardDescription>Manage your session reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Session Reminders</Label>
              <p className="text-sm text-muted-foreground">Get notified 10 minutes before a scheduled session starts.</p>
            </div>
            <Switch checked={settings.notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Data Management</CardTitle>
          <CardDescription>Export your schedule or restore from a backup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <Button variant="outline" className="flex-1 flex gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Data
          </Button>
          <Button variant="outline" className="flex-1 flex gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import Data
          </Button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
        </CardContent>
      </Card>
    </div>
  );
}
