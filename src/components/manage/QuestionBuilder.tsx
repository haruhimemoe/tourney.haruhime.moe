/**
 * @file src/components/manage/QuestionBuilder.tsx
 * @desc The host's registration questions: add (30 at most), edit, reorder by drag, keys or the
 *       move buttons (ui's SortableList), remove. Choice questions take one option per line.
 *       Controlled: the caller holds the list and saves it.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import {
  Button,
  Checkbox,
  moveItem,
  Select,
  SortableList,
  Textarea,
  TextInput,
} from "@haruhimemoe/ui";
import { useState } from "react";
import { MAX_QUESTIONS, type Question } from "@/schemas/question";

/** QuestionBuilder's props: the questions and their change handler. */
export type QuestionBuilderProps = {
  value: readonly Question[];
  onChange: (questions: Question[]) => void;
  disabled?: boolean;
};

const TYPE_LABELS: Record<Question["type"], string> = {
  text: "Short text",
  longText: "Long text",
  number: "Number",
  url: "Link",
  checkbox: "Checkbox",
  choice: "One choice",
  multi: "Several choices",
};

const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const withType = (q: Question, type: Question["type"]): Question => {
  const base = { id: q.id, label: q.label, help: q.help, required: q.required };
  if (type === "choice" || type === "multi") {
    return { ...base, type, options: "options" in q ? q.options : [] };
  }
  return { ...base, type };
};

/**
 * @function QuestionBuilder
 * @param props {QuestionBuilderProps} the questions
 * @returns {JSX.Element} the editable list
 */
export function QuestionBuilder({ value, onChange, disabled = false }: QuestionBuilderProps) {
  const [optionText, setOptionText] = useState<Record<string, string>>(() =>
    Object.fromEntries(value.map((q) => [q.id, "options" in q ? q.options.join("\n") : ""])),
  );
  const full = value.length >= MAX_QUESTIONS;
  const name = (q: Question, index: number) => q.label.trim() || `Question ${index + 1}`;

  const update = (id: string, change: (q: Question) => Question) =>
    onChange(value.map((q) => (q.id === id ? change(q) : q)));

  const add = () => {
    if (full) return;
    onChange([...value, { id: newId(), label: "", help: "", required: false, type: "text" }]);
  };

  const setOptions = (id: string, text: string) => {
    setOptionText((prev) => ({ ...prev, [id]: text }));
    const options = text
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    update(id, (q) => ("options" in q ? { ...q, options } : q));
  };

  return (
    <div className="flex flex-col gap-4">
      <SortableList
        items={value}
        getId={(q) => q.id}
        getLabel={(q) => name(q, value.indexOf(q))}
        label="Registration questions"
        disabled={disabled}
        onMove={({ from, to }) => onChange(moveItem(value, from.index, to.index))}
        className="flex flex-col gap-3"
      >
        {(q, { index, handle, moveButtons }) => (
          <div className="flex flex-col gap-2 rounded-md border border-b4 p-3">
            <div className="flex items-center gap-2">
              {handle}
              <TextInput
                id={`qlabel-${q.id}`}
                label={`Question ${index + 1}`}
                value={q.label}
                onChange={(e) => update(q.id, (x) => ({ ...x, label: e.target.value }))}
                maxLength={200}
                wrapperClassName="flex-1"
                disabled={disabled}
              />
              {moveButtons}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${name(q, index)}`}
                onClick={() => onChange(value.filter((x) => x.id !== q.id))}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
            <Select
              id={`qtype-${q.id}`}
              label={`Type of ${name(q, index)}`}
              value={q.type}
              onChange={(e) => update(q.id, (x) => withType(x, e.target.value as Question["type"]))}
              disabled={disabled}
            >
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </Select>
            {q.type === "choice" || q.type === "multi" ? (
              <Textarea
                id={`qoptions-${q.id}`}
                label={`Options for ${name(q, index)}`}
                hint="One per line, 2 to 30."
                value={optionText[q.id] ?? q.options.join("\n")}
                onChange={(e) => setOptions(q.id, e.target.value)}
                rows={3}
                disabled={disabled}
              />
            ) : null}
            <TextInput
              id={`qhelp-${q.id}`}
              label="Help text"
              value={q.help}
              onChange={(e) => update(q.id, (x) => ({ ...x, help: e.target.value }))}
              maxLength={500}
              disabled={disabled}
            />
            <Checkbox
              id={`qrequired-${q.id}`}
              label="Required"
              checked={q.required}
              onChange={(e) => update(q.id, (x) => ({ ...x, required: e.target.checked }))}
              disabled={disabled}
            />
          </div>
        )}
      </SortableList>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={add} disabled={disabled || full}>
          Add question
        </Button>
        {full ? <span className="text-c3 text-sm">{MAX_QUESTIONS} questions at most.</span> : null}
      </div>
    </div>
  );
}
