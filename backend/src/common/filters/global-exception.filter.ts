import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const isProduction =
      this.configService.get<string>('NODE_ENV', 'development') === 'production'

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Internal server error'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>
        message = (body.message as string | string[]) ?? message
        error = (body.error as string) ?? error
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const logMessage = `${request.method} ${request.url} → ${status}: ${
      Array.isArray(message) ? message.join(', ') : message
    }`

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      )
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logMessage)
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    if (!isProduction && exception instanceof Error && exception.stack) {
      body.stack = exception.stack
    }

    response.status(status).json(body)
  }
}
