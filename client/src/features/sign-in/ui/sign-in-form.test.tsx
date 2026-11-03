import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authEndpoints } from "@/shared/api";
import { establishSession } from "@/shared/auth";
import { i18n } from "@/shared/config";
import { SignInForm } from "./sign-in-form";

vi.mock("@/shared/api/auth-endpoints", () => ({
  authEndpoints: { login: vi.fn() },
}));
vi.mock("@/shared/auth", () => ({ establishSession: vi.fn() }));

function renderForm() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <SignInForm />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows validation errors and does not call the API on empty submit", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(authEndpoints.login).not.toHaveBeenCalled();
  });

  it("logs in and establishes the session with the returned tokens", async () => {
    const tokens = {
      access_token: "a",
      refresh_token: "r",
      token_type: "bearer",
    };
    vi.mocked(authEndpoints.login).mockResolvedValue(tokens);
    renderForm();

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(establishSession).toHaveBeenCalledWith(tokens));
    expect(authEndpoints.login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "correct-horse-1",
    });
  });

  it("offers a link to verify-email when the account isn't verified yet", async () => {
    vi.mocked(authEndpoints.login).mockRejectedValue(
      Object.assign(new Error("forbidden"), {
        isAxiosError: true,
        response: { status: 403, data: { detail: "Email not verified" } },
      }),
    );
    renderForm();

    await userEvent.type(
      screen.getByLabelText("Email"),
      "unverified@example.com",
    );
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const link = await screen.findByRole("link", { name: "Verify your email" });
    expect(link).toHaveAttribute(
      "href",
      "/verify-email?email=unverified%40example.com",
    );
  });
});
