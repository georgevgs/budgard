type StorageEntry = {
  name: string;
};

type StorageFolderBucket = {
  list: (
    folder: string,
    options: { limit: number; offset: number },
  ) => PromiseLike<{ data: StorageEntry[] | null; error: unknown }>;
  remove: (paths: string[]) => PromiseLike<{ error: unknown }>;
};

const STORAGE_PAGE_SIZE = 1000;

// Storage list results compact after every removal. Always read page zero:
// advancing an offset after deleting page one skips what used to be page two.
export const emptyStorageFolder = async (
  bucket: StorageFolderBucket,
  folder: string,
): Promise<void> => {
  while (true) {
    const { data: files, error: listError } = await bucket.list(folder, {
      limit: STORAGE_PAGE_SIZE,
      offset: 0,
    });
    if (listError) {
      throw listError;
    }
    if (!files || files.length === 0) {
      return;
    }

    const paths = files.map((file) => `${folder}/${file.name}`);
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      throw removeError;
    }

    if (files.length < STORAGE_PAGE_SIZE) {
      return;
    }
  }
};
