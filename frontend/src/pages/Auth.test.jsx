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

  it("shows a sign-in link while signed out", () => {
    renderApp("/");
    // The nav collapses behind the menu button at phone width, which is what
    // jsdom reports, so query it as a phone user would see it.
    expect(screen.getByRole("link", { name: "Sign in", hidden: true })).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: "Sign in", hidden: true })).toBeInTheDocument();
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
