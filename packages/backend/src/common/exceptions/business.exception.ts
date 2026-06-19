export class BusinessException extends Error {
  constructor(public readonly errorCode: string, message?: string, public readonly details?: unknown) {
    super(message ?? errorCode);
  }
}
