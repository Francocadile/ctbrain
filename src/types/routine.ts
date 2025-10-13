export type RoutineSectionId = 'warmup' | 'A' | 'B' | 'C';

export type RoutineExercise = {
  id: string;
  name: string;
  videoId?: string;
  videoUrl?: string;
  sets: number;
  reps?: string;
  tempo?: string;
  restSec?: number;
  load?: string;
  notes?: string;
  unilateral?: boolean;
  equipment?: string[];
  supersetKey?: string;
  order: number;
  targetMuscles?: string[];
};

export type RoutinePlan = {
  day: string; // ISO date
  sections: Record<RoutineSectionId, RoutineExercise[]>;
};

export const DEFAULT_SECTIONS: RoutineSectionId[] = ['warmup','A','B','C'];
