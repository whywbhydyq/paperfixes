export interface SettlementFixture {
  order: {
    id: string;
    userId: string;
    status: string;
    amount: number;
    quota: number;
    planKey: string;
    providerTradeNo?: string | null;
  };
  user: {
    id: string;
    plan: string;
    quota: number;
    planExpiresAt: Date | null;
  };
}

export function createSettlementClient(
  fixture: SettlementFixture,
  options: { failTopup?: boolean } = {},
) {
  let state = {
    order: { providerTradeNo: null, ...structuredClone(fixture.order) },
    user: structuredClone(fixture.user),
    topups: [] as Array<Record<string, unknown>>,
  };
  let queue: Promise<unknown> = Promise.resolve();

  const client = {
    get state() {
      return state;
    },
    $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
      const execute = async () => {
        const snapshot = structuredClone(state);
        const tx = {
          $queryRaw: async (_parts: TemplateStringsArray, userId: string) => (
            userId === state.user.id ? [{ id: userId }] : []
          ),
          order: {
            findUnique: async ({ where }: any) => {
              if (where.id) return where.id === state.order.id ? { ...state.order } : null;
              if (where.providerTradeNo) {
                return where.providerTradeNo === state.order.providerTradeNo
                  ? { ...state.order }
                  : null;
              }
              return null;
            },
            updateMany: async ({ where, data }: any) => {
              if (where.id !== state.order.id || where.status !== state.order.status) {
                return { count: 0 };
              }
              state.order = { ...state.order, ...data };
              return { count: 1 };
            },
          },
          user: {
            findUnique: async ({ where }: any) => (
              where.id === state.user.id ? { ...state.user } : null
            ),
            update: async ({ where, data }: any) => {
              if (where.id !== state.user.id) throw new Error('USER_NOT_FOUND');
              state.user = {
                ...state.user,
                plan: data.plan,
                planExpiresAt: data.planExpiresAt,
                quota: typeof data.quota === 'number'
                  ? data.quota
                  : state.user.quota + data.quota.increment,
              };
              return { ...state.user };
            },
          },
          topup: {
            create: async ({ data }: any) => {
              if (options.failTopup) throw new Error('TOPUP_WRITE_FAILED');
              state.topups.push({ ...data });
              return data;
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
