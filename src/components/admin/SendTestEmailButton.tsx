import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function SendTestEmailButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-test-email", { body: { jobId } });
    setBusy(false);
    if (error || !data?.ok) {
      let msg = data?.error as string | undefined;
      try {
        msg ??= (await (error as { context?: Response })?.context?.json())?.error;
      } catch {
        /* non-JSON error body */
      }
      toast.error(msg ?? "Failed to send test email");
    }
    else toast.success(`Test email sent to ${data.sentTo}`);
  };
  return (
    <Button type="button" variant="outline" onClick={send} disabled={busy}>
      <Mail className="h-4 w-4" aria-hidden /> {busy ? "Sending…" : "Send test email"}
    </Button>
  );
}
