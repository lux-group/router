declare module "@luxuryescapes/router" {
  import { Request as ExpressRequest, Response, Express, NextFunction } from "express";
  import { Matcher } from "@luxuryescapes/strummer"
  import { ParamsDictionary, RequestHandler as ExpressHandler } from 'express-serve-static-core';
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

  /**
   * New AWS environment has 3 environments:
   * - dev
   * - staging
   * - prod
   *
   * 'development' can be used for local development, 'spec' for unit tests and 'test' and 'production' are being deprecated.
   */
  export type AppEnv = 'dev' | 'development' | 'spec' | 'test'  | 'staging' | 'prod' | 'production';

  interface SentryConfig {
    appEnv: AppEnv;
    sentryDSN?: string;
    logger?: Logger;
  }

  interface RouterConfig {
    validateResponses?: boolean;
    logRequests?: boolean;
    logResponses?: boolean;
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
      securityDefinitions?: object;
      security?: object[];
      definitions: object;
      preHandlers?: ExpressHandler[];
    };
    sanitizeKeys?: Array<string | RegExp>;
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
    /**
     * Path for the route
     * @see https://expressjs.com/en/4x/api.html#path-examples
     */
    url: string;
    /** The route will be referenced by this ID in the contract */
    operationId?: string;
    /** Request and response schemas. The endpoint will use these to validate incoming requests and outgoing responses. */
    schema?: RouteSchema;
    /**
     * If `false`, the Swagger docs will specify that a cookie containing an access token is required.
     * @defaultValue `false`
     */
    isPublic?: boolean;
    /** Pre-handlers are run before request validation. Usually used for authentication. */
    preHandlers?: ExpressHandler[];
    /** Handlers are run after request validation. */
    handlers: ((req: any, res: Response, next: NextFunction) => void)[]
    /** For Swagger docs */
    tags?: string[];
    /** For Swagger docs */
    summary?: string;
    /** For Swagger docs */
    description?: string;
    /**
     * If `true`, logs a warning on request validation error.
     * @defaultValue `false`
     */
    warnOnRequestValidationError?: boolean;
    /**
     * Options to be passed to `express.json()`
     * @see https://expressjs.com/en/4x/api.html#express.json
     * @defaultValue `{}`
     */
    jsonOptions?: { [option: string]: string | number | boolean | null | undefined };
  }

  interface SchemaRouteOptions {
    url: string;
    schema: object;
  }

  type OpenAPISpec = Record<string, any>;

  export interface RouterAbstraction {
    serveSwagger: (path: string) => void;
    app: Express,
    options: (options: RouteOptions) => void;
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
    new (code: number, message: string, errors?: (string | object)[], refCode?: string) : HTTPError
    code: number
    errors: (string | object)[]
    refCode: string
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
    roles: string[],
    aud?: string
  }

  interface AuthenticatedRequest<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>
    extends ExpressRequest<P, ResBody, ReqBody, ReqQuery> {
      jwt: Jwt;
      user?: unknown; // optional because verifyUserSignature only sets jwt
    }

  export interface Handler<
    operations extends Record<string, any>,
    O extends keyof operations,
    R = ResBody<operations, O>,
    parameters = operations[O]["parameters"],
    PathParams = parameters extends { path: any }
      ? parameters["path"]
      : {},
    ReqBody = parameters extends { body: { payload: any } }
      ? parameters["body"]["payload"]
      : {},
    Query = parameters extends { query: any }
      ? parameters["query"]
      : {},
    Header = parameters extends { header: any }
      ? parameters['header']
      : {},
    Request = Header extends { Cookie: any } ?
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
