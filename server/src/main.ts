import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Push API')
    .setDescription('Endpoints for device registration and push delivery.')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const baseUrl = await app.getUrl();
  const reset = '\x1b[0m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const bold = '\x1b[1m';

  const banner = [
    `${cyan}╔══════════════════════════════════════════════╗${reset}`,
    `${cyan}║${reset} ${bold}${green}🚀 Push API Server Ready${reset}           ${cyan}║${reset}`,
    `${cyan}╠══════════════════════════════════════════════╣${reset}`,
    `${cyan}║${reset} ${yellow}API:${reset}     ${baseUrl.padEnd(33)} ${cyan}║${reset}`,
    `${cyan}║${reset} ${yellow}Swagger:${reset} ${(baseUrl + '/docs').padEnd(29)} ${cyan}║${reset}`,
    `${cyan}╚══════════════════════════════════════════════╝${reset}`,
  ].join('\n');
  // eslint-disable-next-line no-console
  console.log(banner);
}

bootstrap();
