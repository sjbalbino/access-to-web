/**
 * Persistência de FileSystemFileHandle no IndexedDB.
 * O handle representa o arquivo da balança já autorizado pelo usuário.
 * Sobrevive a refresh, fechar/abrir navegador e reiniciar o PC.
 */

const DB_NAME = "balanca_db";
const STORE = "handles";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function key(tenantId: string | null | undefined) {
  return `handle_${tenantId || "default"}`;
}

export async function saveBalancaHandle(
  tenantId: string | null | undefined,
  handle: FileSystemFileHandle
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, key(tenantId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBalancaHandle(
  tenantId: string | null | undefined
): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key(tenantId));
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearBalancaHandle(
  tenantId: string | null | undefined
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key(tenantId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

/**
 * Verifica/solicita permissão de leitura no handle.
 * Retorna 'granted' | 'prompt' | 'denied'.
 */
export async function queryHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  const h = handle as any;
  if (typeof h.queryPermission !== "function") return "granted";
  return (await h.queryPermission({ mode: "read" })) as PermissionState;
}

export async function requestHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  const h = handle as any;
  if (typeof h.requestPermission !== "function") return "granted";
  return (await h.requestPermission({ mode: "read" })) as PermissionState;
}
