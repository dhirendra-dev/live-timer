import { useState, useEffect, useCallback } from "react";
import { store, Lecture, Session, Settings } from "../lib/store";

export function useStore() {
  const [lectures, setLectures] = useState<Lecture[]>(store.getLectures());
  const [sessions, setSessions] = useState<Session[]>(store.getSessions());
  const [settings, setSettings] = useState<Settings>(store.getSettings());

  useEffect(() => {
    const unsubLectures = store.subscribe("study_lectures", () => {
      setLectures(store.getLectures());
    });
    const unsubSessions = store.subscribe("study_sessions", () => {
      setSessions(store.getSessions());
    });
    const unsubSettings = store.subscribe("study_settings", () => {
      setSettings(store.getSettings());
    });

    return () => {
      unsubLectures();
      unsubSessions();
      unsubSettings();
    };
  }, []);

  const addLecture = useCallback((lecture: Lecture) => {
    store.saveLecture(lecture);
  }, []);

  const updateLecture = useCallback((lecture: Lecture) => {
    store.saveLecture(lecture);
  }, []);

  const deleteLecture = useCallback((id: string) => {
    store.deleteLecture(id);
  }, []);

  const addSession = useCallback((session: Session) => {
    store.saveSession(session);
  }, []);

  const updateSession = useCallback((session: Session) => {
    store.saveSession(session);
  }, []);

  const deleteSession = useCallback((id: string) => {
    store.deleteSession(id);
  }, []);

  const updateSettings = useCallback((newSettings: Settings) => {
    store.saveSettings(newSettings);
  }, []);

  return {
    lectures,
    sessions,
    settings,
    addLecture,
    updateLecture,
    deleteLecture,
    addSession,
    updateSession,
    deleteSession,
    updateSettings,
  };
}

export function useLecture(id?: string) {
  const { lectures } = useStore();
  return lectures.find((l) => l.id === id);
}

export function useLectureSessions(lectureId?: string) {
  const { sessions } = useStore();
  return sessions.filter((s) => s.lectureId === lectureId).sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
    const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
    return timeA - timeB;
  });
}

export function useSession(id?: string) {
  const { sessions } = useStore();
  return sessions.find((s) => s.id === id);
}
