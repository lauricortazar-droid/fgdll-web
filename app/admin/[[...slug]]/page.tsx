import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAliasPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  redirect(`/administracion${slug.length ? `/${slug.join("/")}` : ""}`);
}
