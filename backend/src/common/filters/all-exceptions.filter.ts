import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ExceptionMessage = string | string[];

type HttpExceptionBody = {
  message?: ExceptionMessage;
};

function messageFromHttpException(exception: HttpException): ExceptionMessage {
  const response = exception.getResponse();

  if (response instanceof Object) {
    // SAFETY: Nest HttpException object bodies expose an optional message field.
    const body = response as HttpExceptionBody;

    if (body.message !== undefined) {
      return body.message;
    }
  }

  return exception.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter<Error> {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? messageFromHttpException(exception)
        : exception.message;

    this.logger.error(
      `${request.method} ${request.url} -> ${status}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
