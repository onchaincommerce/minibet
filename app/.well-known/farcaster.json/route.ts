export async function GET() {
  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjIxNTA1NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEI0MjcxQTUyNTVhMzYzYTNCY0MyRTQxNGJjN0JkM0VDYTgwRmNGZjgifQ",
      payload: "eyJkb21haW4iOiJtaW5pYmV0LnZlcmNlbC5hcHAvIn0",
      signature: "MHgyMTQzOTdlZmFhMjQ3OGJmNTQzNTJkZjFmMDQwY2ViMzFiYjVkZjRkMGQxYmNlMjM5Y2FkMTY1YWVhMjc3ODAyNzcyYjkwNDRjODczM2UzMzA3ZjcwOTE5MGMyNjI0OTI0N2VjMTI5ZmZlOTJhZGZlZjczMDU1ZDBlNjY3NjY4NzFi"
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
