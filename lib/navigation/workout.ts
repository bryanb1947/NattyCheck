// lib/navigation/workout.ts
import { router } from "expo-router";

export function startCustomWorkout(workoutId: string) {
  const sessionId = Date.now().toString(); // unique session id
  router.push({
    pathname: "/workout-session/[sessionId]",
    params: {
      sessionId,
      workoutId,
      type: "custom",
    },
  });
}

export function startAIWorkout(planId: string, dayIndex: number) {
  const sessionId = Date.now().toString();
  router.push({
    pathname: "/workout-session/[sessionId]",
    params: {
      sessionId,
      planId,
      dayIndex,
      type: "ai",
    },
  });
}
