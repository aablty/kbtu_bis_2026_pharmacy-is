import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n, useThemeStore } from "@/shared/config";
import { ThemeToggle } from "./theme-toggle";

function renderToggle() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeToggle />
    </I18nextProvider>,
  );
}

async function pickTheme(name: string) {
  await userEvent.click(screen.getByRole("button", { name: "Theme" }));
  await userEvent.click(await screen.findByRole("menuitemradio", { name }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setTheme("light");
  });

  it("applies dark mode and persists the choice", async () => {
    renderToggle();

    await pickTheme("Dark");

    expect(document.documentElement).toHaveClass("dark");
    const persisted = JSON.parse(
      localStorage.getItem("pillpoint-theme") ?? "{}",
    );
    expect(persisted.state.theme).toBe("dark");
  });

  it("removes dark mode when light is picked", async () => {
    renderToggle();
    await pickTheme("Dark");

    await pickTheme("Light");

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
