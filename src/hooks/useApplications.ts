import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Application } from "@/integrations/supabase/types";

const KEY = "admin-applications";
const LIMIT = 200;

export const useApplications = (jobId: string | null) =>
  useQuery({
    queryKey: [KEY, jobId],
    queryFn: async () => {
      let q = supabase.from("applications").select("*").order("submitted_at", { ascending: false }).limit(LIMIT);
      if (jobId) q = q.eq("job_id", jobId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });

async function functionError(error: unknown, data: { error?: string } | null, fallback: string) {
  let msg = data?.error;
  try {
    msg ??= (await (error as { context?: Response })?.context?.json())?.error;
  } catch {
    /* non-JSON error body */
  }
  return msg ?? fallback;
}

export const useResendApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.functions.invoke("resend-application", { body: { applicationId } });
      if (error || !data?.ok) throw new Error(await functionError(error, data, "Failed to resend"));
      return data as { ok: true; sentTo: string };
    },
    // success or failure both change email_status on the server
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

// Short-lived link to a CV in the private bucket (admin read policy)
export async function getResumeUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
  if (error || !data) throw error ?? new Error("No URL");
  return data.signedUrl;
}
