export async function onRequestPost({request, env}) {
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
        body: JSON.stringify({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, code }),
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

export async function onRequestGet({request}) {
  // Used during local development to redirect back to localhost.
  let url = new URL(request.url);
  let redirect = url.searchParams.get('redirect');
  if (redirect.startsWith('http://localhost')) {
    return new Response.redirect(redirect);
  }

  return new Response('Redirect not allowed', {status: 400});
}
