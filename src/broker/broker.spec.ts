import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  RequestTimeoutException,
} from '@nestjs/common';
import { Broker } from './broker';
import { Usecase } from './types';

// Concrete transactional usecase
class TxUsecase extends Usecase<{ step: string }> {
  readonly config = { requiresTransaction: true };
  execute = vi.fn().mockResolvedValue({ step: 'tx-done' });
}

// Concrete non-transactional usecase
class NonTxUsecase extends Usecase<{ ext: boolean }> {
  readonly config = { requiresTransaction: false };
  execute = vi.fn().mockResolvedValue({ ext: true });
}

describe('Broker', () => {
  let broker: Broker;
  let entityManager: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    entityManager = mock<EntityManager>();
    // Make transaction() call the callback
    entityManager.transaction.mockImplementation(async (isolationOrCb: any, cb?: any) => {
      const callback = typeof isolationOrCb === 'function' ? isolationOrCb : cb;
      return callback(entityManager);
    });
    broker = new Broker(entityManager);
  });

  describe('input validation', () => {
    it('should throw BadRequestException for empty array', async () => {
      await expect(broker.runUsecases([] as any, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if usecase missing execute method', async () => {
      await expect(
        broker.runUsecases([{ config: { requiresTransaction: true } } as any], {}),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw if timeoutMs <= 0', async () => {
      const uc = new TxUsecase();
      await expect(broker.runUsecases([uc], {}, 0)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('transactional execution', () => {
    it('should run a transactional usecase inside a transaction', async () => {
      const uc = new TxUsecase();
      const result = await broker.runUsecases([uc], { initial: 'arg' });

      expect(entityManager.transaction).toHaveBeenCalled();
      expect(uc.execute).toHaveBeenCalled();
      expect(result).toHaveProperty('step', 'tx-done');
    });

    it('should NOT use transaction for non-transactional usecase', async () => {
      const uc = new NonTxUsecase();
      await broker.runUsecases([uc], {});

      expect(entityManager.transaction).not.toHaveBeenCalled();
      expect(uc.execute).toHaveBeenCalled();
    });
  });

  describe('result merging', () => {
    it('should merge results from sequential usecases', async () => {
      const uc1 = new TxUsecase();
      const uc2 = new TxUsecase();
      uc1.execute.mockResolvedValue({ firstResult: 'a' });
      uc2.execute.mockResolvedValue({ secondResult: 'b' });

      const result = await broker.runUsecases([uc1, uc2], {});

      expect(result).toHaveProperty('firstResult', 'a');
      expect(result).toHaveProperty('secondResult', 'b');
    });

    it('should strip sensitive fields from final result', async () => {
      const uc = new TxUsecase();
      uc.execute.mockResolvedValue({
        safeData: 'keep',
        password: 'should-be-stripped',
        token: 'also-stripped',
        secret: 'stripped-too',
        apiKey: 'gone',
        api_key: 'also-gone',
      });

      const result = await broker.runUsecases([uc], {});

      expect(result).toHaveProperty('safeData', 'keep');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('apiKey');
      expect(result).not.toHaveProperty('api_key');
    });

    it('should strip initial arguments from final result', async () => {
      const uc = new TxUsecase();
      uc.execute.mockResolvedValue({ newField: 'value' });

      const result = await broker.runUsecases([uc], { email: 'user@test.com', password: 'pw' });

      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('newField', 'value');
    });
  });

  describe('batching', () => {
    it('should group consecutive tx usecases into one transaction', async () => {
      const uc1 = new TxUsecase();
      const uc2 = new TxUsecase();
      uc1.execute.mockResolvedValue({ a: 1 });
      uc2.execute.mockResolvedValue({ b: 2 });

      await broker.runUsecases([uc1, uc2], {});

      // Both in one transaction batch
      expect(entityManager.transaction).toHaveBeenCalledTimes(1);
    });

    it('should create separate batches for tx/non-tx/tx pattern', async () => {
      const txUc1 = new TxUsecase();
      const nonTxUc = new NonTxUsecase();
      const txUc2 = new TxUsecase();
      txUc1.execute.mockResolvedValue({ a: 1 });
      nonTxUc.execute.mockResolvedValue({ b: 2 });
      txUc2.execute.mockResolvedValue({ c: 3 });

      const result = await broker.runUsecases([txUc1, nonTxUc, txUc2], {});

      expect(entityManager.transaction).toHaveBeenCalledTimes(2); // batch 1 and batch 3
      expect(result).toMatchObject({ a: 1, b: 2, c: 3 });
    });
  });

  describe('timeout', () => {
    it('should throw RequestTimeoutException when execution exceeds timeout', async () => {
      const uc = new TxUsecase();
      uc.execute.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));
      entityManager.transaction.mockImplementation(async (isolationOrCb: any, cb?: any) => {
        const callback = typeof isolationOrCb === 'function' ? isolationOrCb : cb;
        return callback(entityManager);
      });

      await expect(broker.runUsecases([uc], {}, 50)).rejects.toThrow(RequestTimeoutException);
    }, 3000);
  });

  describe('error propagation', () => {
    it('should propagate errors thrown by usecases', async () => {
      const uc = new TxUsecase();
      uc.execute.mockRejectedValue(new Error('usecase failed'));

      await expect(broker.runUsecases([uc], {})).rejects.toThrow('usecase failed');
    });

    it('should throw if usecase returns non-object result', async () => {
      const uc = new TxUsecase();
      uc.execute.mockResolvedValue(null as any);

      await expect(broker.runUsecases([uc], {})).rejects.toThrow();
    });
  });
});
