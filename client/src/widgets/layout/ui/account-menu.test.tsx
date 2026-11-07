import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/shared/api";
import { i18n } from "@/shared/config";
import { AccountMenu } from "./account-menu";

const baseUser: UserProfile = {
  user_id: 1,
  email: "ada@example.com",
  full_name: "Ada Lovelace",
  role: "customer",
  is_active: true,
};

function renderMenu(user: UserProfile) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AccountMenu user={user} />} />
          <Route path="/profile" element={<p>profile page</p>} />
          <Route path="/sign-in" element={<p>sign-in page</p>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("AccountMenu", () => {
  it("shows the full name and its initial as the avatar fallback", () => {
    renderMenu(baseUser);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to the email when full_name is null", () => {
    renderMenu({ ...baseUser, full_name: null });
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("navigates to the profile page", async () => {
    renderMenu(baseUser);
    await userEvent.click(screen.getByRole("button", { name: /ada/i }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Your account" }),
    );
    expect(screen.getByText("profile page")).toBeInTheDocument();
  });

  it("signs out and navigates to sign-in", async () => {
    renderMenu(baseUser);
    await userEvent.click(screen.getByRole("button", { name: /ada/i }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Sign out" }),
    );
    expect(screen.getByText("sign-in page")).toBeInTheDocument();
  });
});
