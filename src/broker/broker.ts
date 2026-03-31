import {
  Injectable,
  Logger,
  RequestTimeoutException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Usecase, UsecaseBatch } from './types';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

// Define specific return type for clarity
export interface UsecaseResult {
  [key: string]: unknown;
}

@Injectable()
export class Broker {
  private readonly logger = new Logger(Broker.name);
  private readonly DEFAULT_TIMEOUT = 60000;
  // Default isolation level
  private readonly DEFAULT_ISOLATION = 'READ COMMITTED' as IsolationLevel;

  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  /**
   * Run usecases with intelligent batching based on transaction requirements.
   *
   * Consecutive usecases with the same transaction requirement are batched together:
   * - Transactional batches run in a single database transaction
   * - Non-transactional batches run without a transaction (safe for external API calls)
   *
   * Results flow through all batches sequentially.
   *
   * @example
   * // [UsecaseA (tx), UsecaseB (tx), UsecaseC (no-tx), UsecaseD (tx)]
   * // Becomes:
   * // Batch 1: [UsecaseA, UsecaseB] → Single transaction
   * // Batch 2: [UsecaseC] → No transaction
   * // Batch 3: [UsecaseD] → New transaction
   */
  async runUsecases<P extends Record<string, any>>(
    usecases: [Usecase<any, P>, ...Usecase[]],
    initialArguments: P,
    timeoutMs = this.DEFAULT_TIMEOUT,
    isolationLevel = this.DEFAULT_ISOLATION,
  ): Promise<UsecaseResult> {
    // Validate inputs
    this.validateUsecases(usecases);
    this.validateTimeout(timeoutMs);

    // Group usecases into batches by transaction requirement
    const batches = this.groupIntoBatches(usecases);

    this.logger.debug(
      `Grouped ${usecases.length} usecases into ${batches.length} batches: ${this.describeBatches(batches)}`,
    );

    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // Execute batches with timeout
      const executionPromise = this.executeBatches(batches, initialArguments, isolationLevel);

      if (timeoutMs < Infinity) {
        const result = await Promise.race([executionPromise, this.createTimeoutPromise(timeoutMs)]);
        return result;
      }

      return await executionPromise;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Single concise error log to avoid memory bloat from duplicate logging
      this.logger.error(
        `Batch execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw error;
    }
  }

  /**
   * Group consecutive usecases by their transaction requirement.
   *
   * @example
   * Input: [A(tx), B(tx), C(no-tx), D(tx)]
   * Output: [
   *   { isTransactional: true, usecases: [A, B] },
   *   { isTransactional: false, usecases: [C] },
   *   { isTransactional: true, usecases: [D] }
   * ]
   */
  private groupIntoBatches(usecases: Usecase[]): UsecaseBatch[] {
    if (usecases.length === 0) {
      return [];
    }

    const batches: UsecaseBatch[] = [];
    let currentBatch: UsecaseBatch | null = null;

    for (const usecase of usecases) {
      // Default to true for backward compatibility if config is not defined
      const requiresTransaction = usecase.config?.requiresTransaction ?? true;

      if (currentBatch === null || currentBatch.isTransactional !== requiresTransaction) {
        // Start a new batch
        currentBatch = {
          isTransactional: requiresTransaction,
          usecases: [usecase],
        };
        batches.push(currentBatch);
      } else {
        // Add to current batch
        currentBatch.usecases.push(usecase);
      }
    }

    return batches;
  }

  /**
   * Execute batches sequentially, passing results between them.
   */
  private async executeBatches(
    batches: UsecaseBatch[],
    initialArguments: Record<string, unknown>,
    isolationLevel: IsolationLevel,
  ): Promise<UsecaseResult> {
    let results: Record<string, unknown> = { ...initialArguments };

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      this.logger.debug(
        `Executing batch ${batchNumber}/${batches.length} ` +
          `(${batch.isTransactional ? 'transactional' : 'non-transactional'}, ` +
          `${batch.usecases.length} usecase(s): ${batch.usecases.map((u) => u.constructor.name).join(', ')})`,
      );

      const startTime = Date.now();

      if (batch.isTransactional) {
        results = await this.executeTransactionalBatch(batch.usecases, results, isolationLevel);
      } else {
        results = await this.executeNonTransactionalBatch(batch.usecases, results);
      }

      this.logger.debug(`Batch ${batchNumber} completed in ${Date.now() - startTime}ms`);
    }

    return this.cleanResults(results, initialArguments);
  }

  /**
   * Execute a batch of usecases inside a database transaction.
   */
  private async executeTransactionalBatch(
    usecases: Usecase[],
    initialResults: Record<string, unknown>,
    isolationLevel: IsolationLevel,
  ): Promise<Record<string, unknown>> {
    return this.entityManager.transaction(isolationLevel, async (transactionalEntityManager) => {
      let results = { ...initialResults };

      for (const usecase of usecases) {
        results = await this.executeSingleUsecase(usecase, results, transactionalEntityManager);
      }

      return results;
    });
  }

  /**
   * Execute a batch of usecases without a database transaction.
   * Useful for external API calls that could timeout.
   */
  private async executeNonTransactionalBatch(
    usecases: Usecase[],
    initialResults: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let results = { ...initialResults };

    for (const usecase of usecases) {
      // Use the regular (non-transactional) entity manager
      results = await this.executeSingleUsecase(usecase, results, this.entityManager);
    }

    return results;
  }

  private async executeSingleUsecase(
    useCase: Usecase,
    currentResults: Record<string, unknown>,
    entityManager: EntityManager,
  ): Promise<Record<string, unknown>> {
    const useCaseName = useCase.constructor.name;
    const isTransactional = useCase.config?.requiresTransaction ?? true;

    this.logger.debug(`Executing usecase: ${useCaseName} (tx: ${isTransactional})`);

    const startTime = Date.now();
    try {
      // Create a defensive copy of the results to pass to the usecase
      const result = await useCase.execute(entityManager, { ...currentResults });

      // Validate result is an object
      if (!result || typeof result !== 'object') {
        throw new Error(`Usecase ${useCaseName} returned invalid result: ${typeof result}`);
      }

      this.logUsecaseCompletion(useCaseName, startTime);

      // Combine results, preserving the original and adding new properties
      return { ...currentResults, ...result };
    } catch (error) {
      this.logUsecaseFailure(useCaseName, startTime, error);
      throw error;
    }
  }

  private validateUsecases(usecases: Usecase[]): void {
    if (!Array.isArray(usecases) || usecases.length === 0) {
      throw new BadRequestException('At least one usecase must be provided');
    }

    for (const usecase of usecases) {
      if (!usecase || typeof usecase.execute !== 'function') {
        throw new InternalServerErrorException('Invalid usecase provided: missing execute method');
      }
    }
  }

  private validateTimeout(timeoutMs: number): void {
    if (timeoutMs <= 0) {
      throw new InternalServerErrorException('Timeout must be greater than 0');
    }
  }

  private describeBatches(batches: UsecaseBatch[]): string {
    return batches
      .map((b, i) => `[${i + 1}: ${b.isTransactional ? 'TX' : 'NO-TX'} (${b.usecases.length})]`)
      .join(' → ');
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new RequestTimeoutException(`Execution timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      // Ensure the timeout is cleared if the promise is garbage collected
      if (typeof timeoutId.unref === 'function') {
        timeoutId.unref();
      }

      return timeoutId;
    });
  }

  private logUsecaseCompletion(useCaseName: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.logger.debug(`Usecase ${useCaseName} completed in ${duration}ms`);
  }

  private logUsecaseFailure(useCaseName: string, startTime: number, error: unknown): void {
    const duration = Date.now() - startTime;
    this.logger.error(
      `Usecase ${useCaseName} failed after ${duration}ms`,
      error instanceof Error ? error.stack : String(error),
    );
  }

  private cleanResults(
    results: Record<string, unknown>,
    initialArguments: Record<string, unknown>,
  ): UsecaseResult {
    try {
      // Create a new object instead of modifying the input
      const cleaned: Record<string, unknown> = { ...results };

      // Remove initial arguments
      for (const key in initialArguments) {
        delete cleaned[key];
      }

      // Remove sensitive data (add more fields as needed)
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
      for (const field of sensitiveFields) {
        if (field in cleaned) {
          delete cleaned[field];
        }
      }

      const safeResults = this.safeStringify(cleaned);
      this.logger.debug(`Execution completed with results: ${safeResults}`);
      return cleaned;
    } catch (error) {
      this.logger.warn(
        'Error in cleanResults',
        error instanceof Error ? error.message : String(error),
      );
      // Return empty object rather than failing the entire execution
      return {};
    }
  }

  /**
   * Safely stringify objects, handling circular references
   */
  private safeStringify(obj: unknown): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      this.logger.warn(
        'Failed to stringify object',
        error instanceof Error ? error.message : String(error),
      );
      return '[Object cannot be serialized]';
    }
  }
}
