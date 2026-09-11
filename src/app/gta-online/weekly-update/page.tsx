import { getWeeklyUpdate, getWeeklyArchive } from "@/services/public-data";
import { WeeklyPage } from "@/components/weekly-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA Online weekly update — bonuses, vehicles & discounts",
  description:
    "Current sourced GTA Online weekly bonuses, GTA$ and RP multipliers, discounts, rewards and event dates.",
  alternates: { canonical: "/gta-online/weekly-update" },
};
export default async function Page() {
  const [week, archive] = await Promise.all([
    getWeeklyUpdate(),
    getWeeklyArchive(),
  ]);
  return <WeeklyPage week={week} archive={archive} />;
}
