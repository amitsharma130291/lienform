export const prerender = false;
export async function POST() {
  return new Response(JSON.stringify({ error: 'Payments not enabled' }), { status: 404 });
}
