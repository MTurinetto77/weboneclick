import { notFound } from "next/navigation";
import { CategoryShopListing } from "@/components/category-shop-listing";
import { getCategoryBySlugPath } from "@/lib/products";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OutletPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const category = await getCategoryBySlugPath(["outlet"]);
  if (!category) notFound();

  return (
    <CategoryShopListing category={category} path={["outlet"]} searchParams={sp} />
  );
}
