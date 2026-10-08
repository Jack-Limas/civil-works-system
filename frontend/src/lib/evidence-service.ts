import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Mirrors the backend Evidence row plus the included project and uploader. */
export interface Evidence {
  id: string;
  projectId: string;
  activityId: string | null;
  imageUrl: string;
  description: string | null;
  date: string;
  project?: { id: string; name: string };
  uploadedBy?: { id: string; name: string };
}

export function useEvidenceList(projectId?: string, limit = 20) {
  return useQuery({
    queryKey: ["evidence", "list", projectId, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Evidence[] }>("/evidence", {
        params: { projectId, limit },
      });
      return data;
    },
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<{ data: Evidence }>("/evidence", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence"] }),
  });
}
