/** NestJS API. Public calc lives in `./calc`. */

export { AppModule } from './app.module.js';
export {
  CalcModule,
  CalcService,
  computeDepth,
  computeSpread,
  CalcDepthBodySchema,
  CalcSpreadBodySchema,
} from './calc/index.js';

export const PACKAGE_NAME = '@troll/api' as const;
