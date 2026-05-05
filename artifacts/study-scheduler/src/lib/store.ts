export type Lecture = {
  id: string;
  title: string;
  subject: string;
  youtubeUrl: string;
  videoId: string;
  totalDurationSeconds: number;
  createdAt: string;
};

export type Session = {
  id: string;
  lectureId: string;
  date: string; // ISO date "YYYY-MM-DD"
  startTime: string; // "HH:MM" 24h
  durationSeconds: number;
  startOffset: number; // seconds from beginning of video
  status: "upcoming" | "live" | "completed" | "missed";
  watchedSeconds: number; // progress within this session
};

export type Settings = {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  notificationsEnabled: false,
};

class Store {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.emit(key);
  }

  private listeners: Record<string, Set<() => void>> = {};

  subscribe(key: string, listener: () => void) {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(listener);
    return () => {
      this.listeners[key].delete(listener);
    };
  }

  private emit(key: string) {
    if (this.listeners[key]) {
      this.listeners[key].forEach((listener) => listener());
    }
  }

  getLectures(): Lecture[] {
    return this.get<Lecture[]>("study_lectures", []);
  }

  getLecture(id: string): Lecture | undefined {
    return this.getLectures().find((l) => l.id === id);
  }

  saveLecture(lecture: Lecture) {
    const lectures = this.getLectures();
    const index = lectures.findIndex((l) => l.id === lecture.id);
    if (index >= 0) {
      lectures[index] = lecture;
    } else {
      lectures.push(lecture);
    }
    this.set("study_lectures", lectures);
  }

  deleteLecture(id: string) {
    this.set("study_lectures", this.getLectures().filter((l) => l.id !== id));
    this.set("study_sessions", this.getSessions().filter((s) => s.lectureId !== id));
  }

  getSessions(): Session[] {
    return this.get<Session[]>("study_sessions", []);
  }

  getLectureSessions(lectureId: string): Session[] {
    return this.getSessions().filter((s) => s.lectureId === lectureId);
  }

  getSession(id: string): Session | undefined {
    return this.getSessions().find((s) => s.id === id);
  }

  saveSession(session: Session) {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    this.set("study_sessions", sessions);
  }

  deleteSession(id: string) {
    this.set("study_sessions", this.getSessions().filter((s) => s.id !== id));
  }

  getSettings(): Settings {
    return this.get<Settings>("study_settings", DEFAULT_SETTINGS);
  }

  saveSettings(settings: Settings) {
    this.set("study_settings", settings);
  }
}

export const store = new Store();
