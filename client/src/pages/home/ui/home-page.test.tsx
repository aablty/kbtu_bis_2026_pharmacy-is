import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { i18n } from "@/shared/config";
import { HomePage } from "./home-page";

describe("HomePage", () => {
  it("renders the landing hero and feature grid", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </I18nextProvider>,
    );
    expect(
      screen.getByText("Run your pharmacy, not your paperwork."),
    ).toBeInTheDocument();
    expect(screen.getByText("Role-based access")).toBeInTheDocument();
    expect(screen.getByText("Admin analytics")).toBeInTheDocument();
  });
});
