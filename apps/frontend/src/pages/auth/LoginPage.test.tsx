import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders architectural showcase, empty login inputs, validates errors, and opens reset modal", async () => {
    render(
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>,
    );

    expect(screen.getByText("RAB Management System")).toBeInTheDocument();
    expect(
      screen.getByText("Kelola Rencana Anggaran Biaya proyek secara presisi dan terpusat."),
    ).toBeInTheDocument();

    const emailInput = screen.getByLabelText("Email Administrator") as HTMLInputElement;
    const passInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(emailInput.value).toBe("");
    expect(passInput.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Masuk sebagai Admin" }));

    await waitFor(() => {
      expect(screen.getByText("Format email tidak valid")).toBeInTheDocument();
      expect(screen.getByText("Password minimal 6 karakter")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Lupa password?" }));
    expect(screen.getByText("Reset Password Administrator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk dengan Google" })).toBeInTheDocument();
  });
});
