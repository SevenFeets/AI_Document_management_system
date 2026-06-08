import { plainToInstance } from 'class-transformer'
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator'

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT: number = 4000

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'log'

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000'

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost'

  @IsNumber()
  @IsOptional()
  DB_PORT: number = 5432

  @IsString()
  @IsOptional()
  ELASTICSEARCH_NODE: string = 'http://localhost:9200'

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost'

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  })

  if (errors.length > 0) {
    throw new Error(errors.toString())
  }

  return validatedConfig
}
