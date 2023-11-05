addEventListener("fetch", (event) => {
  event.respondWith(handle(event.request));
});

// use secrets
const client_id = CLIENT_ID;
const client_secret = CLIENT_SECRET;

async function handle(request) {
  // redirect GET requests to the OAuth login page on github.com
  if (request.method === "GET") {
    return Response.redirect(
      `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo`,
      302
    );
  }

  try {
    const { code } = await request.json();

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "github-lite",
          accept: "application/json",
        },
        body: JSON.stringify({ client_id, client_secret, code }),
      }
    );
    const result = await response.json();
    const headers = {
      "Access-Control-Allow-Origin": "*",
    };

    if (result.error) {
      return new Response(JSON.stringify(result), { status: 401, headers });
    }

    return new Response(JSON.stringify({ token: result.access_token }), {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error(error);
    return new Response(error.message, {
      status: 500,
    });
  }
}
