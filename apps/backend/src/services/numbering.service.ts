import type { CompanySettings } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS, type FirestoreCollectionName } from "../config/collections.js";
import { getFirestoreDb } from "../config/firebase.js";

export class NumberingService {
  private async getSettings(): Promise<Partial<CompanySettings>> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.COMPANY_SETTINGS)
      .doc("default")
      .get();
    return snap.exists ? (snap.data() as CompanySettings) : {};
  }

  private formatPattern(pattern: string, seqNumber: number, date = new Date()): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const seq = String(seqNumber).padStart(4, "0");
    return pattern
      .replace(/\{YYYY\}/g, year)
      .replace(/\{MM\}/g, month)
      .replace(/\{SEQ\}/g, seq);
  }

  private async generateUniqueCode(
    collectionName: FirestoreCollectionName,
    field: string,
    pattern: string,
  ): Promise<string> {
    const col = getFirestoreDb().collection(collectionName);
    const existingSnap = await col.get();
    let seq = existingSnap.docs.length + 1;

    while (seq < existingSnap.docs.length + 100) {
      const candidate = this.formatPattern(pattern, seq);
      const dup = await col.where(field, "==", candidate).limit(1).get();
      if (dup.empty) {
        return candidate;
      }
      seq += 1;
    }

    return this.formatPattern(pattern, Date.now() % 100000);
  }

  async nextProjectCode(): Promise<string> {
    const settings = await this.getSettings();
    const pattern = settings.projectCodeFormat || "PRJ-{YYYY}-{SEQ}";
    return this.generateUniqueCode(FIRESTORE_COLLECTIONS.PROJECTS, "code", pattern);
  }

  async nextRabDocumentNumber(): Promise<string> {
    const settings = await this.getSettings();
    const pattern = settings.rabNumberFormat || "RAB/{YYYY}/{MM}/{SEQ}";
    return this.generateUniqueCode(FIRESTORE_COLLECTIONS.RAB_DOCUMENTS, "documentNumber", pattern);
  }
}

export const numberingService = new NumberingService();
