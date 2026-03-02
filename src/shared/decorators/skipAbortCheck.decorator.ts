import { SetMetadata } from '@nestjs/common';

/**
 * Skip Abort Check Decorator
 *
 * Use this decorator to disable client-disconnect detection for specific endpoints.
 * When applied, the request will always run to completion even if the client disconnects.
 *
 * When to use:
 * - Webhook delivery endpoints (must complete for external consistency)
 * - Settlement finalization (partial execution would leave inconsistent state)
 * - Any endpoint where stopping mid-flight is worse than completing without a listener
 *
 * When NOT to use:
 * - Normal CRUD endpoints
 * - Long-running queries that can safely be cancelled
 * - Endpoints where the result is only useful to the caller
 *
 * Usage:
 * ```typescript
 * @Controller('webhooks')
 * export class WebhookController {
 *   @SkipAbortCheck()
 *   @Post('stripe')
 *   async handleStripeWebhook(@Body() payload: any) {
 *     return this.webhookService.processStripe(payload);
 *   }
 * }
 * ```
 */
export const SKIP_ABORT_CHECK_KEY = 'skipAbortCheck';

export const SkipAbortCheck = () => SetMetadata(SKIP_ABORT_CHECK_KEY, true);
