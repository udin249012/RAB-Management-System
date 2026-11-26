import { RefreshCw } from "lucide-react";
import { AhspComponentType, type AhspComponent, type AhspDetail } from "@rab/shared-types";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface AhspDetailModalProps {
  detail: AhspDetail | null;
  onClose: () => void;
  onRecalculate: (id: string) => Promise<void>;
  recalculating: boolean;
}

function ComponentSectionTable({
  title,
  items,
  subtotal,
}: {
  title: string;
  items: AhspComponent[];
  subtotal: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Tidak ada komponen pada kategori ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Kode</th>
                <th className="px-4 py-2 text-left">Uraian Komponen</th>
                <th className="px-4 py-2 text-left">Satuan</th>
                <th className="px-4 py-2 text-right">Koefisien</th>
                <th className="px-4 py-2 text-right">Harga Satuan</th>
                <th className="px-4 py-2 text-right">Jumlah Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 font-mono text-xs">{item.referenceCode}</td>
                  <td className="px-4 py-2">{item.referenceName}</td>
                  <td className="px-4 py-2">{item.unitSymbol}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(item.coefficient)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AhspDetailModal({
  detail,
  onClose,
  onRecalculate,
  recalculating,
}: AhspDetailModalProps) {
  if (!detail) return null;

  const laborItems = detail.components.filter((c) => c.componentType === AhspComponentType.LABOR);
  const materialItems = detail.components.filter(
    (c) => c.componentType === AhspComponentType.MATERIAL,
  );
  const equipmentItems = detail.components.filter(
    (c) => c.componentType === AhspComponentType.EQUIPMENT,
  );

  return (
    <Modal
      open={Boolean(detail)}
      onClose={onClose}
      title={`${detail.code} — ${detail.name}`}
      description={
        detail.sourceReference ? `Referensi: ${detail.sourceReference}` : "Detail Analisis AHSP"
      }
      maxWidthClassName="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Badge>Versi {detail.version}</Badge>
            <Badge variant={detail.isActive ? "default" : "secondary"}>
              {detail.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Harga Satuan Pekerjaan</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(detail.unitPriceTotal)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRecalculate(detail.id)}
              disabled={recalculating}
            >
              <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
              Sinkronkan Harga Katalog
            </Button>
          </div>
        </div>

        <ComponentSectionTable
          title="A. Tenaga Kerja"
          items={laborItems}
          subtotal={detail.laborTotal}
        />
        <ComponentSectionTable
          title="B. Bahan / Material"
          items={materialItems}
          subtotal={detail.materialTotal}
        />
        <ComponentSectionTable
          title="C. Peralatan"
          items={equipmentItems}
          subtotal={detail.equipmentTotal}
        />

        {detail.revisionHistory && detail.revisionHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Riwayat Perubahan Analisis</h4>
            <div className="divide-y rounded-lg border">
              {detail.revisionHistory.map((rev, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 text-xs flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">
                      v{rev.version}: {formatCurrency(rev.previousUnitPriceTotal)} →{" "}
                      {formatCurrency(rev.newUnitPriceTotal)}
                    </p>
                    <p className="text-muted-foreground">
                      {rev.reason || "Pembaruan"} • oleh {rev.changedBy}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {formatDateTime(rev.changedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
