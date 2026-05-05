import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/hooks/use-store";
import { extractVideoId, useYouTubeIframeAPI, formatDuration } from "@/lib/youtube";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AddLecture() {
  const [, setLocation] = useLocation();
  const { addLecture } = useStore();
  const { toast } = useToast();
  const isApiReady = useYouTubeIframeAPI();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  const playerRef = useRef<any>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setDuration(null);
    setVideoId(null);
    
    if (!newUrl) return;

    const id = extractVideoId(newUrl);
    if (!id) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube video URL.",
        variant: "destructive",
      });
      return;
    }

    setVideoId(id);
    fetchDuration(id);
  };

  const fetchDuration = (id: string) => {
    if (!isApiReady) {
      toast({
        title: "API not ready",
        description: "YouTube API is still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingDuration(true);

    // Clean up existing player if any
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player("hidden-player", {
      height: "0",
      width: "0",
      videoId: id,
      events: {
        onReady: (event: any) => {
          const dur = event.target.getDuration();
          if (dur) {
            setDuration(dur);
            setIsLoadingDuration(false);
            
            // Try to set title from video data if not already set
            const videoData = event.target.getVideoData();
            if (videoData && videoData.title && !title) {
              setTitle(videoData.title);
            }
          } else {
            // Sometimes duration is not available immediately, we might need to play briefly or it's a live stream
            setIsLoadingDuration(false);
            toast({
              title: "Error fetching duration",
              description: "Could not determine video length. Make sure it's not a live stream.",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          setIsLoadingDuration(false);
          toast({
            title: "Video Error",
            description: "Could not load video. Check if the URL is correct and the video is public.",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoId || !duration || !title || !subject) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields and ensure video duration is loaded.",
        variant: "destructive",
      });
      return;
    }

    const newLecture = {
      id: crypto.randomUUID(),
      title,
      subject,
      youtubeUrl: url,
      videoId,
      totalDurationSeconds: duration,
      createdAt: new Date().toISOString(),
    };

    addLecture(newLecture);
    
    toast({
      title: "Lecture Added",
      description: "You can now schedule sessions for this lecture.",
    });

    setLocation(`/lecture/${newLecture.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Lecture</h1>
        <p className="text-muted-foreground mt-2">Import a YouTube video to schedule study sessions.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Lecture Details</CardTitle>
            <CardDescription>Enter the YouTube URL to automatically fetch its duration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={handleUrlChange}
                data-testid="input-youtube-url"
              />
              <div className="text-sm text-muted-foreground h-5 flex items-center">
                {isLoadingDuration && <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Fetching duration...</span>}
                {duration !== null && !isLoadingDuration && <span className="text-primary font-medium">Video length: {formatDuration(duration)}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Introduction to Quantum Mechanics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-lecture-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject / Course</Label>
              <Input
                id="subject"
                placeholder="e.g. Physics 101"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data-testid="input-lecture-subject"
              />
            </div>

            {/* Hidden container for the YouTube player to fetch duration */}
            <div id="hidden-player" className="hidden"></div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setLocation("/")}>Cancel</Button>
            <Button type="submit" disabled={!videoId || !duration || !title || !subject} data-testid="button-submit-lecture">
              Save Lecture
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
