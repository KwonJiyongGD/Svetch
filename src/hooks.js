import cookie from 'cookie';

export async function handle({ event, resolve }) {
  // before each request, get the cookies
  const cookies = cookie.parse(event.request.headers.get('cookie') || '');
  // update the stored user to be the value of the user cookie
  event.locals.user = cookies.user;
  // process the HTTP request
  const response = await resolve(event);
  // add the cookie to the response
  response.headers.append('set-cookie', `user=${event.locals.user || ''}; path=/; HttpOnly`)
  
  return response;
}

export async function getSession(event) {
  // client-side exposed information (do not store secure info here)
  return {
    user: event.locals.user
  }
}