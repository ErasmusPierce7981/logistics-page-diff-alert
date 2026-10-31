type Parser<T> = { parse(value: unknown): T };

class StringParser implements Parser<string> {
  private checks: ((value: string) => boolean)[] = [];
  min(length: number): this { this.checks.push((value) => value.length >= length); return this; }
  url(): this { this.checks.push((value) => /^https?:\/\//.test(value)); return this; }
  email(): this { this.checks.push((value) => value.includes("@")); return this; }
  default(value: string): Parser<string> { return new DefaultParser(this, value); }
  parse(value: unknown): string { if (typeof value !== "string" || this.checks.some((check) => !check(value))) throw new Error("Invalid request"); return value; }
}

class DefaultParser<T> implements Parser<T> {
  private parser: Parser<T>;
  private fallback: T;
  constructor(parser: Parser<T>, fallback: T) { this.parser = parser; this.fallback = fallback; }
  parse(value: unknown): T { return value === undefined ? this.fallback : this.parser.parse(value); }
}

class ObjectParser<T extends Record<string, unknown>> implements Parser<T> {
  private shape: { [K in keyof T]: Parser<T[K]> };
  constructor(shape: { [K in keyof T]: Parser<T[K]> }) { this.shape = shape; }
  parse(value: unknown): T {
    if (!value || typeof value !== "object") throw new Error("Invalid request");
    const input = value as Record<string, unknown>;
    const result = {} as T;
    for (const key of Object.keys(this.shape) as (keyof T)[]) result[key] = this.shape[key].parse(input[String(key)]);
    return result;
  }
}

export const z = {
  string: () => new StringParser(),
  object: <T extends Record<string, unknown>>(shape: { [K in keyof T]: Parser<T[K]> }) => new ObjectParser<T>(shape)
};
