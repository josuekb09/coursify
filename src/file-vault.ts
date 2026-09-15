/**
 * Coursify Client-Side File Vault
 * Durable IndexedDB storage preserving authentic binary files (PDFs, PPT/PPTX, DOCX, XLSX, Code, etc.)
 * with zero format degradation or conversion across browser reloads.
 */

const DB_NAME = "coursify_vault"
const DB_VERSION = 1
const STORE_NAME = "files"

export type VaultRecord = {
  id: string
  blob: Blob
  fileName: string
  mimeType: string
  size: number
  savedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available in this environment."))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("Failed to open file vault."))
  })
}

export async function saveVaultFile(
  id: string,
  fileOrBlob: Blob | File,
  fileName: string,
  mimeType?: string,
): Promise<void> {
  try {
    const db = await openDb()
    const finalMime = mimeType || fileOrBlob.type || "application/octet-stream"
    const record: VaultRecord = {
      id,
      blob: fileOrBlob,
      fileName,
      mimeType: finalMime,
      size: fileOrBlob.size,
      savedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(record)

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.warn("Could not write file to vault:", error)
  }
}

export async function getVaultFile(id: string): Promise<VaultRecord | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)

      req.onsuccess = () => resolve((req.result as VaultRecord) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function deleteVaultFile(id: string): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Non-fatal if missing
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error("Failed to read blob."))
    reader.readAsDataURL(blob)
  })
}
