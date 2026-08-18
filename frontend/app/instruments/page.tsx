import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instituciones, error } = await supabase
    .schema("mydb")
    .from("instituciones")
    .select();

  if (error) {
    return <pre>Error: {JSON.stringify(error, null, 2)}</pre>;
  }

  return <pre>{JSON.stringify(instituciones, null, 2)}</pre>;
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instituciones...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}