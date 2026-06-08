import { ConfigService } from '@nestjs/config'
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'

export function buildCorsOptions(configService: ConfigService): CorsOptions {
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '')
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  )

  const origins = corsOrigins
    ? corsOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [frontendUrl]

  return {
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86_400,
  }
}
