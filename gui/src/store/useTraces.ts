import { event } from "@tauri-apps/api";
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface TraceEvent {
  timestamp: string;
  level: string;
  target: string;
  message: string;
  fields: Record<string, any>;
}

interface Store {
  traces: TraceEvent[];
  maxTraces: number;

  addTrace: (trace: TraceEvent) => void;
  clearTraces: () => void;
  setMaxTraces: (max: number) => void;
}

const store: StateCreator<Store> = (set, get) => ({
  traces: [],
  maxTraces: 1000,

  addTrace(trace: TraceEvent) {
    const { traces, maxTraces } = get();
    const newTraces = [trace, ...traces].slice(0, maxTraces);
    set({ traces: newTraces });
  },

  clearTraces() {
    set({ traces: [] });
  },

  setMaxTraces(maxTraces: number) {
    const { traces } = get();
    set({
      maxTraces,
      traces: traces.slice(0, maxTraces),
    });
  },
});

export const useTraces = create<Store>()(subscribeWithSelector(store));

// Listen for trace events globally and add them to the store
event.listen<TraceEvent>("trace-event", (event) => {
  console.log(event);
  useTraces.getState().addTrace(event.payload);
});

