import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const region = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.USER_TABLE;
const BUCKET = process.env.AVATARS_BUCKET;
const QUEUE_URL = process.env.CARD_REQUEST_QUEUE_URL;
const SECRET_NAME = process.env.USERS_SECRET_NAME;
const JWT_TTL = Number(process.env.JWT_TTL || "3600");

// NUEVO: cola de notificaciones
const NOTIFICATIONS_QUEUE_URL = process.env.NOTIFICATIONS_QUEUE_URL;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const s3 = new S3Client({ region });
const sqs = new SQSClient({ region });
const sm = new SecretsManagerClient({ region });

let cachedSecrets = null;
async function getSecrets() {
  if (cachedSecrets) return cachedSecrets;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  cachedSecrets = JSON.parse(res.SecretString || "{}");
  return cachedSecrets;
}

function ok(statusCode, data) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
function bad(statusCode, message) {
  return ok(statusCode, { ok: false, error: message });
}
function parseBody(evt) {
  try { return JSON.parse(evt.body || "{}"); } catch { return {}; }
}

function toDebug(err) {
  const code = err?.name || err?.Code || err?.__type || "UnknownError";
  const msg  = err?.message || String(err);
  const meta = err?.$metadata || {};
  return { code, msg, meta };
}

function reply(statusCode, payload, err) {
  const DEBUG = process.env.DEBUG_ERRORS === "1";
  const base = { ...payload };
  if (DEBUG && err) {
    const d = toDebug(err);
    base._debug = d;
  }
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(base) };
}

// ====== NUEVO: helper de notificaciones ======
async function publishNotification({ userId, type, message, extra = {} }) {
  try {
    if (!NOTIFICATIONS_QUEUE_URL) {
      console.warn("[NOTIF|USERS] NOTIFICATIONS_QUEUE_URL not set, skipping");
      return;
    }
    const payload = { userId, type, message, ...extra };
    const body = JSON.stringify(payload);
    console.log("[NOTIF|USERS] Publish →", body);
    const out = await sqs.send(new SendMessageCommand({
      QueueUrl: NOTIFICATIONS_QUEUE_URL,
      MessageBody: body,
    }));
    console.log("[NOTIF|USERS] SQS OK", out?.MessageId);
  } catch (e) {
    console.error("[NOTIF|USERS] publish error", e);
  }
}

// POST /register
export const register = async (evt) => {
  const warnings = [];
  try {
    const body = parseBody(evt);
    for (const f of ["name","lastName","email","password","document"]) {
      if (!body[f]) return reply(400, { ok:false, where:"validate", error:`Falta ${f}` });
    }
    const id = uuidv4();

    // 1) Secrets
    let secrets;
    try {
      secrets = await getSecrets();
    } catch (e) {
      console.error("step=getSecrets", e);
      return reply(500, { ok:false, where:"getSecrets", error:"No se pudieron leer los secretos" }, e);
    }

    // 2) Hash
    let hashed;
    try {
      const { BCRYPT_SALT = 10 } = secrets || {};
      hashed = (typeof BCRYPT_SALT === "string" && BCRYPT_SALT.startsWith("$2"))
        ? bcrypt.hashSync(body.password, BCRYPT_SALT)
        : bcrypt.hashSync(body.password, Number(BCRYPT_SALT));
    } catch (e) {
      console.error("step=hash", e);
      return reply(500, { ok:false, where:"hash", error:"No se pudo cifrar la contraseña" }, e);
    }

    // 3) Put en Dynamo
    const item = {
      uuid: id,
      document: "PROFILE",
      name: body.name,
      lastName: body.lastName,
      email: String(body.email).toLowerCase(),
      password: hashed,
      direction: body.direction ?? null,
      phoneNumber: body.phoneNumber ?? null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };

    try {
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(#u)",
        ExpressionAttributeNames: { "#u": "uuid" }
      }));
    } catch (e) {
      console.error("step=dynamoPut", e);
      return reply(500, { ok:false, where:"dynamoPut", error:"No se pudo guardar el usuario" }, e);
    }

    // 4) Enviar 2 mensajes a SQS (card requests) – no bloquea
    try {
      const types = ["DEBIT", "CREDIT"];
      for (const type of types) {
        await sqs.send(new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify({ userId: id, request: type })
        }));
      }
    } catch (e) {
      console.error("step=sqsSend (non-blocking)", e);
      warnings.push({ where:"sqsSend", hint:"No bloquea el registro", ...toDebug(e) });
    }

    // 5) NUEVO: notificación USER_CREATED
    await publishNotification({
      userId: id,
      type: "USER_CREATED",
      message: `User ${item.email} created`,
    });

    const { password, ...publicUser } = item;
    return reply(201, { ok:true, user: publicUser, warnings: warnings.length ? warnings : undefined });

  } catch (e) {
    console.error("register fatal", e);
    return reply(500, { ok:false, where:"fatal", error:"Error registrando" }, e);
  }
};

