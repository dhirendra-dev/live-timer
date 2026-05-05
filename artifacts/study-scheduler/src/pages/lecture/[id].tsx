import { useStore, useLecture, useLectureSessions } from "@/hooks/use-store";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay } from "date-fns";
import { formatDuration } from "@/lib/youtube";
import { Calendar as CalendarIcon, Clock, List, LayoutGrid, PlayCircle, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";

export default function LectureDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const lecture = useLecture(id);
  const sessions = useLectureSessions(id);
  const { deleteLecture, deleteSession } = useStore();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  if (!lecture) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Lecture not found</h2>
        <Button onClick={() => setLocation("/")}>Return to Dashboard</Button>
      </div>
    );
  }

  const completedDuration = sessions
    .filter(s => s.status === "completed")
    .reduce((acc, s) => acc + s.durationSeconds, 0);

  const scheduledDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const progress = lecture.totalDurationSeconds > 0 ? (completedDuration / lecture.totalDurationSeconds) * 100 : 0;
  const unscheduledDuration = Math.max(0, lecture.totalDurationSeconds - scheduledDuration);

  const handleDeleteLecture = () => {
    if (confirm("Are you sure you want to delete this lecture and all its sessions?")) {
      deleteLecture(lecture.id);
      setLocation("/");
    }
  };

  const selectedDateSessions = selectedDate 
    ? sessions.filter(s => isSameDay(parseISO(s.date), selectedDate))
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{lecture.title}</h1>
          <p className="text-muted-foreground">{lecture.subject}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/lecture/${lecture.id}/schedule`}>
            <Button><Plus className="h-4 w-4 mr-2" /> Schedule</Button>
          </Link>
          <Button variant="destructive" size="icon" onClick={handleDeleteLecture}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(progress)}% ({formatDuration(completedDuration)} / {formatDuration(lecture.totalDurationSeconds)})</span>
            </div>
            <Progress value={progress} className="h-3" />
            {unscheduledDuration > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-500">
                You have {formatDuration(unscheduledDuration)} left to schedule.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <div className="flex bg-muted p-1 rounded-md">
          <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")} className="px-3 py-1 h-8">
            <List className="h-4 w-4 mr-2" /> List
          </Button>
          <Button variant={view === "calendar" ? "secondary" : "ghost"} size="sm" onClick={() => setView("calendar")} className="px-3 py-1 h-8">
            <CalendarIcon className="h-4 w-4 mr-2" /> Calendar
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CalendarIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No sessions scheduled</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Divide this lecture into manageable study sessions to stay on track.</p>
            <Link href={`/lecture/${lecture.id}/schedule`}>
              <Button>Create Schedule</Button>
            </Link>
          </CardContent>
        </Card>
      ) : view === "list" ? (
        <div className="grid gap-3">
          {sessions.map((session, i) => (
            <Card key={session.id} className={`transition-all ${session.status === 'live' ? 'border-primary shadow-sm' : ''}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {format(parseISO(session.date), "MMM d, yyyy")} at {session.startTime}
                      {session.status === "completed" && <Badge variant="default" className="bg-green-500">Completed</Badge>}
                      {session.status === "live" && <Badge variant="default" className="bg-red-500 animate-pulse">Live</Badge>}
                      {session.status === "missed" && <Badge variant="secondary">Missed</Badge>}
                      {session.status === "upcoming" && <Badge variant="outline">Upcoming</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                      <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {Math.round(session.durationSeconds / 60)} min</span>
                      <span>Starts at {formatDuration(session.startOffset)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Link href={`/session/${session.id}/player`} className="flex-1 sm:flex-none">
                    <Button className="w-full" variant={session.status === 'live' ? 'default' : 'secondary'}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {session.status === 'completed' ? 'Review' : 'Open'}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={session.status === "live"}
                    title={session.status === "live" ? "Cannot delete a session in progress" : "Delete session"}
                    onClick={() => deleteSession(session.id)}
                    data-testid={`button-delete-session-${session.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-7 gap-6">
          <div className="md:col-span-3">
            <Card>
              <CardContent className="p-4">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="mx-auto"
                  modifiers={{
                    hasSession: sessions.map(s => parseISO(s.date)),
                  }}
                  modifiersStyles={{
                    hasSession: { fontWeight: 'bold', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-4 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            </h3>
            {selectedDateSessions.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No sessions on this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedDateSessions.map(session => (
                  <Card key={session.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                       <div>
                        <div className="font-semibold">{session.startTime}</div>
                        <div className="text-sm text-muted-foreground">{Math.round(session.durationSeconds / 60)} min duration</div>
                       </div>
                       <Link href={`/session/${session.id}/player`}>
                        <Button size="sm">Open Player</Button>
                       </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
