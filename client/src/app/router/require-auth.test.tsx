import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/shared/auth";
import { RequireAuth } from "./require-auth";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sign-in" element={<p>sign-in page</p>} />
        <Route path="/profile" element={<p>profile page</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/profile-guarded" element={<p>guarded profile</p>} />
        </Route>
        <Route element={<RequireAuth roles={["admin"]} />}>
          <Route path="/admin" element={<p>admin page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function setUser(role: "admin" | "customer") {
  useSessionStore.getState().setUser({
    user_id: 1,
    email: "a@example.com",
    role,
    preferred_locale: "en",
    is_active: true,
  });
}

describe("RequireAuth", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("redirects anonymous users to sign-in", () => {
    renderAt("/profile-guarded");
    expect(screen.getByText("sign-in page")).toBeInTheDocument();
  });

  it("renders the route for an authenticated user", () => {
    setUser("customer");
    renderAt("/profile-guarded");
    expect(screen.getByText("guarded profile")).toBeInTheDocument();
  });

  it("sends a customer away from a role-restricted route", () => {
    setUser("customer");
    renderAt("/admin");
    expect(screen.getByText("profile page")).toBeInTheDocument();
  });

  it("lets a matching role through", () => {
    setUser("admin");
    renderAt("/admin");
    expect(screen.getByText("admin page")).toBeInTheDocument();
  });
});
