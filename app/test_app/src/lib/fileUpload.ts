import { FileItem } from '@/types';

export interface FileUploadProgress {
  [key: string]: number;  // ファイルID/名 -> アップロード進捗（0-100）のマッピング
}

export interface FileUploadCallbacks {
  onProgress?: (fileName: string, progress: number) => void;
  onComplete?: (file: FileItem) => void;
  onError?: (fileName: string, error: Error) => void;
}

/**
 * ファイルをアップロードし、進捗を監視する関数
 * 
 * @param file アップロードするファイル
 * @param callbacks 進捗、完了、エラー時のコールバック関数
 * @returns Promise<FileItem | null> アップロード成功時はFileItemを、失敗時はnullを返す
 */
export const uploadFileWithProgress = (
  file: File,
  callbacks?: FileUploadCallbacks
): Promise<FileItem | null> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // アップロード進捗イベントを監視
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        callbacks?.onProgress?.(file.name, percentComplete);
      }
    });
    
    // 完了イベント
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.file_id) {
            const newFile: FileItem = {
              id: response.file_id,
              url: `/api/drive/file/${response.file_id}`,
              isImage: file.type.startsWith('image/'),
              contentType: file.type
            };
            
            callbacks?.onProgress?.(file.name, 100);
            callbacks?.onComplete?.(newFile);
            resolve(newFile);
          } else {
            const error = new Error('Invalid response format');
            callbacks?.onError?.(file.name, error);
            reject(error);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error');
          console.error('Error parsing response:', err);
          callbacks?.onError?.(file.name, err);
          reject(err);
        }
      } else {
        const error = new Error(`HTTP error ${xhr.status}`);
        callbacks?.onProgress?.(file.name, -1); // エラーを示す-1
        callbacks?.onError?.(file.name, error);
        reject(error);
      }
    });
    
    // エラーイベント
    xhr.addEventListener('error', () => {
      const error = new Error('Network error');
      callbacks?.onProgress?.(file.name, -1);
      callbacks?.onError?.(file.name, error);
      reject(error);
    });
    
    xhr.open('POST', '/api/drive/file_create');
    xhr.send(formData);
  });
};

/**
 * 複数ファイルをアップロードする関数
 * 
 * @param fileList アップロードするファイルリスト
 * @param callbacks 進捗、完了、エラー時のコールバック関数
 * @returns Promise<FileItem[]> アップロードに成功したファイルの配列
 */
export const uploadMultipleFiles = async (
  fileList: FileList,
  callbacks?: FileUploadCallbacks
): Promise<FileItem[]> => {
  const uploadPromises = Array.from(fileList).map(file => 
    uploadFileWithProgress(file, callbacks)
  );
  
  const results = await Promise.allSettled(uploadPromises);
  
  return results
    .filter((result): result is PromiseFulfilledResult<FileItem | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value as FileItem);
};
