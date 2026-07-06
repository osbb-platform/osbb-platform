export type AsyncServerAction<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

export function invokeServerAction<TArgs extends unknown[], TResult>(
  action: AsyncServerAction<TArgs, TResult>,
  ...args: TArgs
): Promise<TResult> {
  return action(...args);
}
