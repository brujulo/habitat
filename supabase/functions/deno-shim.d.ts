// Tipos mínimos de Deno para revisar las funciones con tsc fuera de Deno.
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};
