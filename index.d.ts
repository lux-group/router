declare module "@luxuryescapes/router" {
  import { Request as ExpressRequest, Response, Express, NextFunction, Handler as ExpressHandler, RequestHandler } from "express";
  import { Matcher } from "@luxuryescapes/strummer"
  import { ParamsDictionary } from 'express-serve-static-core';
  import { ParsedQs } from "qs";

  export function errorHandler(
    err: Error,
    req: ExpressRequest,
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
    correlationIdExtractor?: (req: ExpressRequest, res: Response) => string;
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
      preHandlers?: ExpressHandler[];
    };
  }

  interface RouteSchema {
    request: {
      query?: Matcher;
      params?: Matcher;
      body?: Matcher;
    };
    responses: Record<number, Matcher>
  }

  interface RouteOptions {
    url: string;
    operationId?: string;
    schema?: RouteSchema;
    isPublic?: boolean;
    preHandlers?: ExpressHandler[];
    handlers: ((req: any, res: Response, next: NextFunction) => void)[]
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

  interface Schema<T> {
    content: {
      "application/json": T;
    };
  }
  
  type ResBody<
    operations extends Record<string, any>,
    O extends keyof operations,
    Response = operations[O]["responses"]
  > = Response[keyof Response] extends Schema<infer S> ? S : never;

  type Jwt = {
    sub: string
    jti: string,
    iat: number,
    iss: string,
    exp: number,
    sut: boolean,
    roles: string[]
  }

  interface AuthenticatedRequest<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>
    extends ExpressRequest<P, ResBody, ReqBody, ReqQuery> {
      jwt: Jwt;
      user: unknown;
    }
  
  export interface Handler<
    operations extends Record<string, any>,
    O extends keyof operations,
    R = ResBody<operations, O>,
    parameters = operations[O]["parameters"],
    PathParams = parameters extends { path: any }
      ? parameters["path"]
      : Record<string, never>,
    ReqBody = parameters extends { body: { payload: any } }
      ? parameters["body"]["payload"]
      : Record<string, never>,
    Query = parameters extends { query: any }
      ? parameters["query"]
      : Record<string, never>,
    header = parameters extends { header: any } ?
      parameters['header']:
      Record<string, never>,
    Request = header extends { Cookie: any } ?
      AuthenticatedRequest<PathParams, R, ReqBody, Query> :
      ExpressRequest<PathParams, R, ReqBody, Query>
  > {
    (
      req: Request,
      res: Response<R>,
      next: NextFunction
    ): void | Promise<void>;
  }
}