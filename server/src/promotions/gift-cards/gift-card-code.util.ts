import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids misreads

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** "MOM-XXXX-XXXX-XXXX" — collision-checked like order ids. */
export async function generateGiftCardCode(
  prisma: PrismaService,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `MOM-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
    const existing = await prisma.giftCard.findUnique({
      where: { code },
      select: { code: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique gift card code');
}
