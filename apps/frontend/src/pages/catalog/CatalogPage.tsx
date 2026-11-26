import { useCallback, useEffect, useState } from "react";
import type { MaterialCategory, Unit, WorkCategory } from "@rab/shared-types";
import { catalogApi } from "@/services/api/catalogApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { MaterialsTab } from "@/features/catalog/MaterialsTab";
import { WorkItemsTab } from "@/features/catalog/WorkItemsTab";
import { CategoriesUnitsTab } from "@/features/catalog/CategoriesUnitsTab";

type CatalogTabKey = "materials" | "work-items" | "references";

export function CatalogPage() {
  const [activeTab, setActiveTab] = useState<CatalogTabKey>("materials");
  const [units, setUnits] = useState<Unit[]>([]);
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([]);
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);

  const loadReferences = useCallback(async () => {
    setLoadingRefs(true);
    setRefError(null);
    try {
      const [u, mc, wc] = await Promise.all([
        catalogApi.listUnits(),
        catalogApi.listMaterialCategories(),
        catalogApi.listWorkCategories(),
      ]);
      setUnits(u);
      setMaterialCategories(mc);
      setWorkCategories(wc);
    } catch (err) {
      setRefError(extractApiErrorMessage(err, "Gagal memuat data referensi katalog"));
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  const tabs: Array<{ key: CatalogTabKey; label: string }> = [
    { key: "materials", label: "Material & Peralatan" },
    { key: "work-items", label: "Pekerjaan & Jasa" },
    { key: "references", label: "Kategori & Satuan" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Material & Pekerjaan"
        description="Kelola master data material konstruksi, peralatan, perlengkapan, pekerjaan, jasa, kategori, dan satuan."
      />

      <div className="border-b flex gap-2 overflow-x-auto" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingRefs ? (
        <LoadingState rows={4} />
      ) : refError ? (
        <ErrorState message={refError} onRetry={loadReferences} />
      ) : (
        <>
          {activeTab === "materials" && (
            <MaterialsTab units={units} categories={materialCategories} />
          )}
          {activeTab === "work-items" && <WorkItemsTab units={units} categories={workCategories} />}
          {activeTab === "references" && (
            <CategoriesUnitsTab
              units={units}
              materialCategories={materialCategories}
              workCategories={workCategories}
              onRefresh={loadReferences}
            />
          )}
        </>
      )}
    </div>
  );
}

export default CatalogPage;
