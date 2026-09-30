import { forwardRef, useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Textarea, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export const MarkdownField = forwardRef<HTMLTextAreaElement, Props>(({ label, error, value, ...props }, ref) => {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const id = useId();
  const tabBtn = (t: "write" | "preview", text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => setTab(t)}
      className={cn("rounded px-3 py-1 text-sm", tab === t ? "bg-accent font-medium" : "text-muted-foreground")}
    >
      {text}
    </button>
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div role="tablist" className="flex gap-1">
          {tabBtn("write", "Write")}
          {tabBtn("preview", "Preview")}
        </div>
      </div>
      {tab === "write" ? (
        <Textarea ref={ref} id={id} rows={10} value={value} aria-invalid={!!error} {...props} />
      ) : (
        <div className="prose prose-sm min-h-[240px] max-w-none rounded-md border bg-background p-3">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{String(value ?? "") || "*Nothing to preview*"}</ReactMarkdown>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
MarkdownField.displayName = "MarkdownField";
