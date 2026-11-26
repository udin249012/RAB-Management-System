import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { getFirebaseClientStorage } from "./config";

export interface UploadedStorageFile {
  storagePath: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadFileToFirebaseStorage(
  file: File,
  folderPath: string,
  onProgress?: (percent: number) => void,
): Promise<UploadedStorageFile> {
  const storage = getFirebaseClientStorage();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${folderPath}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise<UploadedStorageFile>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          storagePath,
          url,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      },
    );
  });
}
