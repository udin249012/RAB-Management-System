import type { Material, MaterialCategory, Unit, WorkCategory, WorkItem } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS, type FirestoreCollectionName } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

async function hasReferenceInCollection(
  collectionName: FirestoreCollectionName,
  field: string,
  value: string,
): Promise<boolean> {
  const snap = await getFirestoreDb()
    .collection(collectionName)
    .where(field, "==", value)
    .limit(1)
    .get();
  return !snap.empty;
}

export class UnitRepository extends BaseFirestoreRepository<Unit> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.UNITS);
  }

  async findAll(): Promise<Unit[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
  }

  async isReferenced(unitId: string): Promise<boolean> {
    const [inMaterials, inWorkItems, inAhspComponents] = await Promise.all([
      hasReferenceInCollection(FIRESTORE_COLLECTIONS.MATERIALS, "unitId", unitId),
      hasReferenceInCollection(FIRESTORE_COLLECTIONS.WORK_ITEMS, "unitId", unitId),
      hasReferenceInCollection(FIRESTORE_COLLECTIONS.AHSP_COMPONENTS, "unitId", unitId),
    ]);
    return inMaterials || inWorkItems || inAhspComponents;
  }
}

export class MaterialCategoryRepository extends BaseFirestoreRepository<MaterialCategory> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.MATERIAL_CATEGORIES);
  }

  async findAll(): Promise<MaterialCategory[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MaterialCategory);
  }

  async isReferenced(categoryId: string): Promise<boolean> {
    return hasReferenceInCollection(FIRESTORE_COLLECTIONS.MATERIALS, "categoryId", categoryId);
  }
}

export class MaterialRepository extends BaseFirestoreRepository<Material> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.MATERIALS);
  }

  async findAll(): Promise<Material[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Material);
  }

  async findByCode(code: string): Promise<Material | null> {
    const snap = await this.collection.where("code", "==", code).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...doc.data() } as Material;
  }

  async isReferenced(materialId: string): Promise<boolean> {
    return hasReferenceInCollection(
      FIRESTORE_COLLECTIONS.AHSP_COMPONENTS,
      "referenceId",
      materialId,
    );
  }
}

export class WorkCategoryRepository extends BaseFirestoreRepository<WorkCategory> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.WORK_CATEGORIES);
  }

  async findAll(): Promise<WorkCategory[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WorkCategory);
  }

  async isReferenced(categoryId: string): Promise<boolean> {
    return hasReferenceInCollection(FIRESTORE_COLLECTIONS.WORK_ITEMS, "categoryId", categoryId);
  }
}

export class WorkItemRepository extends BaseFirestoreRepository<WorkItem> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.WORK_ITEMS);
  }

  async findAll(): Promise<WorkItem[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WorkItem);
  }

  async isReferenced(workItemId: string): Promise<boolean> {
    const [inAhsp, inRabItems] = await Promise.all([
      hasReferenceInCollection(FIRESTORE_COLLECTIONS.AHSP, "workItemId", workItemId),
      hasReferenceInCollection(FIRESTORE_COLLECTIONS.RAB_ITEMS, "workItemId", workItemId),
    ]);
    return inAhsp || inRabItems;
  }
}

export const unitRepository = new UnitRepository();
export const materialCategoryRepository = new MaterialCategoryRepository();
export const materialRepository = new MaterialRepository();
export const workCategoryRepository = new WorkCategoryRepository();
export const workItemRepository = new WorkItemRepository();
