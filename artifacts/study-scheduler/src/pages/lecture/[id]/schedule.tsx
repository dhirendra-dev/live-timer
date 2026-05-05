import { useStore, useLecture, useLectureSessions, Session } from "@/hooks/use-store";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/lib/youtube";
import { ArrowLeft, Plus, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ScheduleSessions() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const lecture = useLecture(id);
  const existingSessions = useLectureSessions(id);
  const { addSession } = useStore();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(45);

  if (!lecture) {
    return <div>Lecture not found</div>;
  }

  const scheduledDuration = existingSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const unscheduledDuration = Math.max(0, lecture.totalDurationSeconds - scheduledDuration);
  
  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    const durationSeconds = durationMinutes * 60;
    
    if (durationSeconds <= 0) {
      toast({ title: "Invalid Duration", description: "Duration must be greater than 0.", variant: "destructive" });
      return;
    }

    if (durationSeconds > unscheduledDuration) {
      toast({ 
        title: "Duration Too Long", 
        description: `You only have ${Math.floor(unscheduledDuration / 60)} minutes left to schedule for this lecture.`, 
        variant: "destructive" 
      });
      return;
    }

    // Auto-calculate start offset by summing previous sessions
    const startOffset = scheduledDuration;

    const newSession: Session = {
      id: crypto.randomUUID(),
      lectureId: lecture.id,
      date,
      startTime: time,
      durationSeconds,
      startOffset,
      status: "upcoming",
      watchedSeconds: 0,
    };

    addSession(newSession);
    toast({ title: "Session Scheduled", description: "Added to your study plan." });
    setLocation(`/lecture/${lecture.id}`);
  };

  const autoFillRemaining = () => {
    setDurationMinutes(Math.ceil(unscheduledDuration / 60));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href={`/lecture/${lecture.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Session</h1>
          <p className="text-muted-foreground">{lecture.title}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-sm font-medium text-primary">Unscheduled Content</p>
            <p className="text-3xl font-bold text-primary mt-1">{formatDuration(unscheduledDuration)}</p>
            <p className="text-xs text-primary/70 mt-1">Remaining to be planned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Scheduled</p>
            <p className="text-3xl font-bold mt-1">{formatDuration(scheduledDuration)}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {existingSessions.length} sessions</p>
          </CardContent>
        </Card>
      </div>

      {unscheduledDuration <= 0 ? (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">Fully Scheduled!</h3>
            <p className="text-muted-foreground">You've scheduled all content for this lecture.</p>
            <Link href={`/lecture/${lecture.id}`}>
              <Button>Back to Lecture</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSchedule}>
            <CardHeader>
              <CardTitle>New Session Details</CardTitle>
              <CardDescription>Plan your next block of focus time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2"><Clock className="h-4 w-4" /> Start Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Button type="button" variant="link" size="sm" onClick={autoFillRemaining} className="h-auto p-0 text-xs">
                    Use all remaining
                  </Button>
                </div>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max={Math.ceil(unscheduledDuration / 60)}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This session will cover video content from {formatDuration(scheduledDuration)} to {formatDuration(scheduledDuration + durationMinutes * 60)}.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Link href={`/lecture/${lecture.id}`}>
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit"><Plus className="h-4 w-4 mr-2" /> Add to Schedule</Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
