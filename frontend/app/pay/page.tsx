import type { Metadata } from "next";
import PaymentPageClient from "./payment-page-client";

export const metadata: Metadata = {
  title: "LumenLink payment link",
  description: "View and share a Stellar payment request.",
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PaymentPageClient searchParams={await searchParams} />;
}
