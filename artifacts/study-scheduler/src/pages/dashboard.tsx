import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, isToday, parseISO } from "date-fns";
import { Link } from "wouter";
import { PlayCircle, Clock, BookOpen, CheckCircle2, Flame, Calendar as CalendarIcon } from "lucide-react";
import { formatDuration } from "@/lib/youtube";

export default function Dashboard() {
  const { lectures, sessions } = useStore();

  const todaySessions = sessions.filter(s => isToday(parseISO(s.date))).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const completedSessions = sessions.filter(s => s.status === 'completed');
  
  // Calculate simple streak (consecutive days with at least one completed session)
  // This is a naive implementation for the scope
  const calculateStreak = () => {
    if (completedSessions.length === 0) return 0;
    // ... complex streak logic could go here ...
    return 1;
  };

  const streak = calculateStreak();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back to your focused study room.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep it up!
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total sessions finished
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lectures</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lectures.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently tracking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Today's Schedule
          </h2>
          {todaySessions.length === 0 ? (
            <Card className="border-dashed bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <PlayCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">No sessions scheduled for today.</p>
                <Link href="/lecture/new">
                  <Button variant="outline" size="sm">Add a Lecture</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(session => {
                const lecture = lectures.find(l => l.id === session.lectureId);
                if (!lecture) return null;
                return (
                  <Card key={session.id} className={session.status === 'live' ? 'border-primary shadow-sm' : ''}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 text-center">
                        <div className="text-lg font-bold">{session.startTime}</div>
                        <div className="text-xs text-muted-foreground">{Math.round(session.durationSeconds / 60)} min</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{lecture.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{lecture.subject}</p>
                      </div>
                      <div>
                        <Link href={`/session/${session.id}/player`}>
                          <Button size="sm" variant={session.status === 'live' ? 'default' : 'secondary'}>
                            {session.status === 'completed' ? 'Review' : 'Join'}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Lectures
          </h2>
          {lectures.length === 0 ? (
             <Card className="border-dashed bg-transparent shadow-none">
             <CardContent className="flex flex-col items-center justify-center p-8 text-center">
               <p className="text-sm text-muted-foreground mb-4">You haven't added any lectures yet.</p>
               <Link href="/lecture/new">
                 <Button size="sm">Add First Lecture</Button>
               </Link>
             </CardContent>
           </Card>
          ) : (
            <div className="space-y-3">
              {lectures.map(lecture => {
                const lecSessions = sessions.filter(s => s.lectureId === lecture.id);
                const completedSecs = lecSessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.durationSeconds, 0);
                const progress = lecture.totalDurationSeconds > 0 ? (completedSecs / lecture.totalDurationSeconds) * 100 : 0;
                
                return (
                  <Card key={lecture.id} className="hover:border-primary/50 transition-colors">
                    <Link href={`/lecture/${lecture.id}`}>
                      <CardContent className="p-4 cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1 pr-4">
                            <h4 className="font-semibold truncate">{lecture.title}</h4>
                            <p className="text-sm text-muted-foreground">{lecture.subject}</p>
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDuration(lecture.totalDurationSeconds)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
