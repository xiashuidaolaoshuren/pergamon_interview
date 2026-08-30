import { z } from "zod";

const extractionCandidateSchema = z.object({
  fieldKey: z.string(),
  value: z.unknown(),
  document: z.string(),
  page: z.number(),
  quote: z.string(),
});

export const extractionResponseSchema = z.object({
  candidates: z.array(extractionCandidateSchema),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

const proposalItemSchema = z.object({
  fieldKey: z.string(),
  proposedValue: z.unknown(),
  answerText: z.string(),
});

export const proposalSchema = z.object({
  proposals: z.array(proposalItemSchema),
});

export type ProposalResponse = z.infer<typeof proposalSchema>;
