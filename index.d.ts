declare module "@luxuryescapes/router" {
  import { Request, Response, Express, NextFunction, Handler, RequestHandler } from "express";

  export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void;

  export function generateTypes(
    mount: (server: Express) => RouterAbstraction,
    path: string
  ): Promise<void>;

  interface Logger {
    debug: Function;
    log: Function;
    warn: Function;
    error: Function;
  }

  export type AppEnv = 'development' | 'spec' | 'test' | 'production';

  interface SentryConfig {
    appEnv: AppEnv;
    sentryDSN?: string;
    logger?: Logger;
  }

  interface RouterConfig {
    validateResponses?: boolean;
    logRequests?: boolean;
    correlationIdExtractor?: (req: Request, res: Response) => string;
    logger?: Logger;
    sentryDSN?: string;
    appEnv?: AppEnv;
    swaggerBaseProperties?: {
      info: {
        description: string;
        version: string;
        title: string;
        termsOfService: string | null;
        contact: {
          email: string;
        };
      };
      host: string;
      basePath: string;
      tags: string[];
      consumes: string[];
      produces: string[];
      schemes: string[];
      paths: object;
      securityDefinitions: object;
      definitions: object;
      preHandlers?: Handler[];
    };
  }

  interface RouteSchema {
    request?: {
      query?: object;
      params?: object;
      body?: object;
    };
    responses?: {
      [index: number]: object;
    }
  }

  interface RouteOptions {
    url: string;
    operationId?: string;
    schema?: RouteSchema;
    isPublic?: boolean;
    preHandlers?: Handler[];
    handlers: RequestHandler<any, any, any, any>[];
    tags?: string[];
    summary?: string;
    description?: string;
    warnOnRequestValidationError?: boolean;
  }

  interface SchemaRouteOptions {
    url: string;
    schema: object;
  }

  type OpenAPISpec = Record<string, any>;

  export interface RouterAbstraction {
    serveSwagger: (path: string) => void;
    app: Express,
    get: (options: RouteOptions) => void;
    post: (options: RouteOptions) => void;
    put: (options: RouteOptions) => void;
    delete: (options: RouteOptions) => void;
    patch: (options: RouteOptions) => void;
    schema: (options: SchemaRouteOptions) => void;
    toSwagger: () => OpenAPISpec;
    useErrorHandler: () => void;
  }

  export function router(app: Express, config: RouterConfig): RouterAbstraction;
  export function initializeSentry(config: SentryConfig): boolean;

  interface HTTPError extends Error {
    new (code: number, message: string, errors?: (string | object)[]) : HTTPError
    code: number
    errors: (string | object)[]
    responseJson: object
  }

  interface InheritedHTTPError {
    new (message: string, errors?: (string | object)[]) : HTTPError
    code: number
    errors: (string | object)[]
    responseJson: object
  }

  interface errors {
    HTTPError: HTTPError,
    ForbiddenError: InheritedHTTPError,
    UnauthorizedError: InheritedHTTPError,
    InvalidRequestError: InheritedHTTPError,
    NotFoundError: InheritedHTTPError,
    ServerError: InheritedHTTPError,
    ServiceUnavailableError: InheritedHTTPError,
    UnprocessableEntityError: InheritedHTTPError
  }

  export const errors: errors
}