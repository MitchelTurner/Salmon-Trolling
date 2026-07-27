/** Nominal branding so a bare `number` is not assignable to a unit type. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
