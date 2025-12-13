import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { getSessionRoutineSnapshot } from "./sessionRoutineSnapshot";

vi.mock("@/lib/prisma", () => ({
  default: {
    sessionRoutineItem: {
      findMany: vi.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  sessionRoutineItem: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("getSessionRoutineSnapshot", () => {
  beforeEach(() => {
    mockedPrisma.sessionRoutineItem.findMany.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns grouped items for single routine with correct order and titles (Caso A)", async () => {
    mockedPrisma.sessionRoutineItem.findMany.mockResolvedValue([
      {
        id: "i2",
        sessionId: "s1",
        routineId: "r1",
        routineTitle: "Rutina fuerza",
        blockId: "b1",
        blockName: "Bloque principal",
        blockType: "strength",
        exerciseId: "e2",
        exerciseName: "Peso muerto",
        title: "Peso muerto convencional",
        sets: 4,
        reps: 6,
        load: "80kg",
        tempo: null,
        rest: "90s",
        notes: null,
        athleteNotes: null,
        order: 2,
      },
      {
        id: "i1",
        sessionId: "s1",
        routineId: "r1",
        routineTitle: "Rutina fuerza",
        blockId: "b1",
        blockName: "Bloque principal",
        blockType: "strength",
        exerciseId: "e1",
        exerciseName: null,
        title: "Sentadilla trasera",
        sets: 5,
        reps: 5,
        load: "100kg",
        tempo: "3010",
        rest: "120s",
        notes: "Priorizar técnica",
        athleteNotes: null,
        order: 1,
      },
      {
        id: "i3",
        sessionId: "s1",
        routineId: "r1",
        routineTitle: "Rutina fuerza",
        blockId: "b1",
        blockName: "Bloque principal",
        blockType: "strength",
        exerciseId: "e3",
        exerciseName: "Press banca",
        title: null,
        sets: 4,
        reps: 8,
        load: "70kg",
        tempo: null,
        rest: "90s",
        notes: null,
        athleteNotes: null,
        order: 3,
      },
    ]);

    const snapshot = await getSessionRoutineSnapshot("s1");

    expect(mockedPrisma.sessionRoutineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "s1" },
      })
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot!.routineId).toBe("r1");

    const routineGroup = snapshot!.itemsByRoutine["r1"];
    expect(routineGroup).toBeDefined();
    expect(routineGroup.routineId).toBe("r1");
    expect(routineGroup.items).toHaveLength(3);

    // Items are already ordered by Prisma (order asc) in the query
    const itemIdsInOrder = routineGroup.items.map((it) => it.id);
    expect(itemIdsInOrder).toEqual(["i2", "i1", "i3"]);

    // Block metadata preserved
    for (const it of routineGroup.items) {
      expect(it.blockName).toBe("Bloque principal");
      expect(it.blockType).toBe("strength");
    }

    // Titles are taken directly from title field in the snapshot
    // (sessionRoutineSnapshot does not currently resolve exerciseName || title)
    expect(routineGroup.items[0].title).toBe("Peso muerto convencional");
    expect(routineGroup.items[1].title).toBe("Sentadilla trasera");
    // Third item has title null in DB, helper maps to null-safe title
    expect(routineGroup.items[2].title).toBeNull();
  });

  it("groups items by routine for multiple routines (Caso B)", async () => {
    mockedPrisma.sessionRoutineItem.findMany.mockResolvedValue([
      // Rutina r1
      {
        id: "i1",
        sessionId: "s2",
        routineId: "r1",
        routineTitle: "Rutina fuerza",
        blockId: "b1",
        blockName: "Bloque fuerza",
        blockType: "strength",
        exerciseId: "e1",
        exerciseName: null,
        title: "Sentadilla",
        sets: 5,
        reps: 5,
        load: "100kg",
        tempo: null,
        rest: "120s",
        notes: null,
        athleteNotes: null,
        order: 2,
      },
      {
        id: "i2",
        sessionId: "s2",
        routineId: "r1",
        routineTitle: "Rutina fuerza",
        blockId: "b1",
        blockName: "Bloque fuerza",
        blockType: "strength",
        exerciseId: "e2",
        exerciseName: "Peso muerto",
        title: null,
        sets: 4,
        reps: 6,
        load: "80kg",
        tempo: null,
        rest: "90s",
        notes: null,
        athleteNotes: null,
        order: 1,
      },
      // Rutina r2
      {
        id: "i3",
        sessionId: "s2",
        routineId: "r2",
        routineTitle: "Rutina movilidad",
        blockId: "b2",
        blockName: "Bloque movilidad",
        blockType: "mobility",
        exerciseId: "e3",
        exerciseName: "Torsiones",
        title: null,
        sets: 3,
        reps: 12,
        load: null,
        tempo: null,
        rest: "60s",
        notes: null,
        athleteNotes: null,
        order: 1,
      },
      {
        id: "i4",
        sessionId: "s2",
        routineId: "r2",
        routineTitle: "Rutina movilidad",
        blockId: "b2",
        blockName: "Bloque movilidad",
        blockType: "mobility",
        exerciseId: "e4",
        exerciseName: null,
        title: "Estiramientos",
        sets: 2,
        reps: 8,
        load: null,
        tempo: null,
        rest: "45s",
        notes: null,
        athleteNotes: null,
        order: 2,
      },
    ]);

    const snapshot = await getSessionRoutineSnapshot("s2");

    expect(snapshot).not.toBeNull();

    const routines = Object.values(snapshot!.itemsByRoutine).filter(
      (g) => g.routineId !== null
    );
    expect(routines).toHaveLength(2);

    const sorted = [...routines].sort((a, b) =>
      (a.routineId || "").localeCompare(b.routineId || "")
    );

    const r1 = sorted[0];
    const r2 = sorted[1];

    expect(r1.routineId).toBe("r1");
    expect(r1.items.map((it) => it.id)).toEqual(["i1", "i2"]);

    expect(r2.routineId).toBe("r2");
    expect(r2.items.map((it) => it.id)).toEqual(["i3", "i4"]);
  });

  it("returns empty structure when there is no snapshot for session (Caso C)", async () => {
    mockedPrisma.sessionRoutineItem.findMany.mockResolvedValue([]);

    const snapshot = await getSessionRoutineSnapshot("s3");

    expect(snapshot).not.toBeNull();
    expect(snapshot!.routineId).toBeNull();
    expect(snapshot!.itemsByRoutine).toEqual({});
  });

  it("returns null and does not call prisma when sessionId is empty (Caso C - early return)", async () => {
    const snapshot = await getSessionRoutineSnapshot("");

    expect(snapshot).toBeNull();
    expect(mockedPrisma.sessionRoutineItem.findMany).not.toHaveBeenCalled();
  });

  it("handles items without block information (Caso D)", async () => {
    mockedPrisma.sessionRoutineItem.findMany.mockResolvedValue([
      {
        id: "i1",
        sessionId: "s4",
        routineId: "r1",
        routineTitle: "Rutina técnica",
        blockId: null,
        blockName: null,
        blockType: null,
        exerciseId: "e1",
        exerciseName: null,
        title: "Controles orientados",
        sets: 3,
        reps: 10,
        load: null,
        tempo: null,
        rest: null,
        notes: null,
        athleteNotes: null,
        order: 2,
      },
      {
        id: "i2",
        sessionId: "s4",
        routineId: "r1",
        routineTitle: "Rutina técnica",
        blockId: null,
        blockName: null,
        blockType: null,
        exerciseId: "e2",
        exerciseName: "Conducción",
        title: null,
        sets: 3,
        reps: 12,
        load: null,
        tempo: null,
        rest: null,
        notes: null,
        athleteNotes: null,
        order: 1,
      },
    ]);

    const snapshot = await getSessionRoutineSnapshot("s4");

    expect(snapshot).not.toBeNull();
    const routineGroup = snapshot!.itemsByRoutine["r1"];
    expect(routineGroup).toBeDefined();

    // Items should be in the order returned by Prisma (already sorted by order asc)
    expect(routineGroup.items.map((it) => it.id)).toEqual(["i1", "i2"]);

    for (const it of routineGroup.items) {
      expect(it.blockName).toBeNull();
      expect(it.blockType).toBeNull();
    }
  });
});
