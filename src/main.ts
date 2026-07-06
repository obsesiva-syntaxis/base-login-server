import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);

  const port = +configService.get('SERVER_PORT', 3030);
  const prefix = configService.get('API_PREFIX', 'api');
  const version = configService.get('API_VERSION', '1');
  const corsOrigin = configService.get('CORS_ORIGIN', '*');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Base Login Server API')
    .setDescription('Authentication server with JWT, roles, and rate limiting')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.setGlobalPrefix(prefix, { exclude: ['docs', 'docs/(.*)'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: version,
  });

  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((s: string) => s.trim()),
  });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
}
bootstrap();
