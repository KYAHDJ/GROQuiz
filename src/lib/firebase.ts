"use client";

export type FirebaseStatus = "placeholder" | "ready";

export const IS_FIREBASE_ENABLED: boolean = false;

export async function getFirebaseStatus(): Promise<FirebaseStatus> {
  return "placeholder";
}

export async function uploadPdfForProcessing(
  _file: File,
  _sessionId: string
): Promise<{ storagePath: string; documentUrl: string }> {
  throw new Error(
    "Firebase storage is not configured yet. This will power multi-PDF uploads with automatic temp-file cleanup."
  );
}

export async function deletePdfAfterProcessing(
  _storagePath: string
): Promise<void> {
  return;
}

export async function saveHistoryToFirebase(
  _records: unknown[]
): Promise<boolean> {
  return false;
}

export async function loadHistoryFromFirebase(): Promise<unknown[] | null> {
  return null;
}