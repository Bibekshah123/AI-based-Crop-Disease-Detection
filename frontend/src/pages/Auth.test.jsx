import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Layout from "../components/Layout";
import RequireAuth from "../components/RequireAuth";
import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";
import * as api from "../lib/api";

function renderApp(initial = "/login") {
  // Mirrors App.jsx: the sign-in screen renders bare, everything else sits
  // behind RequireAuth inside the app shell.
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route
                path="/"
                element={
                  <Layout>
                    <p>home</p>
                  </Layout>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("sign in / sign out", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends a signed-out visitor to a bare sign-in screen", () => {
    renderApp("/");
    // Compulsory sign-in: the app shell never renders, so there is no header,
    // no footer and nothing to navigate to — only the form and the toggle.
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnose", hidden: true })).not.toBeInTheDocument();
  });

  it("signs in, stores the token and shows the username", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok-123",
      username: "bibek",
      email: "b@example.com",
    });
    vi.spyOn(api, "me").mockResolvedValue({ username: "bibek", email: "b@example.com" });

    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Username"), "bibek");
    await userEvent.type(screen.getByLabelText("Password"), "farmer12345");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok-123"));
    // The header carries an avatar button, not a bare username link.
    const account = await screen.findByRole("button", { name: "Account menu", hidden: true });
    await userEvent.click(account);
    expect(screen.getByText("bibek")).toBeInTheDocument();
  });

  it("signs out again, clearing the token", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ access_token: "tok-123", username: "bibek" });
    vi.spyOn(api, "me").mockResolvedValue({ username: "bibek" });

    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Username"), "bibek");
    await userEvent.type(screen.getByLabelText("Password"), "farmer12345");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await userEvent.click(await screen.findByRole("button", { name: "Account menu", hidden: true }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out", hidden: true }));
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    // Back to the bare sign-in screen.
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows an error message when the credentials are wrong", async () => {
    vi.spyOn(api, "login").mockRejectedValue({ response: { status: 401, data: { detail: "Invalid username or password" } } });
    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Username"), "bibek");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i);
  });
});
