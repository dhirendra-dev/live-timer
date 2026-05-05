import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useSession, useLecture } from "@/hooks/use-store";
import { store } from "@/lib/store";
import { useYouTubeIframeAPI, formatDuration } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  CheckCircle2,
  Settings2,
  Clock,
} from "lucide-react";
import { parseISO, isBefore, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── Seek Bar ─────────────────────────────────────────────────────────────────
function SeekBar({
  current,
  maxAllowed,
  duration,
  onSeek,
  locked,
}: {
  current: number;
  maxAllowed: number;
  duration: number;
  onSeek: (t: number) => void;
  locked: boolean;
}) {
  const [shaking, setShaking] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val > maxAllowed && locked) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      onSeek(maxAllowed);
    } else {
      onSeek(val);
    }
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const allowedPct = duration > 0 ? (maxAllowed / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "relative flex items-center w-full group",
        shaking && "animate-[shake_0.4s_ease-in-out]"
      )}
      data-testid="seek-bar-container"
    >
      {/* Track background */}
      <div className="absolute inset-y-0 flex items-center w-full pointer-events-none">
        <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
          {/* Watched / allowed zone */}
          <div
            className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
            style={{ width: `${allowedPct}%` }}
          />
          {/* Current playback */}
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        value={current}
        onChange={handleChange}
        className="w-full h-1.5 appearance-none bg-transparent cursor-pointer relative z-10
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100
          [&::-webkit-slider-thumb]:transition-opacity [&::-webkit-slider-thumb]:shadow-md"
        data-testid="seek-bar"
      />
      {locked && (
        <div
          className="absolute right-0 -top-6 bg-black/80 text-white/70 text-[10px] px-1.5 py-0.5 rounded
            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1"
        >
          <Lock className="h-2.5 w-2.5" /> Forward locked
        </div>
      )}
    </div>
  );
}

// ─── Volume Control ───────────────────────────────────────────────────────────
function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group/vol">
      <button
        onClick={onMuteToggle}
        className="text-white/80 hover:text-white transition-colors"
        data-testid="button-mute"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-20 h-1 appearance-none bg-white/30 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          data-testid="volume-slider"
        />
      </div>
    </div>
  );
}

