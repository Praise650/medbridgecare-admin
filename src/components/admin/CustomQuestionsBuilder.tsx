import { useState } from "react";
import { useFieldArray, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { JobFormInput } from "@/lib/schemas/job";

const MAX = 15;
const idFromLabel = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

type Props = {
  control: Control<JobFormInput>;
  register: UseFormRegister<JobFormInput>;
  watch: UseFormWatch<JobFormInput>;
  setValue: UseFormSetValue<JobFormInput>;
  error?: string;
};

export function CustomQuestionsBuilder({ control, register, watch, setValue, error }: Props) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "custom_questions" });
  const [optionDraft, setOptionDraft] = useState<Record<number, string>>({});

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Custom questions ({fields.length}/{MAX})</legend>
      {fields.map((f, i) => {
        const type = watch(`custom_questions.${i}.type`);
        const options = watch(`custom_questions.${i}.options`) ?? [];
        return (
          <div key={f.id} className="space-y-3 rounded-md border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
              <div className="space-y-1">
                <Label htmlFor={`q-label-${i}`}>Label</Label>
                <Input
                  id={`q-label-${i}`}
                  {...register(`custom_questions.${i}.label`, {
                    onBlur: (e) => {
                      if (!watch(`custom_questions.${i}.id`)) setValue(`custom_questions.${i}.id`, idFromLabel(e.target.value));
                    },
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`q-type-${i}`}>Type</Label>
                <Select id={`q-type-${i}`} {...register(`custom_questions.${i}.type`)}>
                  <option value="text">Text</option>
                  <option value="textarea">Long text</option>
                  <option value="select">Select</option>
                  <option value="url">URL</option>
                </Select>
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" {...register(`custom_questions.${i}.required`)} /> Required
              </label>
            </div>

            {type === "select" && (
              <div className="space-y-2">
                <Label htmlFor={`q-opt-${i}`}>Options</Label>
                <div className="flex flex-wrap gap-2">
                  {options.map((o, oi) => (
                    <span key={oi} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">
                      {o}
                      <button
                        type="button"
                        aria-label={`Remove option ${o}`}
                        onClick={() =>
                          setValue(`custom_questions.${i}.options`, options.filter((_, k) => k !== oi), { shouldDirty: true })
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id={`q-opt-${i}`}
                    value={optionDraft[i] ?? ""}
                    onChange={(e) => setOptionDraft((d) => ({ ...d, [i]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click();
                      }
                    }}
                    placeholder="Add an option"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const v = (optionDraft[i] ?? "").trim();
                      if (!v) return;
                      setValue(`custom_questions.${i}.options`, [...options, v], { shouldDirty: true });
                      setOptionDraft((d) => ({ ...d, [i]: "" }));
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">Advanced</summary>
              <div className="mt-2 space-y-1">
                <Label htmlFor={`q-id-${i}`}>Question ID (unique)</Label>
                <Input id={`q-id-${i}`} {...register(`custom_questions.${i}.id`)} />
              </div>
            </details>

            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= MAX}
        onClick={() => append({ id: "", label: "", type: "text", required: false })}
      >
        <Plus className="h-4 w-4" aria-hidden /> Add question
      </Button>
    </fieldset>
  );
}
