import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString } from 'class-validator';

/**
 * NOTE: this accepts an already-verified provider profile rather than a raw
 * provider token — wiring up real Google/Apple sign-in means verifying their
 * token server-side first (e.g. `google-auth-library`'s `verifyIdToken`,
 * or Apple's JWKS-based JWT check) and only then calling this with the
 * verified `providerAccountId`/`email`/`name`. That verification step is
 * intentionally not implemented yet — no provider credentials exist for
 * this project. Do not expose this endpoint to the public internet as-is.
 */
export class SocialLoginDto {
  @ApiProperty({ enum: ['google', 'apple'] })
  @IsIn(['google', 'apple'])
  provider!: 'google' | 'apple';

  @ApiProperty()
  @IsString()
  providerAccountId!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  name!: string;
}
