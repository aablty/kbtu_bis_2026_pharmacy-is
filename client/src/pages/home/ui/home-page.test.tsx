import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/shared/auth";
import { i18n } from "@/shared/config";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { HomePage } from "./home-page";

function renderHome() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<p>catalog page</p>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </I18nextProvider>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("renders the landing hero and feature grid for anonymous visitors", () => {
    renderHome();
    expect(
      screen.getByText("Run your pharmacy, not your paperwork."),
    ).toBeInTheDocument();
    expect(screen.getByText("Role-based access")).toBeInTheDocument();
    expect(screen.getByText("Admin analytics")).toBeInTheDocument();
  });

  it("redirects a signed-in user to the catalog instead of the landing page", () => {
    useSessionStore.getState().setUser({
      user_id: 1,
      email: "a@example.com",
      full_name: "A Test",
      role: "customer",
      is_active: true,
    });

    renderHome();

    expect(screen.getByText("catalog page")).toBeInTheDocument();
    expect(
      screen.queryByText("Run your pharmacy, not your paperwork."),
    ).not.toBeInTheDocument();
  });
});
