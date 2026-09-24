/**
 * Базовый класс эндпоинта — аналог serializer-класса DRF: фиксирует URL,
 * HTTP-метод и форму запроса/ответа для одного (или нескольких похожих) URL
 * из Документация/Фронтенд и визард/api-routes.md. Сам HTTP-запрос не
 * выполняет — реальный fetch/react-query клиент строится поверх этих классов
 * позже, когда появится shared/api/client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export abstract class ApiEndpoint<TRequest = void, TResponse = void> {
  abstract readonly method: HttpMethod;
  abstract url(...params: string[]): string;

  /** Только для вывода типов через InferRequest/InferResponse — в рантайме поля не существует. */
  declare readonly __request: TRequest;
  declare readonly __response: TResponse;
}

export type InferRequest<E extends ApiEndpoint<unknown, unknown>> = E['__request'];
export type InferResponse<E extends ApiEndpoint<unknown, unknown>> = E['__response'];
