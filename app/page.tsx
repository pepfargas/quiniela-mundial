import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: matches } = await supabase
    .from("matches")
    .select("*");

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        Quiniela Mundial 2026
      </h1>

      {matches?.map((match) => (
        <div
          key={match.id}
          className="border p-4 mb-4 rounded"
        >
          {match.home_team} vs {match.away_team}
        </div>
      ))}
    </main>
  );
}