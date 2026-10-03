import { z } from 'zod';

export const BenefitMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  why_it_may_apply: z.string(),
  status: z.enum(['ready', 'missing_docs']),
  missing_documents: z.array(z.string()).default([]),
  office: z.string(),
  steps: z.array(z.string()).default([]),
  source_url: z.string(),
  summary: z.string().optional(),
});

export type BenefitMatch = z.infer<typeof BenefitMatchSchema>;

export const MatchRequestSchema = z.object({
  answers: z.record(z.string(), z.string()).optional().default({}),
  confirmedFields: z.record(z.string(), z.any()).optional().default({}),
  language: z.enum(['EN', 'HI', 'MR', 'en', 'hi', 'mr']).optional().default('EN'),
  uploadedDocs: z.array(z.string()).optional(),
});

export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export const MatchMetaSchema = z.object({
  path: z.enum(['gemini', 'mock_fallback']),
  model: z.string(),
  duration_ms: z.number().optional(),
  gemini_duration_ms: z.number().optional(),
  retry_happened: z.boolean().optional(),
});

export type MatchMeta = z.infer<typeof MatchMetaSchema>;

export const MatchResponseSchema = z.object({
  success: z.boolean(),
  meta: MatchMetaSchema,
  benefits: z.array(BenefitMatchSchema),
  disclaimer: z.string(),
});

export type MatchResponse = z.infer<typeof MatchResponseSchema>;
