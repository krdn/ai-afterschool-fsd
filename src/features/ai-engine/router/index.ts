export {
  optimizeProviderOrder,
  estimateCost,
  type BudgetPeriod,
  type BudgetAlert,
  type RoutingResult,
} from "./smart-routing"

export {
  withFailover,
  createFailoverExecutor,
  isRetryableError,
  logProviderError,
  logFailoverChain,
  logFailoverSuccess,
  FailoverError,
  type FailoverContext,
  type FailoverResult,
  type ProviderError,
  type TrackFailureFn,
} from "./failover"
