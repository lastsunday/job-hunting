import { showNotification } from "@mantine/notifications";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
      onError(error, variables, context) {
        showNotification({
          color: "red",
          title: "Error",
          message: error.message
        })
      },
    }
  }
})
