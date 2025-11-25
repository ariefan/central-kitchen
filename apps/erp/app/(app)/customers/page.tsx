import CustomersListClient from "./list-client";

// Prevent static generation - render on each request
export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return <CustomersListClient />;
}
