import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Job, JobOverview, JobStatus } from "@/integrations/supabase/types";
import { toJobRow, type JobFormValues } from "@/lib/schemas/job";

const LIST_KEY = ["admin-jobs"] as const;

export const useJobList = () =>
  useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_job_overview")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobOverview[];
    },
  });

export const useJob = (id: string | undefined) =>
  useQuery({
    queryKey: ["admin-job", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Job;
    },
  });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: JobFormValues) => {
      const { data, error } = await supabase.from("jobs").insert(toJobRow(v)).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
};

export const useUpdateJob = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: JobFormValues) => {
      const { error } = await supabase.from("jobs").update(toJobRow(v)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["admin-job", id] });
    },
  });
};

export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
};

export const useToggleStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const prev = qc.getQueryData<JobOverview[]>(LIST_KEY);
      qc.setQueryData<JobOverview[]>(LIST_KEY, (rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(LIST_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
};
