import { router, publicProcedure, protectedProcedure } from '../init';
import { z } from 'zod';
import { bombRouter } from './bomb';

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string() }).optional())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? 'World'}`,
      };
    }),
  secretMessage: protectedProcedure.query(({ ctx }) => {
    return {
      message: `Hello ${ctx.session.user.name}, you are logged in!`,
    };
  }),
  bomb: bombRouter,
});

export type AppRouter = typeof appRouter;