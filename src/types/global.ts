export {};

declare global {
  interface GlobalThis {
    Buffer: typeof Buffer;
    btoa: (data: string) => string;
  }
}
