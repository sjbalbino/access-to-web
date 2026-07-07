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