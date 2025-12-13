import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { getRoutineSummaryForTeam } from "./routineSummary";

vi.mock("@/lib/prisma", () => ({
  default: {
    routine: {
      findFirst: vi.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  routine: { findFirst: ReturnType<typeof vi.fn> };
};

describe("getRoutineSummaryForTeam", () => {
  beforeEach(() => {
    mockedPrisma.routine.findFirst.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns summary with ordered blocks and items (Caso A)", async () => {
    mockedPrisma.routine.findFirst.mockResolvedValue({
      id: "r1",
      title: "Rutina fuerza",
      goal: "Mejorar fuerza",
      notesForAthlete: "Dar el 100%",
      blocks: [
        {
          id: "b1",
          name: "Bloque 1",
          description: "Primer bloque",
          order: 2,
          items: [
            {
              id: "i2",
              exerciseName: "Plancha",
              title: "Plancha core",
              sets: 3,
              reps: 30,
              load: null,
              tempo: null,
              rest: "30s",
              notes: "Mantener postura",
              athleteNotes: null,
              order: 2,
            },
            {
              id: "i1",
              exerciseName: null,
              title: "Sentadilla",
              sets: 4,
              reps: 10,
              load: "40kg",
              tempo: "3010",
              rest: "60s",
              notes: null,
              athleteNotes: "Controlar técnica",
              order: 1,
            },
          ],
        },
        {
          id: "b2",
          name: null,
          description: null,
          order: 1,
          items: [
            {
              id: "i3",
              exerciseName: "Zancadas",
              title: null,
              sets: 3,
              reps: 12,
              load: "20kg",
              tempo: null,
              rest: "45s",
              notes: null,
              athleteNotes: null,
              order: 1,
            },
          ],
        },
      ],
      items: [],
    });

    const summary = await getRoutineSummaryForTeam("r1", "t1");

    expect(mockedPrisma.routine.findFirst).toHaveBeenCalledWith({
      where: { id: "r1", teamId: "t1" },
      include: expect.any(Object),
    });

    expect(summary).not.toBeNull();
    expect(summary!.id).toBe("r1");
    expect(summary!.title).toBe("Rutina fuerza");
    expect(summary!.goal).toBe("Mejorar fuerza");
    expect(summary!.notesForAthlete).toBe("Dar el 100%");

    expect(summary!.blocks).toHaveLength(2);
    // Blocks should be in the same order prisma returns (already ordered by order asc)
    expect(summary!.blocks[0].id).toBe("b1");
    expect(summary!.blocks[1].id).toBe("b2");

    const firstBlock = summary!.blocks[0];
    expect(firstBlock.name).toBe("Bloque 1");
    expect(firstBlock.items).toHaveLength(2);
    // Items should preserve Prisma ordering (order asc)
    expect(firstBlock.items[0].id).toBe("i2");
    expect(firstBlock.items[0].title).toBe("Plancha");
    expect(firstBlock.items[1].id).toBe("i1");
    expect(firstBlock.items[1].title).toBe("Sentadilla");

    const secondBlock = summary!.blocks[1];
    // Fallback name when block.name is null
    expect(secondBlock.name).toBe("Bloque");
    expect(secondBlock.items[0].title).toBe("Zancadas");
  });

  it("groups unassigned items into 'Sin bloque' block (Caso B)", async () => {
    mockedPrisma.routine.findFirst.mockResolvedValue({
      id: "r2",
      title: "Rutina sin bloques",
      goal: null,
      notesForAthlete: null,
      blocks: [],
      items: [
        {
          id: "i1",
          exerciseName: "Calentamiento general",
          title: null,
          sets: 1,
          reps: 10,
          load: null,
          tempo: null,
          rest: null,
          notes: null,
          athleteNotes: null,
          order: 1,
        },
        {
          id: "i2",
          exerciseName: null,
          title: "Estiramientos",
          sets: 1,
          reps: 8,
          load: null,
          tempo: null,
          rest: null,
          notes: null,
          athleteNotes: null,
          order: 2,
        },
      ],
    });

    const summary = await getRoutineSummaryForTeam("r2", "t1");

    expect(summary).not.toBeNull();
    expect(summary!.blocks).toHaveLength(1);

    const onlyBlock = summary!.blocks[0];
    expect(onlyBlock.id).toBe("__unassigned__");
    expect(onlyBlock.name).toBe("Sin bloque");
    expect(onlyBlock.items).toHaveLength(2);

    // Titles resolved as exerciseName || title
    expect(onlyBlock.items[0].title).toBe("Calentamiento general");
    expect(onlyBlock.items[1].title).toBe("Estiramientos");
  });

  it("returns null when routine is not found (Caso C)", async () => {
    mockedPrisma.routine.findFirst.mockResolvedValue(null);

    const summary = await getRoutineSummaryForTeam("missing", "t1");

    expect(summary).toBeNull();
  });
});
