import { describe, it, expect } from "vitest";
import { decodeExercises, encodeExercises, type Exercise } from "./encodeDecodeExercises";

describe("encodeDecodeExercises helpers", () => {
  it("roundtrips prefix and basic exercise fields", () => {
    const prefix = "Calentamiento previo";
    const exercises: Exercise[] = [
      {
        title: "Rondo 5v2",
        kind: "técnico",
        space: "zona media",
        players: "7",
        duration: "15",
        description: "posesión en espacio reducido",
        imageUrl: "https://example.com/rondo.png",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        routineId: "routine-1",
        routineName: "Pre-partido",
        isRoutineOnly: true,
        libraryExerciseId: "lib-123",
      },
    ];

    const encoded = encodeExercises(prefix, exercises);
    const { prefix: decodedPrefix, exercises: decoded } = decodeExercises(encoded);

    expect(decodedPrefix).toBe(prefix);
    expect(decoded).toHaveLength(1);
    const ex = decoded[0];
    expect(ex.title).toBe(exercises[0].title);
    expect(ex.kind).toBe(exercises[0].kind);
    expect(ex.space).toBe(exercises[0].space);
    expect(ex.players).toBe(exercises[0].players);
    expect(ex.duration).toBe(exercises[0].duration);
    expect(ex.description).toBe(exercises[0].description);
    expect(ex.imageUrl).toBe(exercises[0].imageUrl);
    expect(ex.videoUrl).toBe(exercises[0].videoUrl);
    expect(ex.routineId).toBe(exercises[0].routineId);
    expect(ex.routineName).toBe(exercises[0].routineName);
    expect(ex.isRoutineOnly).toBe(exercises[0].isRoutineOnly);
    expect(ex.libraryExerciseId).toBe(exercises[0].libraryExerciseId);
  });

  it("returns empty exercises array when no tag is present", () => {
    const desc = "Solo texto libre sin ejercicios embebidos";

    const { prefix, exercises } = decodeExercises(desc);

    expect(prefix).toBe(desc);
    expect(exercises).toEqual([]);
  });
});
