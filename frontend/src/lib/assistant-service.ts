import { apiClient } from "./api-client";
import { useMutation } from "@tanstack/react-query";

export function useAskAssistant() {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await apiClient.post<{ data: { answer: string } }>(
        "/assistant/ask",
        { question }
      );
      return data.data.answer;
    },
  });
}