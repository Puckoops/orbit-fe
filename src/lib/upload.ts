import { api } from "./api/client";
import type { FileItem } from "./api/models";

export interface InventoryMeta {
  client_id?: string;
  project_id?: string;
  task_id?: string;
  invoice_id?: string;
  category: string;
}

function put(url: string, file: File, onProgress: (pct: number) => void, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage refused the upload (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("The upload was interrupted."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/** Signed URL → PUT straight to storage → register in the inventory. Bytes never pass through the app. */
export async function uploadToInventory(
  wsPath: (p: string) => string,
  file: File,
  meta: InventoryMeta,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
) {
  const type = file.type || "application/octet-stream";
  const signed = await api.post<{ signed_url: string; resource_url: string }>(wsPath("/files/signed-url"), { file_name: file.name, type });
  await put(signed.signed_url, file, (pct) => onProgress(Math.min(99, pct)), signal);
  const created = await api.post<FileItem>(wsPath("/files"), {
    resource_url: signed.resource_url,
    name: file.name,
    category: meta.category,
    client_id: meta.client_id || undefined,
    project_id: meta.project_id || undefined,
    task_id: meta.task_id || undefined,
    invoice_id: meta.invoice_id || undefined,
  });
  onProgress(100);
  return created;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;
