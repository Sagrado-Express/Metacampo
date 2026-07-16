# Retry + Toast Pattern

## Overview

This document describes how to implement reliable network operations with automatic retry and user feedback via toast notifications.

## Components

### 1. `useRetryMutation` Hook

Wraps TanStack Query mutations with exponential backoff retry logic.

```typescript
import { useRetryMutation } from '@/hooks/useRetryMutation';

const mutation = useRetryMutation(
  async (payload) => {
    const res = await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('API error');
    return res.json();
  },
  {
    maxAttempts: 3,        // Number of retry attempts (default: 3)
    baseDelayMs: 1000,     // Initial delay in ms (default: 1000)
    maxDelayMs: 10000,     // Maximum delay in ms (default: 10000)
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle final error after all retries exhausted
    },
  }
);
```

### 2. Toast Notifications

The `ToastProvider` context wraps the entire app. Use the `useToast` hook to show notifications:

```typescript
import { useToast } from '@/components/Toast/ToastContext';

function MyComponent() {
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      addToast('Dados salvos com sucesso', 'success', 4000); // type, duration
    } catch (error) {
      addToast('Erro ao salvar. Tente novamente.', 'error', 5000);
    }
  };

  return <button onClick={handleSave}>Salvar</button>;
}
```

### 3. Full Pattern Example

```typescript
'use client';

import { useRetryMutation } from '@/hooks/useRetryMutation';
import { useToast } from '@/components/Toast/ToastContext';
import { Loader2 } from 'lucide-react';

export default function ClientForm() {
  const { addToast } = useToast();
  const { queryClient } = useQueryClient(); // if using React Query

  const saveMutation = useRetryMutation(
    async (formData) => {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao salvar');
      }

      return res.json();
    },
    {
      maxAttempts: 3,
      baseDelayMs: 500,
      onSuccess: (data) => {
        addToast('Cliente salvo com sucesso', 'success');
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
      },
      onError: (error) => {
        addToast(`Erro: ${error.message}`, 'error', 6000);
      },
    }
  );

  return (
    <button
      onClick={() => saveMutation.mutate({ name: 'John Doe' })}
      disabled={saveMutation.isPending}
    >
      {saveMutation.isPending ? <Loader2 className="animate-spin" /> : 'Salvar'}
    </button>
  );
}
```

## Toast Types

- `'success'` — Green background, checkmark icon
- `'error'` — Red background, alert icon
- `'warning'` — Yellow background, alert icon
- `'info'` — Blue background, info icon (default)

## Retry Strategy

Uses exponential backoff:
- Attempt 1: fail → wait 1000ms
- Attempt 2: fail → wait 2000ms
- Attempt 3: fail → wait 4000ms (or until maxDelayMs)
- Result: Error thrown

Ideal for:
- Network timeouts (transient failures)
- Server overload (503 errors)
- Rate limiting (429 errors)

## Network Error Handling

The pattern handles these cases:

1. **Network error** → Automatic retry with backoff → Toast on final failure
2. **Server 5xx error** → Automatic retry with backoff → Toast on final failure
3. **Client 4xx error** → No retry (user/input error) → Toast immediately
4. **Success** → Toast confirmation → Refetch data if needed

## Configuration

To apply to new routes:

1. Wrap the fetch call in `useRetryMutation`
2. Add `onSuccess` and `onError` handlers that call `addToast`
3. Disable button/input while `mutation.isPending` is true
4. Show loading spinner during pending state

## Best Practices

✅ **DO:**
- Retry transient failures (network, timeouts, 5xx)
- Show loading states during retry
- Display clear error messages to user
- Invalidate React Query cache on success
- Use appropriate toast durations (4-6 seconds)

❌ **DON'T:**
- Retry on 4xx client errors (already failed)
- Retry on auth errors (401, 403)
- Log sensitive data in error messages
- Retry indefinitely (cap at 3-5 attempts max)
- Show success toast for silent operations

## Implementation Checklist

When adding retry/toast to a new mutation:
- [ ] Import `useRetryMutation` and `useToast`
- [ ] Configure retry parameters (attempts, delays)
- [ ] Add success callback with toast
- [ ] Add error callback with toast
- [ ] Disable/show loading state on button
- [ ] Test with network failure (DevTools → throttle)
- [ ] Verify toast appears after retry exhausted
