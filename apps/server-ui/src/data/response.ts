export class Response<T> {
  code = 0;
  message?: string;
  data?: T;
}
