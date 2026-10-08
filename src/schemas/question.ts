/**
 * @file src/schemas/question.ts
 * @desc A host's registration question and the validator for its answer. Seven types; choice
 *       and multi carry 2 to 30 options.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { z } from "zod";

const base = {
  id: z.string().min(1).max(32),
  label: z.string().trim().min(1).max(200),
  help: z.string().trim().max(500),
  required: z.boolean(),
};

const options = z.array(z.string().trim().min(1).max(100)).min(2).max(30);

/** One registration question. */
export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.enum(["text", "longText", "number", "url", "checkbox"]) }),
  z.object({ ...base, type: z.enum(["choice", "multi"]), options }),
]);

/** One registration question. */
export type Question = z.infer<typeof QuestionSchema>;

/** At most this many questions per edition. */
export const MAX_QUESTIONS = 30;

/**
 * @function answerSchemaFor
 * @param q {Question} the question
 * @returns {z.ZodType} what its answer must look like (missing is fine when it's optional)
 */
export const answerSchemaFor = (q: Question): z.ZodType => {
  const schema = ((): z.ZodType => {
    switch (q.type) {
      case "text":
        return z
          .string()
          .trim()
          .min(q.required ? 1 : 0)
          .max(500);
      case "longText":
        return z
          .string()
          .trim()
          .min(q.required ? 1 : 0)
          .max(5000);
      case "number":
        return z.number().finite();
      case "url":
        return z.url().max(500);
      case "checkbox":
        return q.required ? z.literal(true) : z.boolean();
      case "choice":
        return z.enum(q.options as [string, ...string[]]);
      case "multi":
        return z
          .array(z.enum(q.options as [string, ...string[]]))
          .min(q.required ? 1 : 0)
          .max(q.options.length);
    }
  })();
  return q.required ? schema : schema.optional();
};
