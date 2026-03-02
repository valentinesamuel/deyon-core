import { EntityManager } from 'typeorm';

/**
 * Configuration for usecase transaction behavior
 */
export interface UsecaseConfig {
  /**
   * Whether this usecase requires a database transaction.
   * - true (default): Usecase runs inside a transaction with transactional EntityManager
   * - false: Usecase runs outside transaction, useful for external API calls
   *
   * When chaining usecases, the broker batches consecutive usecases by their
   * transaction requirement for optimal execution:
   *
   * Example: [UsecaseA (tx), UsecaseB (tx), UsecaseC (no-tx), UsecaseD (tx)]
   *
   * Execution:
   * - Batch 1: [UsecaseA, UsecaseB] → Single transaction
   * - Batch 2: [UsecaseC] → No transaction (external API calls safe here)
   * - Batch 3: [UsecaseD] → New transaction
   *
   * Results flow through all batches sequentially.
   */
  requiresTransaction: boolean;
}

/**
 * Base class for all usecases.
 *
 * @template T - The return type of the execute method
 *
 * @example
 * // Transactional usecase (default) - for DB operations
 * class CreateOrderUsecase extends Usecase<Order> {
 *   async execute(entityManager: EntityManager, params: any): Promise<Order> {
 *     return entityManager.save(Order, params);
 *   }
 * }
 *
 * @example
 * // Non-transactional usecase - for external API calls
 * class FetchInventoryUsecase extends Usecase<InventoryData> {
 *   readonly config: UsecaseConfig = { requiresTransaction: false };
 *
 *   async execute(entityManager: EntityManager, params: any): Promise<InventoryData> {
 *     // External API call - no transaction needed, won't cause timeout
 *     return this.inventoryClient.getInventory(params.productIds);
 *   }
 * }
 */
export abstract class Usecase<T = any> {
  /**
   * Configuration for this usecase.
   * Override in subclass to change transaction behavior.
   *
   * Default: { requiresTransaction: true } for backward compatibility
   *
   * @example
   * // Non-transactional usecase for external API calls
   * class FetchExternalDataUsecase extends Usecase {
   *   readonly config: UsecaseConfig = { requiresTransaction: false };
   *   // ...
   * }
   */
  readonly config?: UsecaseConfig;

  /**
   * Execute the usecase logic.
   *
   * @param entityManager - The entity manager (transactional or regular based on config)
   * @param params - Accumulated results from previous usecases + initial arguments
   * @returns The result to be merged with accumulated results
   */
  abstract execute(entityManager: EntityManager, params: any): Promise<T>;
}

/**
 * Helper to check if a usecase requires a transaction.
 * Defaults to true for backward compatibility.
 */
export function requiresTransaction(usecase: Usecase): boolean {
  return usecase.config?.requiresTransaction ?? true;
}

/**
 * Represents a batch of usecases with the same transaction requirement.
 * Used internally by the Broker for optimal execution.
 */
export interface UsecaseBatch {
  /** Whether this batch runs in a transaction */
  isTransactional: boolean;
  /** Usecases in this batch */
  usecases: Usecase[];
}
