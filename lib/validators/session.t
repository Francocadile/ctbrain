import { z } from "zod";

export const SessionTypeEnum = z.enum([
  "PARTIDO",
  "TACTICO",
  "FUERZA",
  "RECUPERACION",
  "EVALUACION",
  "LIBRE",
]);

export const sessionCreateSchema = z.object({
  date: z.string().datetime(),        // ISO UTC
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  title: z.string().min(1).max(120),
  type: SessionTypeEnum,
  notes: z.string().max(5000).optional(),
  rpe: z.number().int().min(0).max(10).optional(),
  load: z.number().int().min(0).max(100000).optional(),
  microcycle: z.number().int().min(1).max(53).optional(),
});

export const sessionUpdateSchema = sessionCreateSchema.partial();

export type SessionCreateDTO = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateDTO = z.infer<typeof sessionUpdateSchema>;
