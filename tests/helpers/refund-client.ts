export interface RefundFixture {
  job: { id: string; userId: string; status: string; error?: string | null };
  user: { id: string; quota: number; totalUsed: number };
}

export function createRefundClient(fixture: RefundFixture) {
  let state = structuredClone(fixture);
  let queue: Promise<unknown> = Promise.resolve();
  const client = {
    get state() {
      return state;
    },
    $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
      const execute = async () => {
        const snapshot = structuredClone(state);
        const tx = {
          job: {
            updateMany: async ({ where, data }: any) => {
              const matches = state.job.id === where.id
                && state.job.userId === where.userId
                && where.status.in.includes(state.job.status);
              if (!matches) return { count: 0 };
              state.job = { ...state.job, ...data };
              return { count: 1 };
            },
          },
          user: {
            updateMany: async ({ where, data }: any) => {
              if (state.user.id !== where.id || state.user.totalUsed <= 0) {
                return { count: 0 };
              }
              state.user = {
                ...state.user,
                quota: state.user.quota + data.quota.increment,
                totalUsed: state.user.totalUsed - 1,
              };
              return { count: 1 };
            },
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      };
      const result = queue.then(execute, execute) as Promise<T>;
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return client;
}
