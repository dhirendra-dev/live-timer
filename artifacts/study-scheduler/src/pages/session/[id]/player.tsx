import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useStore, useSession, useLecture } from "@/hooks/use-store";
import { useYouTubeIframeAPI, formatDuration } from "@/lib/youtube";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, Lock, PlayCircle, CheckCircle2 } from "lucide-react";
import { parseISO, isAfter, isBefore, differenceInSeconds } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function LiveSessionPlayer() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const session = useSession(id);
  const lecture = useLecture(session?.lectureId);
  const { updateSession } = useStore();
  const isApiReady = useYouTubeIframeAPI();
  
  const [playerState, setPlayerState] = useState<number>(-1); // -1 unstarted, 0 ended, 1 playing, 2 paused
  const [currentTime, setCurrentTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const highestTimeRef = useRef<number>(0);

  // Status computation
  const sessionDateTime = session ? parseISO(`${session.date}T${session.startTime}`) : new Date();
  const isEarly = isBefore(new Date(), sessionDateTime);
  
  useEffect(() => {
    if (!session || !lecture || !isApiReady || isEarly || session.status === "completed") return;

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player(`youtube-player-${session.id}`, {
        videoId: lecture.videoId,
        playerVars: {
          start: session.startOffset + session.watchedSeconds,
          controls: 1, // Show controls
          disablekb: 1, // Disable keyboard to prevent skipping
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
             // ensure it starts at the right place if watchedSeconds > 0
             event.target.seekTo(session.startOffset + session.watchedSeconds);
             highestTimeRef.current = session.startOffset + session.watchedSeconds;
          },
          onStateChange: (event: any) => {
            setPlayerState(event.data);
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (session.status === "upcoming" || session.status === "missed") {
                updateSession({ ...session, status: "live" });
              }
            }
          }
        }
      });
    }

    // Polling interval
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const ct = playerRef.current.getCurrentTime();
        setCurrentTime(ct);
        
        // Prevent forward seeking
        if (ct > highestTimeRef.current + 2) {
          // They skipped forward
          playerRef.current.seekTo(highestTimeRef.current);
          toast({ title: "Skipping Locked", description: "You cannot skip ahead during a live session.", variant: "destructive" });
        } else {
           highestTimeRef.current = Math.max(highestTimeRef.current, ct);
        }

        // Save progress periodically
        const currentWatched = Math.max(0, ct - session.startOffset);
        if (currentWatched > session.watchedSeconds && Math.abs(currentWatched - session.watchedSeconds) > 5) {
           updateSession({ ...session, watchedSeconds: Math.floor(currentWatched) });
        }

        // Check if session is complete
        if (ct >= session.startOffset + session.durationSeconds) {
          playerRef.current.pauseVideo();
          updateSession({ ...session, status: "completed", watchedSeconds: session.durationSeconds });
          toast({ title: "Session Complete!", description: "Great job focusing!" });
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [isApiReady, session, lecture, isEarly]);

  // Countdown timer for early sessions
  useEffect(() => {
    if (!isEarly || !session) return;
    
    const interval = setInterval(() => {
      const diff = differenceInSeconds(sessionDateTime, new Date());
      if (diff <= 0) {
        setTimeRemaining(0);
        window.location.reload(); // Refresh to init player
      } else {
        setTimeRemaining(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isEarly, sessionDateTime]);

  if (!session || !lecture) return <div>Not found</div>;

  const currentProgress = session.watchedSeconds / session.durationSeconds * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/lecture/${lecture.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{lecture.title}</h1>
            {session.status === "live" && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold animate-pulse">LIVE</span>}
            {session.status === "completed" && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">COMPLETED</span>}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3" /> Session Date: {session.date} at {session.startTime}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-black aspect-video flex flex-col justify-center items-center relative">
            {isEarly ? (
              <div className="text-center text-white p-8">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-2xl font-bold mb-2">Session Locked</h3>
                <p className="text-white/70 mb-6">This class hasn't started yet.</p>
                {timeRemaining !== null && (
                  <div className="text-4xl font-mono">
                    {formatDuration(timeRemaining)}
                  </div>
                )}
                <p className="text-white/50 text-sm mt-2">until start</p>
              </div>
            ) : session.status === "completed" ? (
              <div className="text-center text-white p-8">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-3xl font-bold mb-2">Class Finished!</h3>
                <p className="text-white/70 mb-6">You've completed this study session.</p>
                <Link href={`/lecture/${lecture.id}`}>
                  <Button variant="secondary">Return to Syllabus</Button>
                </Link>
              </div>
            ) : (
              <div id={`youtube-player-${session.id}`} className="w-full h-full absolute inset-0"></div>
            )}
          </Card>

          {!isEarly && session.status !== "completed" && (
            <Card>
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" /> Session Progress
                    </span>
                    <span className="text-muted-foreground">
                      {formatDuration(session.watchedSeconds)} / {formatDuration(session.durationSeconds)}
                    </span>
                  </div>
                  <Progress value={currentProgress} className="h-2" />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-semibold mb-1">Session Rules</h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4 mt-2">
                  <li>Treat this like a live class.</li>
                  <li>Forward skipping is disabled.</li>
                  <li>The session will end automatically when the duration is reached.</li>
                </ul>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-1">Lecture Info</h3>
                <p className="text-sm text-muted-foreground">{lecture.subject}</p>
                <div className="mt-3 bg-secondary/50 p-3 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Covering video segment:</p>
                  <p className="text-sm">{formatDuration(session.startOffset)} to {formatDuration(session.startOffset + session.durationSeconds)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
