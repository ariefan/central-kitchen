import ProductsListClient from "./list-client";

// Prevent static generation - render on each request
export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return <ProductsListClient />;
}
