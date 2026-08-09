interface FakePlanUser {
  id: string;
  plan: string;
  quota: number;
  totalUsed?: number;
  planExpiresAt: Date | null;
}

export function createPlanClient(initial: FakePlanUser) {
  let user = { totalUsed: 0, ...initial };
  let transitionCount = 0;

  const client = {
    user: {
      async updateMany(args: any) {
        const requestedId = args.where.id as string | undefined;
        const due = (!requestedId || user.id === requestedId)
          && user.plan !== 'free'
          && user.planExpiresAt !== null
          && user.planExpiresAt <= args.where.planExpiresAt.lte;
        if (!due) return { count: 0 };
        user = { ...user, ...args.data };
        transitionCount += 1;
        return { count: 1 };
      },
      async findUnique(args: any) {
        return args.where.id === user.id ? { ...user } : null;
      },
    },
    get transitionCount() {
      return transitionCount;
    },
    get currentUser() {
      return { ...user };
    },
  };

  return client;
}
