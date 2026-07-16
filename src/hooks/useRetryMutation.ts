import { useMutation, UseMutationOptions } from '@tanstack/react-query';

interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export function useRetryMutation<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables> & RetryConfig
) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    ...mutationOptions
  } = options || {};

  const exponentialBackoff = (attempt: number) => {
    const delay = baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelayMs);
  };

  const retryWrapper = async (variables: TVariables) => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await mutationFn(variables);
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          const delay = exponentialBackoff(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    mutationFn: retryWrapper,
  });
}
