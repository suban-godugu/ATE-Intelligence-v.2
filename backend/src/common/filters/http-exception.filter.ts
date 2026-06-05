import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const resContent = exception.getResponse();
      if (typeof resContent === 'string') {
        message = resContent;
      } else if (typeof resContent === 'object' && resContent !== null) {
        const obj = resContent as any;
        // Format class-validator array messages as a single string
        if (Array.isArray(obj.message)) {
          message = obj.message.join(', ');
        } else {
          message = obj.message || obj.error || message;
        }
        code = obj.code || 'BAD_REQUEST';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = (exception.constructor.name || 'ERROR').toUpperCase().replace(/[^A-Z0-9_]/gi, '_');
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${statusCode} - Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json({
      error: message,
      code,
      statusCode,
    });
  }
}
