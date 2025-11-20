import { redirect } from "next/navigation";

export default function Home() {
  // This page will be handled by middleware
  // Redirecting to auth page as fallback
  redirect("/auth");
}
