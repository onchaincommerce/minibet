export async function GET() {
  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjIxNTA1NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEI0MjcxQTUyNTVhMzYzYTNCY0MyRTQxNGJjN0JkM0VDYTgwRmNGZjgifQ",
      payload: "eyJkb21haW4iOiJtaW5pYmV0LnZlcmNlbC5hcHAifQ",
      signature: "MHgzNDY5Y2MwMTIxNmMzMTk4YTc1MTM4YmI0ZjVlNmNmMmY4Y2U3OWMwYzViZjBlMDFmNWY2ZDc5YWYxNDAyMmExMzRlNGVhYTYxMWJiZjIxYzU2Y2ZmZjRiYmZmM2Y5NGRjMmI4MmE2Y2U0MDY4MjIyMmM4NzkwOGNjNmQyNDQwYzFi"
    },
    frame: {
      name: "minibet",
      homeUrl: "https://minibet.vercel.app/",
      buttonTitle: "Launch minibet",
      splashBackgroundColor: "#0052FF",
      webhookUrl: "https://minibet.vercel.app//api/webhook",
      version: "1",
      iconUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/eLn2sv3JTDfs/minibet_voxel-OEtFw9lLeKis4YLQwHMidCdsG0Jdd4.png?iUKu"
    }
  });
}
