import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  console.log(supabase);

  return <div>Supabase works</div>;
}