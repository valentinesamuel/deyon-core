/**
 * @deprecated Use JwtAuthGuard instead.
 * This file is kept for backwards compatibility.
 * JwtAuthGuard is registered globally via APP_GUARD in app.module.ts.
 */
export { JwtAuthGuard as PrivateRouteGuard } from './jwtAuth.guard';