// ─── Speed Selector ───────────────────────────────────────────────────────────
function SpeedSelector({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (s: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-white/80 hover:text-white text-xs font-mono w-9 text-center transition-colors"
        data-testid="button-speed"
      >
        {speed}x
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-xl z-50 min-w-[72px]">
          {PLAYBACK_RATES.map((r) => (
            <button
              key={r}
              onClick={() => {
                onSpeedChange(r);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-4 py-1.5 text-xs text-left hover:bg-white/10 transition-colors",
                speed === r ? "text-primary font-bold" : "text-white/80"
              )}
              data-testid={`speed-option-${r}`}
            >
              {r}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quality Selector ─────────────────────────────────────────────────────────
function QualitySelector({
  quality,
  qualities,
  onQualityChange,
}: {
  quality: string;
  qualities: string[];
  onQualityChange: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!qualities.length) return null;

  const label = quality === "hd1080" ? "1080p" :
    quality === "hd720" ? "720p" :
    quality === "large" ? "480p" :
    quality === "medium" ? "360p" :
    quality === "small" ? "240p" :
    quality === "tiny" ? "144p" :
    quality === "auto" ? "Auto" : quality;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-white/80 hover:text-white transition-colors"
        data-testid="button-quality"
        title="Quality"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-xl z-50 min-w-[80px]">
          <div className="px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider border-b border-white/10">
            Quality
          </div>
          {qualities.map((q) => {
            const ql = q === "hd1080" ? "1080p" : q === "hd720" ? "720p" :
              q === "large" ? "480p" : q === "medium" ? "360p" :
              q === "small" ? "240p" : q === "tiny" ? "144p" : q === "auto" ? "Auto" : q;
            return (
              <button
                key={q}
                onClick={() => { onQualityChange(q); setOpen(false); }}
                className={cn(
                  "block w-full px-4 py-1.5 text-xs text-left hover:bg-white/10 transition-colors",
                  quality === q ? "text-primary font-bold" : "text-white/80"
                )}
                data-testid={`quality-option-${q}`}
              >
                {ql}
              </button>
            );
          })}
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────────────────
export default function LiveSessionPlayer() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const session = useSession(id);
  const lecture = useLecture(session?.lectureId);
  const isApiReady = useYouTubeIframeAPI();

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("auto");
  const [qualities, setQualities] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [skipWarning, setSkipWarning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEarly, setIsEarly] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const highestTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const lastSaveRef = useRef(0);
  const skipWarningTimerRef = useRef<number | null>(null);

  // Compute session start datetime once
  const sessionDateTime = session
    ? parseISO(`${session.date}T${session.startTime}`)
    : new Date();

  // ── Countdown timer ──
  useEffect(() => {
    if (!session) return;
    const updateCountdown = () => {
      const early = isBefore(new Date(), sessionDateTime);
      setIsEarly(early);
      if (early) {
        const diff = differenceInSeconds(sessionDateTime, new Date());
        setCountdown(diff > 0 ? diff : 0);
      } else {
        setCountdown(null);
      }
    };
    updateCountdown();
    const t = window.setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, [session?.date, session?.startTime]);

  // ── Controls auto-hide ──
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current && playing) setControlsVisible(false);
    }, 3000);
  }, [playing]);

  // ── Initialize YouTube player ──
  useEffect(() => {
    if (!session || !lecture || !isApiReady || isEarly) return;
    if (session.status === "completed") {
      setSessionComplete(true);
      return;
    }

    // Only resume from saved progress if the session was already in-progress ("live").
    // A fresh "upcoming" or "missed" session always starts from the beginning of its segment.
    const startAt =
      session.status === "live"
        ? session.startOffset + (session.watchedSeconds || 0)
        : session.startOffset;
    highestTimeRef.current = startAt;

    playerRef.current = new window.YT.Player(`yt-player-${session.id}`, {
      videoId: lecture.videoId,
      playerVars: {
        start: Math.floor(startAt),
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        playsinline: 1,
        enablejsapi: 1,
        fs: 0,
      },
      events: {
        onReady: (event: any) => {
          if (!mountedRef.current) return;
          event.target.seekTo(startAt, true);
          event.target.setVolume(volume);
          const ql: string[] = event.target.getAvailableQualityLevels?.() ?? [];
          if (ql.length) setQualities(["auto", ...ql.filter((q: string) => q !== "auto")]);
          setPlayerReady(true);
        },
        onStateChange: (event: any) => {
          if (!mountedRef.current) return;
          const YT = window.YT;
          if (event.data === YT.PlayerState.PLAYING) {
            setPlaying(true);
            store.saveSession({ ...session, status: "live" });
          } else if (
            event.data === YT.PlayerState.PAUSED ||
            event.data === YT.PlayerState.ENDED
          ) {
            setPlaying(false);
          }
        },
        onPlaybackQualityChange: (event: any) => {
          if (mountedRef.current) setQuality(event.data);
        },
      },
    });

    // Polling interval for discipline enforcement
    intervalRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime || !mountedRef.current) return;
      try {
        const ct: number = p.getCurrentTime();
        setCurrentTime(ct);

        // Enforce forward-seek lock
        if (ct > highestTimeRef.current + 2) {
          p.seekTo(highestTimeRef.current, true);
          if (!skipWarningTimerRef.current) {
            setSkipWarning(true);
            skipWarningTimerRef.current = window.setTimeout(() => {
              if (mountedRef.current) setSkipWarning(false);
              skipWarningTimerRef.current = null;
            }, 2000);
          }
        } else {
          highestTimeRef.current = Math.max(highestTimeRef.current, ct);
        }

        // Save progress to localStorage (throttled to every 5s)
        const now = Date.now();
        const watched = Math.max(0, ct - session.startOffset);
        if (watched > (session.watchedSeconds || 0) && now - lastSaveRef.current > 5000) {
          lastSaveRef.current = now;
          store.saveSession({ ...session, watchedSeconds: Math.floor(watched) });
        }

        // Auto-complete when session duration reached
        if (ct >= session.startOffset + session.durationSeconds - 0.5) {
          p.pauseVideo();
          store.saveSession({
            ...session,
            status: "completed",
            watchedSeconds: session.durationSeconds,
          });
          if (mountedRef.current) setSessionComplete(true);
        }
      } catch {
        // Player may have been destroyed
      }
    }, 1000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (skipWarningTimerRef.current) { clearTimeout(skipWarningTimerRef.current); }
      if (controlsTimerRef.current) { clearTimeout(controlsTimerRef.current); }
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [isApiReady, isEarly, session?.id, lecture?.videoId]);

  // ── Control handlers ──
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  }, [playing]);

  const handleSeek = useCallback((t: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.min(t, highestTimeRef.current);
    const final = Math.max(session?.startOffset ?? 0, clamped);
    p.seekTo(final, true);
    setCurrentTime(final);
  }, [session?.startOffset]);

  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    setMuted(v === 0);
    playerRef.current?.setVolume(v);
  }, []);

  const handleMuteToggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) { p.unMute(); setMuted(false); }
    else { p.mute(); setMuted(true); }
  }, [muted]);

  const handleSpeed = useCallback((s: number) => {
    setSpeed(s);
    playerRef.current?.setPlaybackRate(s);
  }, []);

  const handleQuality = useCallback((q: string) => {
    setQuality(q);
    playerRef.current?.setPlaybackQuality(q);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!session || !lecture) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Session not found.
      </div>
    );
  }

  const sessionDuration = session.durationSeconds;
  const relativeTime = Math.max(0, currentTime - session.startOffset);
  const relativeMax = Math.max(0, highestTimeRef.current - session.startOffset);
  const progressPct = sessionDuration > 0 ? (relativeTime / sessionDuration) * 100 : 0;

  // ── Render: Early / locked ──
  if (isEarly) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Header lecture={lecture} session={session} />
        <div className="aspect-video bg-zinc-950 rounded-2xl flex flex-col items-center justify-center gap-6 border border-white/5 shadow-2xl">
          <div className="p-5 rounded-full bg-white/5">
            <Lock className="h-10 w-10 text-white/40" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-1">Session Locked</h3>
            <p className="text-white/50 text-sm">This class hasn't started yet</p>
          </div>
          {countdown !== null && (
            <div className="text-center">
              <div className="text-5xl font-mono font-bold text-white tabular-nums">
                {formatDuration(countdown)}
              </div>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">until start</p>
            </div>
          )}
        </div>
        <SessionMeta session={session} lecture={lecture} />
      </div>
    );
  }

  // ── Render: Completed ──
  if (sessionComplete) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Header lecture={lecture} session={session} />
        <div className="aspect-video bg-zinc-950 rounded-2xl flex flex-col items-center justify-center gap-6 border border-white/5 shadow-2xl">
          <div className="p-5 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-2">Session Complete!</h3>
            <p className="text-white/50">You've finished this study session. Great discipline.</p>
          </div>
          <Link href={`/lecture/${lecture.id}`}>
            <Button variant="secondary" className="mt-2">Return to Syllabus</Button>
          </Link>
        </div>
        <SessionMeta session={session} lecture={lecture} />
      </div>
    );
  }

  // ── Render: Player ──
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Header lecture={lecture} session={session} />

      {/* Player wrapper */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5 group"
        onMouseMove={showControls}
        onMouseLeave={() => playing && setControlsVisible(false)}
        data-testid="player-container"
      >
        {/* YouTube iframe */}
        <div
          id={`yt-player-${session.id}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Loading state */}
        {!playerReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Click overlay for play/pause */}
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={togglePlay}
          data-testid="player-click-overlay"
        >
          {/* Center play/pause flash */}
          {!playing && playerReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 rounded-full p-5">
                <Play className="h-10 w-10 text-white fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Skip warning */}
        {skipWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-destructive/90 text-white text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-lg pointer-events-none">
            <Lock className="h-3.5 w-3.5" /> Forward skipping is disabled
          </div>
        )}

        {/* LIVE badge */}
        {session.status === "live" && (
          <div className="absolute top-3 right-3 z-40 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-lg pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
            LIVE
          </div>
        )}

        {/* Controls bar */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300",
            controlsVisible || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none rounded-b-2xl" />

          <div className="relative px-4 pb-4 pt-8 space-y-2">
            {/* Seek bar */}
            <SeekBar
              current={relativeTime}
              maxAllowed={relativeMax}
              duration={sessionDuration}
              onSeek={(t) => handleSeek(t + session.startOffset)}
              locked
            />

            {/* Bottom controls row */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-white/80 transition-colors"
                data-testid="button-play-pause"
              >
                {playing ? (
                  <Pause className="h-5 w-5 fill-white" />
                ) : (
                  <Play className="h-5 w-5 fill-white" />
                )}
              </button>

              {/* Volume */}
              <VolumeControl
                volume={volume}
                muted={muted}
                onVolumeChange={handleVolume}
                onMuteToggle={handleMuteToggle}
              />

              {/* Time */}
              <span
                className="text-white/80 text-xs font-mono tabular-nums select-none"
                data-testid="text-time"
              >
                {formatDuration(relativeTime)} / {formatDuration(sessionDuration)}
              </span>

              <div className="flex-1" />

              {/* Speed */}
              <SpeedSelector speed={speed} onSpeedChange={handleSpeed} />

              {/* Quality */}
              <QualitySelector
                quality={quality}
                qualities={qualities}
                onQualityChange={handleQuality}
              />

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-colors"
                data-testid="button-fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session progress bar below player */}
      <div className="space-y-1.5" data-testid="session-progress">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="font-medium">Session Progress</span>
          <span>{Math.round(progressPct)}% — {formatDuration(relativeTime)} of {formatDuration(sessionDuration)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <SessionMeta session={session} lecture={lecture} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Header({ lecture, session }: { lecture: any; session: any }) {
  return (
    <div className="flex items-center gap-4">
      <Link href={`/lecture/${lecture.id}`}>
        <Button variant="ghost" size="icon" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight leading-tight">
          {lecture.title}
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
          <Clock className="h-3.5 w-3.5" />
          {session.date} at {session.startTime} &middot; {formatDuration(session.durationSeconds)}
        </p>
      </div>
    </div>
  );
}

function SessionMeta({ session, lecture }: { session: any; lecture: any }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <div className="bg-card border rounded-xl p-4 space-y-0.5">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Subject</p>
        <p className="text-sm font-semibold">{lecture.subject}</p>
      </div>
      <div className="bg-card border rounded-xl p-4 space-y-0.5">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Video Segment</p>
        <p className="text-sm font-semibold font-mono">
          {formatDuration(session.startOffset)} → {formatDuration(session.startOffset + session.durationSeconds)}
        </p>
      </div>
      <div className="bg-card border rounded-xl p-4 space-y-0.5">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Session Rules</p>
        <p className="text-sm text-muted-foreground">No forward skipping. Treat it like a live class.</p>
      </div>
    </div>
  );
}
