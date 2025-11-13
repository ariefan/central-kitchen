import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{ item: T; error: string }>;
}

interface BulkOperationOptions {
  onProgress?: (current: number, total: number) => void;
  showToast?: boolean;
}

/**
 * Custom hook for bulk operations (delete, update status, etc.)
 * Uses Promise.allSettled to handle operations in parallel while tracking failures
 */
export function useBulkOperations<T extends { id: string | number }>() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  /**
   * Execute a bulk operation on multiple items
   */
  const executeBulkOperation = useCallback(
    async (
      items: T[],
      operation: (item: T) => Promise<void>,
      options: BulkOperationOptions = {}
    ): Promise<BulkOperationResult<T>> => {
      const { onProgress, showToast = true } = options;

      setIsProcessing(true);
      setProgress({ current: 0, total: items.length });

      const results = await Promise.allSettled(
        items.map(async (item, index) => {
          try {
            await operation(item);
            const current = index + 1;
            setProgress({ current, total: items.length });
            onProgress?.(current, items.length);
            return { status: 'fulfilled' as const, value: item };
          } catch (error) {
            const current = index + 1;
            setProgress({ current, total: items.length });
            onProgress?.(current, items.length);
            return {
              status: 'rejected' as const,
              reason: error instanceof Error ? error.message : 'Unknown error',
              item,
            };
          }
        })
      );

      const success: T[] = [];
      const failed: Array<{ item: T; error: string }> = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          success.push(result.value);
        } else {
          failed.push({
            item: (result as any).item,
            error: result.reason,
          });
        }
      });

      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });

      // Show toast notifications
      if (showToast) {
        if (failed.length === 0) {
          toast.success('Success', {
            description: `Successfully processed ${success.length} item${success.length !== 1 ? 's' : ''}`,
          });
        } else if (success.length === 0) {
          toast.error('Error', {
            description: `Failed to process all ${failed.length} item${failed.length !== 1 ? 's' : ''}`,
          });
        } else {
          toast('Partial Success', {
            description: `Processed ${success.length} item${success.length !== 1 ? 's' : ''}, failed ${failed.length}`,
          });
        }
      }

      return { success, failed };
    },
    []
  );

  /**
   * Bulk delete items using individual DELETE endpoints
   */
  const bulkDelete = useCallback(
    async (
      items: T[],
      deleteApi: (id: string | number) => Promise<void>,
      options: BulkOperationOptions = {}
    ): Promise<BulkOperationResult<T>> => {
      return executeBulkOperation(
        items,
        async (item) => {
          await deleteApi(item.id);
        },
        options
      );
    },
    [executeBulkOperation]
  );

  /**
   * Bulk update status using individual PATCH/PUT endpoints
   */
  const bulkUpdateStatus = useCallback(
    async (
      items: T[],
      status: boolean | string,
      updateApi: (id: string | number, data: any) => Promise<void>,
      options: BulkOperationOptions = {}
    ): Promise<BulkOperationResult<T>> => {
      return executeBulkOperation(
        items,
        async (item) => {
          await updateApi(item.id, { isActive: status });
        },
        options
      );
    },
    [executeBulkOperation]
  );

  /**
   * Bulk update with custom data
   */
  const bulkUpdate = useCallback(
    async (
      items: T[],
      getData: (item: T) => any,
      updateApi: (id: string | number, data: any) => Promise<void>,
      options: BulkOperationOptions = {}
    ): Promise<BulkOperationResult<T>> => {
      return executeBulkOperation(
        items,
        async (item) => {
          const data = getData(item);
          await updateApi(item.id, data);
        },
        options
      );
    },
    [executeBulkOperation]
  );

  return {
    bulkDelete,
    bulkUpdateStatus,
    bulkUpdate,
    executeBulkOperation,
    isProcessing,
    progress,
  };
}
