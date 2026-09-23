import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Layout from "../components/Layout";
import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";
import * as api from "../lib/api";

function renderApp(initial = "/login") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <LanguageProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<p>home</p>} />
            </Routes>
          </Layout>
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

  it("shows no app navigation at all while signed out", () => {
    renderApp("/");
    // Signing in is compulsory, so a signed-out visitor gets the sign-in screen
    // and no way to wander into the app behind it.
    expect(screen.queryByRole("link", { name: "Diagnose", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "History", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out", hidden: true })).not.toBeInTheDocument();
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
    expect(await screen.findByRole("link", { name: "bibek", hidden: true })).toBeInTheDocument();
  });

  it("signs out again, clearing the token", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ access_token: "tok-123", username: "bibek" });
    vi.spyOn(api, "me").mockResolvedValue({ username: "bibek" });

    renderApp("/login");
    await userEvent.type(screen.getByLabelText("Username"), "bibek");
    await userEvent.type(screen.getByLabelText("Password"), "farmer12345");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("link", { name: "bibek", hidden: true });

    await userEvent.click(screen.getByRole("button", { name: "Sign out", hidden: true }));
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    // Back to a signed-out shell: the username and the app links are gone.
    expect(screen.queryByRole("link", { name: "bibek", hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnose", hidden: true })).not.toBeInTheDocument();
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
