import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const queueConfigOptions = {
  bullmq: {
    attempts: Number.parseInt(String(process.env.QUEUE_JOB_ATTEMPTS), 10),
    backoffDelay: Number.parseInt(String(process.env.QUEUE_BACKOFF_DELAY), 10),
    removeOnComplete: process.env.QUEUE_REMOVE_ON_COMPLETE,
    removeOnFail: process.env.QUEUE_REMOVE_ON_FAIL,
  },
};

export default registerAs('queueConfig', () => queueConfigOptions);
