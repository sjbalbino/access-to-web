type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

interface PromiseWithResolversPolyfill<T> {
  promise: Promise<T>;
  resolve: PromiseResolver<T>;
  reject: (reason?: unknown) => void;
}

type PromiseConstructorWithResolvers = PromiseConstructor & {
  withResolvers?: <T>() => PromiseWithResolversPolyfill<T>;
};

type MapPrototypeWithPdfHelpers = Map<unknown, unknown> & {
  getOrInsertComputed?: <K, V>(this: Map<K, V>, key: K, callback: (key: K) => V) => V;
  getOrInsert?: <K, V>(this: Map<K, V>, key: K, value: V) => V;
};

const promiseConstructor = Promise as PromiseConstructorWithResolvers;

if (!promiseConstructor.withResolvers) {
  Object.defineProperty(promiseConstructor, "withResolvers", {
    configurable: true,
    writable: true,
    value: function withResolvers<T>(): PromiseWithResolversPolyfill<T> {
      let resolve: PromiseResolver<T> | undefined;
      let reject: ((reason?: unknown) => void) | undefined;

      const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      });

      if (!resolve || !reject) {
        throw new Error("Não foi possível inicializar a Promise do visualizador de PDF.");
      }

      return { promise, resolve, reject };
    },
  });
}

type PromiseConstructorWithTry = PromiseConstructor & {
  try?: <T, A extends unknown[]>(fn: (...args: A) => T | PromiseLike<T>, ...args: A) => Promise<T>;
};

const promiseWithTry = Promise as PromiseConstructorWithTry;

if (!promiseWithTry.try) {
  Object.defineProperty(promiseWithTry, "try", {
    configurable: true,
    writable: true,
    value: function tryPolyfill<T, A extends unknown[]>(
      fn: (...args: A) => T | PromiseLike<T>,
      ...args: A
    ): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        try {
          resolve(fn(...args));
        } catch (error) {
          reject(error);
        }
      });
    },
  });
}

const mapPrototype = Map.prototype as MapPrototypeWithPdfHelpers;

if (!mapPrototype.getOrInsertComputed) {
  Object.defineProperty(mapPrototype, "getOrInsertComputed", {
    configurable: true,
    writable: true,
    value: function getOrInsertComputed<K, V>(this: Map<K, V>, key: K, callback: (key: K) => V): V {
      if (!this.has(key)) {
        const value = callback(key);
        this.set(key, value);
        return value;
      }

      return this.get(key) as V;
    },
  });
}

if (!mapPrototype.getOrInsert) {
  Object.defineProperty(mapPrototype, "getOrInsert", {
    configurable: true,
    writable: true,
    value: function getOrInsert<K, V>(this: Map<K, V>, key: K, value: V): V {
      if (!this.has(key)) {
        this.set(key, value);
        return value;
      }

      return this.get(key) as V;
    },
  });
}
/**
 * Uint8Array.prototype.toHex / toBase64 (propostas recentes usadas pelo pdf.js).
 * Navegadores sem suporte quebram a leitura do PDF com "toHex is not a function".
 */
type Uint8ArrayWithEncodings = Uint8Array & {
  toHex?: () => string;
  toBase64?: (options?: { alphabet?: "base64" | "base64url" }) => string;
};

const uint8Prototype = Uint8Array.prototype as Uint8ArrayWithEncodings;

if (!uint8Prototype.toHex) {
  Object.defineProperty(uint8Prototype, "toHex", {
    configurable: true,
    writable: true,
    value: function toHex(this: Uint8Array): string {
      let hex = "";
      for (let i = 0; i < this.length; i++) {
        hex += this[i].toString(16).padStart(2, "0");
      }
      return hex;
    },
  });
}

if (!uint8Prototype.toBase64) {
  Object.defineProperty(uint8Prototype, "toBase64", {
    configurable: true,
    writable: true,
    value: function toBase64(
      this: Uint8Array,
      options?: { alphabet?: "base64" | "base64url" },
    ): string {
      let binary = "";
      for (let i = 0; i < this.length; i++) {
        binary += String.fromCharCode(this[i]);
      }
      const base64 = btoa(binary);
      return options?.alphabet === "base64url"
        ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        : base64;
    },
  });
}
