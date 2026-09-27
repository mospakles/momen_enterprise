import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  await app.listen(config.get('PORT') ?? 4000);
}
bootstrap();
