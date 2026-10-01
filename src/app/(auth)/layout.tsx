import { AuthFrame } from "@/components/auth/AuthFrame";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthFrame>{children}</AuthFrame>;
}
