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
        // NOSONAR
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
    // context is passed into each usecase so they can read initialArguments and prior outputs
    let context: Record<string, unknown> = { ...initialArguments };
    // output accumulates only what usecases explicitly return — initialArguments never bleed in
    let output: Record<string, unknown> = {};

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      this.logger.debug(
        `Executing batch ${batchNumber}/${batches.length} ` +
          `(${batch.isTransactional ? 'transactional' : 'non-transactional'}, ` +
          `${batch.usecases.length} usecase(s): ${batch.usecases.map((u) => u.constructor.name).join(', ')})`,
      );

      const startTime = Date.now();

      let batchResult: { context: Record<string, unknown>; batchOutput: Record<string, unknown> };
      if (batch.isTransactional) {
        batchResult = await this.executeTransactionalBatch(batch.usecases, context, isolationLevel);
      } else {
        batchResult = await this.executeNonTransactionalBatch(batch.usecases, context);
      }

      context = batchResult.context;
      output = { ...output, ...batchResult.batchOutput };

      this.logger.debug(`Batch ${batchNumber} completed in ${Date.now() - startTime}ms`);
    }

    return this.cleanResults(output);
  }

  /**
   * Execute a batch of usecases inside a database transaction.
   */
  private async executeTransactionalBatch(
    usecases: Usecase[],
    initialContext: Record<string, unknown>,
    isolationLevel: IsolationLevel,
  ): Promise<{ context: Record<string, unknown>; batchOutput: Record<string, unknown> }> {
    return this.entityManager.transaction(isolationLevel, async (transactionalEntityManager) => {
      let context = { ...initialContext };
      let batchOutput: Record<string, unknown> = {};

      for (const usecase of usecases) {
        const { updatedContext, usecaseOutput } = await this.executeSingleUsecase(
          usecase,
          context,
          transactionalEntityManager,
        );
        context = updatedContext;
        batchOutput = { ...batchOutput, ...usecaseOutput };
      }

      return { context, batchOutput };
    });
  }

  /**
   * Execute a batch of usecases without a database transaction.
   * Useful for external API calls that could timeout.
   */
  private async executeNonTransactionalBatch(
    usecases: Usecase[],
    initialContext: Record<string, unknown>,
  ): Promise<{ context: Record<string, unknown>; batchOutput: Record<string, unknown> }> {
    let context = { ...initialContext };
    let batchOutput: Record<string, unknown> = {};

    for (const usecase of usecases) {
      const { updatedContext, usecaseOutput } = await this.executeSingleUsecase(
        usecase,
        context,
        this.entityManager,
      );
      context = updatedContext;
      batchOutput = { ...batchOutput, ...usecaseOutput };
    }

    return { context, batchOutput };
  }

  private async executeSingleUsecase(
    useCase: Usecase,
    currentContext: Record<string, unknown>,
    entityManager: EntityManager,
  ): Promise<{ updatedContext: Record<string, unknown>; usecaseOutput: Record<string, unknown> }> {
    const useCaseName = useCase.constructor.name;
    const isTransactional = useCase.config?.requiresTransaction ?? true;

    this.logger.debug(`Executing usecase: ${useCaseName} (tx: ${isTransactional})`);

    const startTime = Date.now();
    try {
      // Create a defensive copy of the context to pass to the usecase
      const rawOutput = await useCase.execute(entityManager, { ...currentContext });

      // Validate result is an object
      if (!rawOutput || typeof rawOutput !== 'object') {
        throw new Error(`Usecase ${useCaseName} returned invalid result: ${typeof rawOutput}`);
      }

      const usecaseOutput = rawOutput as Record<string, unknown>;

      this.logUsecaseCompletion(useCaseName, startTime);

      return {
        usecaseOutput,
        // Merge into context so subsequent usecases can access this output
        updatedContext: { ...currentContext, ...usecaseOutput },
      };
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

  private cleanResults(results: Record<string, unknown>): UsecaseResult {
    try {
      // Create a new object instead of modifying the input
      const cleaned: Record<string, unknown> = { ...results };

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
