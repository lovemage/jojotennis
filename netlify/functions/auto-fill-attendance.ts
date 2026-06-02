export const config = {
  schedule: "0 3 * * *",
};

export default async function handler() {
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return new Response("Missing APP_BASE_URL", { status: 500 });
  }

  const response = await fetch(`${baseUrl}/api/cron/auto-fill-attendance`, {
    method: "POST",
    headers: {
      "x-cron-secret": process.env.CRON_SECRET ?? "",
    },
  });

  return new Response(await response.text(), { status: response.status });
}
