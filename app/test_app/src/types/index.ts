export interface FileItem {
  id: number;
  url: string;
  isImage: boolean;
  isExisting?: boolean;
  contentType?: string;
}
