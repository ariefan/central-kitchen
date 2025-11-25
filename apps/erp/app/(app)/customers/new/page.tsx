import NewCustomerClient from "./client";

// Prevent static generation - render on each request
export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return <NewCustomerClient />;
}