// POST /login
export const login = async (evt) => {
  try {
    const body = parseBody(evt);
    if (!body.email || !body.password) return bad(400, "Falta email o password");
    const email = String(body.email).toLowerCase();

    // Nota: Scan para demo (no hay GSI por email)
    const scan = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#e = :e AND #doc = :p",
      ExpressionAttributeNames: { "#e": "email", "#doc": "document" },
      ExpressionAttributeValues: { ":e": email, ":p": "PROFILE" },
      Limit: 1
    }));
    if (!scan.Items || !scan.Items.length) return bad(401, "Usuario no encontrado");

    const user = scan.Items[0];
    const match = bcrypt.compareSync(body.password, user.password);
    if (!match) return bad(401, "Credenciales inválidas");

    const { JWT_SECRET = "change-me" } = await getSecrets();
    const token = jwt.sign({ sub: user.uuid, email: user.email }, JWT_SECRET, { expiresIn: JWT_TTL });

    const { password, ...publicUser } = user;
    return ok(200, { ok: true, token, user: publicUser });
  } catch (e) {
    console.error("login error", e);
    return bad(500, "Error en login");
  }
};

// GET /profile/{user_id}
export const getProfile = async (evt) => {
  try {
    const userId = evt?.pathParameters?.user_id;
    if (!userId) return bad(400, "Falta user_id");
    const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { uuid: userId, document: "PROFILE" } }));
    if (!res.Item) return bad(404, "No encontrado");
    const { password, ...publicUser } = res.Item;
    return ok(200, { ok: true, user: publicUser });
  } catch (e) {
    console.error("get profile error", e);
    return bad(500, "Error obteniendo perfil");
  }
};

// PUT /profile/{user_id}
export const updateProfile = async (evt) => {
  try {
    const userId = evt?.pathParameters?.user_id;
    if (!userId) return bad(400, "Falta user_id");
    const body = parseBody(evt);
    const fields = {};
    if (body.direction !== undefined) fields.direction = body.direction;
    if (body.phoneNumber !== undefined) fields.phoneNumber = body.phoneNumber;
    if (!Object.keys(fields).length) return bad(400, "Nada para actualizar");

    const UpdateExpression = "SET " + Object.keys(fields).map((k,i)=>`#${i} = :${i}`).join(", ");
    const ExpressionAttributeNames = Object.keys(fields).reduce((acc,k,i)=> (acc[`#${i}`]=k, acc), {});
    const ExpressionAttributeValues = Object.values(fields).reduce((acc,v,i)=> (acc[`:${i}`]=v, acc), {});

    const res = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { uuid: userId, document: "PROFILE" },
      UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues,
      ReturnValues: "ALL_NEW"
    }));
    const { password, ...publicUser } = res.Attributes || {};

    // NUEVO: notificación de update
    await publishNotification({
      userId,
      type: "USER_PROFILE_UPDATED",
      message: "Profile updated",
    });

    return ok(200, { ok: true, user: publicUser });
  } catch (e) {
    console.error("update profile error", e);
    return bad(500, "Error actualizando perfil");
  }
};

// POST /profile/{user_id}/avatar
export const uploadAvatar = async (evt) => {
  try {
    const userId = evt?.pathParameters?.user_id;
    if (!userId) return bad(400, "Falta user_id");
    const body = parseBody(evt);
    const img = body?.image;
    if (!img?.data || !img?.contentType || !img?.name) return bad(400, "Falta image {data, contentType, name}");

    const buffer = Buffer.from(img.data, "base64");
    const key = `${userId}/${Date.now()}-${img.name}`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: img.contentType }));

    const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
    const res = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { uuid: userId, document: "PROFILE" },
      UpdateExpression: "SET avatarUrl = :a",
      ExpressionAttributeValues: { ":a": url },
      ReturnValues: "ALL_NEW"
    }));
    const { password, ...publicUser } = res.Attributes || {};

    // NUEVO: notificación de avatar
    await publishNotification({
      userId,
      type: "USER_AVATAR_UPLOADED",
      message: "Avatar uploaded",
      extra: { avatarKey: key }
    });

    return ok(200, { ok: true, user: publicUser, avatarKey: key });
  } catch (e) {
    console.error("upload avatar error", e);
    return bad(500, "Error subiendo avatar");
  }
};
