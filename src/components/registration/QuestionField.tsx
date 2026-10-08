/**
 * @file src/components/registration/QuestionField.tsx
 * @desc One registration question as a form control: text, long text, number, link, checkbox,
 *       one choice (radios) or several (checkboxes in a fieldset).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import { Checkbox, Textarea, TextInput } from "@haruhimemoe/ui";
import type { Question } from "@/schemas/question";

/** QuestionField's props: the question, its answer so far, the change handler and any error. */
export type QuestionFieldProps = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string | undefined;
  disabled?: boolean;
};

/**
 * @function QuestionField
 * @param props {QuestionFieldProps} the question and its answer
 * @returns {JSX.Element} the control
 */
export function QuestionField({
  question: q,
  value,
  onChange,
  error,
  disabled,
}: QuestionFieldProps) {
  const id = `q-${q.id}`;
  const label = q.required ? `${q.label} *` : q.label;
  const hint = q.help || undefined;
  switch (q.type) {
    case "text":
    case "url":
      return (
        <TextInput
          id={id}
          label={label}
          hint={hint}
          error={error}
          type={q.type === "url" ? "url" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={500}
          disabled={disabled}
        />
      );
    case "longText":
      return (
        <Textarea
          id={id}
          label={label}
          hint={hint}
          error={error}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={5000}
          rows={4}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <TextInput
          id={id}
          label={label}
          hint={hint}
          error={error}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          disabled={disabled}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          id={id}
          label={label}
          hint={hint}
          error={error}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      );
    case "choice":
    case "multi": {
      const picked = Array.isArray(value)
        ? value.map(String)
        : typeof value === "string"
          ? [value]
          : [];
      const toggle = (option: string, on: boolean) => {
        if (q.type === "choice") return onChange(option);
        const next = on ? [...picked, option] : picked.filter((p) => p !== option);
        onChange(q.options.filter((o) => next.includes(o)));
      };
      return (
        <fieldset
          className="flex flex-col gap-1"
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <legend className="mb-1 font-bold text-c1 text-sm">{label}</legend>
          {hint ? <p className="text-c3 text-xs">{hint}</p> : null}
          {q.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-c2 text-sm">
              <input
                type={q.type === "choice" ? "radio" : "checkbox"}
                name={id}
                value={option}
                checked={picked.includes(option)}
                onChange={(e) => toggle(option, e.target.checked)}
                disabled={disabled}
              />
              {option}
            </label>
          ))}
          {error ? (
            <p id={`${id}-error`} className="text-h2 text-xs">
              {error}
            </p>
          ) : null}
        </fieldset>
      );
    }
  }
}
