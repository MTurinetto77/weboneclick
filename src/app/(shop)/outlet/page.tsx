import { notFound } from "next/navigation";
import { PromoShopListing } from "@/components/promo-shop-listing";
import { getPromoBySlug } from "@/lib/promos";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OutletPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const promo = await getPromoBySlug("outlet-promo");
  if (!promo) notFound();

  return <PromoShopListing promo={promo} searchParams={sp} basePath="/outlet" />;
}
