"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { NormalizedEvent } from "../events";
import { makeSampleEvents } from "../events";

interface EventFeedValue {
  events: NormalizedEvent[];
}

const EventFeedContext = createContext<EventFeedValue>({ events: [] });

/**
 * Sumber event untuk semua widget.
 * - Runtime: event real dari WebSocket.
 * - Editor: sample events agar widget tampil hidup saat desain.
 */
export function EventFeedProvider({
  events,
  children,
}: {
  events?: NormalizedEvent[];
  children: ReactNode;
}) {
  const value = useMemo<EventFeedValue>(
    () => ({ events: events ?? makeSampleEvents() }),
    [events],
  );
  return <EventFeedContext.Provider value={value}>{children}</EventFeedContext.Provider>;
}

export function useEventFeed(): NormalizedEvent[] {
  return useContext(EventFeedContext).events;
}
