import { z } from 'zod';

/** Public documents, one per `legal.docs.*` block in the locale files. */
export const LEGAL_DOCS = ['terms', 'privacy', 'offer'] as const;
export const legalDocSchema = z.enum(LEGAL_DOCS);
export type LegalDoc = z.infer<typeof legalDocSchema>;

export const legalSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});
export const legalSectionsSchema = z.array(legalSectionSchema);
export type LegalSection = z.infer<typeof legalSectionSchema>;

/** Route params arrive untyped; only an exact known slug names a document. */
export function parseLegalDoc(value: unknown): LegalDoc | null {
  const result = legalDocSchema.safeParse(value);
  return result.success ? result.data : null;
}
