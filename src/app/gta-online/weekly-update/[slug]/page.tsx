import { notFound } from "next/navigation";
import { getWeeklyUpdate, getWeeklyArchive } from "@/services/public-data";
import { WeeklyPage } from "@/components/weekly-page";
import { indexingAllowed } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const week = await getWeeklyUpdate(slug);
  return {
    title: `GTA Online weekly archive — ${slug}`,
    alternates: { canonical: `/gta-online/weekly-update/${slug}` },
    robots: { index: indexingAllowed() && Boolean(week && !week.is_seed), follow: true },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [week, archive] = await Promise.all([
    getWeeklyUpdate((await params).slug),
    getWeeklyArchive(),
  ]);
  if (!week) notFound();
  return <WeeklyPage week={week} archive={archive} archived />;
}
