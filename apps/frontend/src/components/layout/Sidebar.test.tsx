import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar navigation", () => {
  it("renders all 8 main application menu items", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar isMobileOpen={false} onCloseMobile={vi.fn()} />
      </MemoryRouter>,
    );

    const expectedMenus = [
      "Dashboard",
      "Data Proyek",
      "Manajemen RAB",
      "Katalog Material & Pekerjaan",
      "Analisis Harga Satuan (AHSP)",
      "Monitoring Anggaran",
      "Laporan",
      "Pengaturan",
    ];

    for (const label of expectedMenus) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("toggles collapsed state via the glass sidebar toggle button", () => {
    const onCollapsedChange = vi.fn();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          collapsed={false}
          onCollapsedChange={onCollapsedChange}
        />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole("button", { name: "Ciutkan sidebar" });
    fireEvent.click(toggleButton);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});
