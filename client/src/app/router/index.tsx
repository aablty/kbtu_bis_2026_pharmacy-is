import { createBrowserRouter } from "react-router";
import { AdminPage } from "@/pages/admin";
import { CartPage } from "@/pages/cart";
import { CatalogPage } from "@/pages/catalog";
import { CheckoutPage } from "@/pages/checkout";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { HomePage } from "@/pages/home";
import { MedicinePage } from "@/pages/medicine";
import { OrderPage } from "@/pages/order";
import { ProfilePage } from "@/pages/profile";
import { ResetPasswordPage } from "@/pages/reset-password";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { StaffPage } from "@/pages/staff";
import { VerifyEmailPage } from "@/pages/verify-email";
import { RequireAuth } from "./require-auth";

const STAFF_ROLES = ["admin", "pharmacist", "cashier"] as const;

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/sign-up", element: <SignUpPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/catalog", element: <CatalogPage /> },
  { path: "/catalog/:medicineId", element: <MedicinePage /> },
  { path: "/cart", element: <CartPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/profile", element: <ProfilePage /> },
      { path: "/orders/:orderId", element: <OrderPage /> },
    ],
  },
  {
    element: <RequireAuth roles={["customer"]} />,
    children: [{ path: "/checkout", element: <CheckoutPage /> }],
  },
  {
    element: <RequireAuth roles={STAFF_ROLES} />,
    children: [{ path: "/staff", element: <StaffPage /> }],
  },
  {
    element: <RequireAuth roles={["admin"]} />,
    children: [{ path: "/admin", element: <AdminPage /> }],
  },
]);
