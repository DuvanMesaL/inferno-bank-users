export const register = async () => ({ statusCode: 201, body: JSON.stringify({ ok: true, action: "register" })});
export const login = async () => ({ statusCode: 200, body: JSON.stringify({ ok: true, action: "login", token: "demo" })});
export const getProfile = async (evt) => ({ statusCode: 200, body: JSON.stringify({ ok: true, userId: evt?.pathParameters?.user_id })});
export const updateProfile = async (evt) => ({ statusCode: 200, body: JSON.stringify({ ok: true, userId: evt?.pathParameters?.user_id, updated: true })});
export const uploadAvatar = async (evt) => ({ statusCode: 200, body: JSON.stringify({ ok: true, userId: evt?.pathParameters?.user_id, avatar: "uploaded" })});
