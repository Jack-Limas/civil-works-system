import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useEvidenceList(projectId?: string) {
  return useQuery({
    queryKey: ["evidence", "list", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get("/evidence", { params: { projectId } });
      return data;
    },
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post("/evidence", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence"] }),
  });
}