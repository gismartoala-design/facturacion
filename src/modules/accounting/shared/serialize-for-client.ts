export type SerializeForClient<T> = T extends Date
  ? string
  : T extends Array<infer Item>
    ? SerializeForClient<Item>[]
    : T extends object
      ? { [Key in keyof T]: SerializeForClient<T[Key]> }
      : T;

export function serializeForClient<T>(value: T): SerializeForClient<T> {
  return JSON.parse(JSON.stringify(value)) as SerializeForClient<T>;
}
