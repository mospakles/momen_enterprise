import { NestFactory } from '@nestjs/core';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MEDIA_UPLOAD_DIR } from './cms/media/media-storage.config';

async function bootstrap() {
  // rawBody: true populates `request.rawBody` alongside the normal parsed
  // `request.body` — needed to verify the Paystack webhook's HMAC signature
  // over the exact bytes it signed, before JSON parsing/whitespace changes
  // anything. See payments/webhooks/payment-webhooks.controller.ts.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGIN')?.split(',') ?? 'http://localhost:3000',
    credentials: true,
  });
  // CORS is not a CSRF control: browsers can still submit some cross-origin
  // requests. Cookie-authenticated writes must originate from one of the
  // configured frontend origins. Bearer-token API clients and provider
  // webhooks do not send these session cookies and remain unaffected.
  const allowedOrigins = (config.get('CORS_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use((request, _response, next) => {
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const hasSessionCookie = request.headers.cookie?.includes('momen_');
    const origin = request.headers.origin;
    if (unsafe && hasSessionCookie && origin && !allowedOrigins.includes(origin)) {
      return next(new ForbiddenException('Cross-origin request rejected'));
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');

  // Multer's diskStorage won't create its destination directory itself.
  // Served outside the `/api` prefix (useStaticAssets bypasses it) so
  // MediaAsset.url values like "/uploads/<file>" resolve directly.
  mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
  app.useStaticAssets(MEDIA_UPLOAD_DIR, { prefix: '/uploads' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Momen API')
    .setDescription(
      'Storefront + admin backend for the Momen made-to-measure platform',
    )
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Railway and other container platforms send SIGTERM during deploys. Let
  // Nest run Prisma's shutdown hooks so connections close cleanly.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
