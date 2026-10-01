import { api } from "./api/client";

export async function openDownload(wsPath: (p: string) => string, fileId: string) {
  const res = await api.get<{ download: { url: string } }>(wsPath(`/files/${fileId}/download`));
  window.open(res.download.url, "_blank", "noopener");
}
