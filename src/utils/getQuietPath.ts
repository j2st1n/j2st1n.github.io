import { getPath } from "./getPath";

export const getQuietPath = (id: string, filePath?: string) =>
  `/quiet${getPath(id, filePath)}`;
