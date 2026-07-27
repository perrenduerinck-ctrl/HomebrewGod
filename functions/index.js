"use strict";

const {
  onRequest
} = require("firebase-functions/v2/https");
const {
  defineSecret,
  defineString
} = require("firebase-functions/params");
const logger =
  require("firebase-functions/logger");
const {
  initializeApp
} = require("firebase-admin/app");
const {
  getAuth
} = require("firebase-admin/auth");
const {
  getFirestore
} = require("firebase-admin/firestore");
const {
  v2: cloudinary
} = require("cloudinary");

initializeApp();

const CLOUDINARY_API_KEY =
  defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET =
  defineSecret("CLOUDINARY_API_SECRET");
const CLOUDINARY_CLOUD_NAME =
  defineString(
    "CLOUDINARY_CLOUD_NAME",
    {
      default: "dkezxpnl6"
    }
  );

const MAX_IMAGE_BYTES =
  8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif"
  ]);
const DM_IMAGE_KINDS =
  new Set([
    "map",
    "puzzle",
    "token"
  ]);
const ALL_IMAGE_KINDS =
  new Set([
    ...DM_IMAGE_KINDS,
    "portrait"
  ]);
const ALLOWED_ORIGINS = [
  "https://perrenduerinck-ctrl.github.io",
  "http://127.0.0.1:8768",
  "http://localhost:8768"
];

function sendError(
  response,
  status,
  code,
  message
) {
  response.status(status).json({
    ok: false,
    error: {
      code,
      message
    }
  });
}

function markUpstreamError(error) {
  const upstreamError =
    new Error(
      "The image service is temporarily unavailable."
    );
  upstreamError.status = 502;
  upstreamError.code =
    "image-service-unavailable";
  upstreamError.cause = error;
  return upstreamError;
}

function normalizeRoomCode(value) {
  const roomCode =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z0-9-]{3,24}$/
      .test(roomCode)
  ) {
    throw new Error(
      "A valid room code is required."
    );
  }

  return roomCode;
}

function cleanPublicId(value) {
  const publicId =
    String(value || "")
      .trim();

  if (
    !publicId ||
    publicId.length > 240 ||
    publicId.includes("..") ||
    !/^[a-zA-Z0-9_./-]+$/
      .test(publicId)
  ) {
    throw new Error(
      "A valid Cloudinary public ID is required."
    );
  }

  return publicId;
}

async function authenticateRequest(
  request
) {
  const authorization =
    String(
      request.get("authorization") ||
      ""
    );
  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    const error =
      new Error(
        "A Firebase ID token is required."
      );
    error.status = 401;
    error.code = "unauthenticated";
    throw error;
  }

  try {
    return await getAuth()
      .verifyIdToken(match[1]);
  } catch (cause) {
    const error =
      new Error(
        "The Firebase session is invalid or expired."
      );
    error.status = 401;
    error.code = "unauthenticated";
    error.cause = cause;
    throw error;
  }
}

async function getRoomAccess(
  roomCode,
  uid
) {
  const database =
    getFirestore();
  const roomRef =
    database.doc(
      `rooms/${roomCode}`
    );
  const roomSnapshot =
    await roomRef.get();

  if (!roomSnapshot.exists) {
    const error =
      new Error(
        "The room does not exist."
      );
    error.status = 404;
    error.code = "room-not-found";
    throw error;
  }

  const room =
    roomSnapshot.data() || {};
  const isDm =
    room.dmUid === uid;
  let isMember = isDm;

  if (!isMember) {
    const membership =
      await roomRef
        .collection("players")
        .doc(uid)
        .get();
    isMember =
      membership.exists;
  }

  if (!isMember) {
    const error =
      new Error(
        "Room membership is required."
      );
    error.status = 403;
    error.code = "permission-denied";
    throw error;
  }

  return {
    database,
    roomRef,
    room,
    isDm
  };
}

function decodeImagePayload(body) {
  const requestedMimeType =
    String(
      body?.mimeType || ""
    )
      .trim()
      .toLowerCase();
  const rawBase64 =
    String(
      body?.fileBase64 || ""
    )
      .trim()
      .replace(
        /^data:[^;]+;base64,/i,
        ""
      );

  if (
    !ALLOWED_IMAGE_TYPES
      .has(requestedMimeType)
  ) {
    throw new Error(
      "Use a JPEG, PNG, WebP, GIF, or AVIF image."
    );
  }

  if (
    !rawBase64 ||
    !/^[a-zA-Z0-9+/]+={0,2}$/
      .test(rawBase64)
  ) {
    throw new Error(
      "The image payload is invalid."
    );
  }

  const bytes =
    Buffer.from(
      rawBase64,
      "base64"
    );

  if (
    bytes.length <= 0 ||
    bytes.length >
      MAX_IMAGE_BYTES
  ) {
    throw new Error(
      "Image files must be 8 MB or smaller."
    );
  }

  const detectedMimeType =
    detectImageMimeType(bytes);

  if (
    !detectedMimeType ||
    detectedMimeType !==
      requestedMimeType
  ) {
    throw new Error(
      "The file contents do not match the declared image type."
    );
  }

  return {
    bytes,
    mimeType:
      detectedMimeType
  };
}

function detectImageMimeType(bytes) {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8)
      .equals(
        Buffer.from([
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a
        ])
      )
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 6 &&
    [
      "GIF87a",
      "GIF89a"
    ].includes(
      bytes
        .subarray(0, 6)
        .toString("ascii")
    )
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4)
      .toString("ascii") ===
        "RIFF" &&
    bytes.subarray(8, 12)
      .toString("ascii") ===
        "WEBP"
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 16 &&
    bytes.subarray(4, 8)
      .toString("ascii") ===
        "ftyp" &&
    /avif|avis/.test(
      bytes
        .subarray(8, 16)
        .toString("ascii")
    )
  ) {
    return "image/avif";
  }

  return "";
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name:
      CLOUDINARY_CLOUD_NAME.value(),
    api_key:
      CLOUDINARY_API_KEY.value(),
    api_secret:
      CLOUDINARY_API_SECRET.value(),
    secure: true
  });
}

function uploadImageBuffer(
  bytes,
  roomCode,
  assetKind
) {
  return new Promise(
    (resolve, reject) => {
      const upload =
        cloudinary.uploader
          .upload_stream(
            {
              resource_type:
                "image",
              folder:
                `homebrewgod/${roomCode}`,
              tags: [
                "homebrewgod",
                `room-${roomCode}`,
                `kind-${assetKind}`
              ],
              overwrite: false,
              invalidate: false
            },
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(result);
            }
          );

      upload.end(bytes);
    }
  );
}

async function queryReference(
  collectionRef,
  field,
  value,
  ignoredDocumentId
) {
  const snapshot =
    await collectionRef
      .where(field, "==", value)
      .limit(2)
      .get();

  return snapshot.docs.some(
    (documentSnapshot) => {
      return (
        documentSnapshot.id !==
        ignoredDocumentId
      );
    }
  );
}

async function isAssetReferenced({
  roomRef,
  room,
  publicId,
  ignoredCharacterId
}) {
  const roomPublicIds = [
    room.currentMapPublicId,
    room.mapPublicId,
    room.currentMap?.publicId
  ].filter(Boolean);

  if (
    roomPublicIds.includes(publicId)
  ) {
    return true;
  }

  const references = [
    [
      "maps",
      "publicId",
      null
    ],
    [
      "puzzleTiles",
      "publicId",
      null
    ],
    [
      "tokens",
      "publicId",
      null
    ],
    [
      "characters",
      "identity.image.publicId",
      ignoredCharacterId || null
    ],
    [
      "monsters",
      "imagePublicId",
      null
    ]
  ];

  for (
    const [
      collectionName,
      field,
      ignoredId
    ] of references
  ) {
    if (
      await queryReference(
        roomRef.collection(
          collectionName
        ),
        field,
        publicId,
        ignoredId
      )
    ) {
      return true;
    }
  }

  return false;
}

exports.uploadCloudinaryImage =
  onRequest(
    {
      cors: ALLOWED_ORIGINS,
      secrets: [
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET
      ],
      timeoutSeconds: 120,
      memory: "512MiB"
    },
    async (request, response) => {
      if (request.method !== "POST") {
        sendError(
          response,
          405,
          "method-not-allowed",
          "Use POST."
        );
        return;
      }

      try {
        const user =
          await authenticateRequest(
            request
          );
        const roomCode =
          normalizeRoomCode(
            request.body?.roomCode
          );
        const assetKind =
          String(
            request.body
              ?.assetKind || ""
          )
            .trim()
            .toLowerCase();

        if (
          !ALL_IMAGE_KINDS
            .has(assetKind)
        ) {
          throw new Error(
            "A valid image purpose is required."
          );
        }

        const access =
          await getRoomAccess(
            roomCode,
            user.uid
          );

        if (
          DM_IMAGE_KINDS
            .has(assetKind) &&
          !access.isDm
        ) {
          const error =
            new Error(
              "Only the room DM can upload this image type."
            );
          error.status = 403;
          error.code =
            "permission-denied";
          throw error;
        }

        const image =
          decodeImagePayload(
            request.body
          );

        configureCloudinary();

        let result;

        try {
          result =
            await uploadImageBuffer(
              image.bytes,
              roomCode,
              assetKind
            );
        } catch (cloudinaryError) {
          throw markUpstreamError(
            cloudinaryError
          );
        }

        response.status(200).json({
          ok: true,
          secure_url:
            result.secure_url,
          public_id:
            result.public_id,
          bytes:
            result.bytes,
          format:
            result.format
        });
      } catch (error) {
        logger.warn(
          "Secure Cloudinary upload rejected.",
          {
            code: error.code,
            message: error.message
          }
        );
        sendError(
          response,
          error.status || 400,
          error.code ||
            "upload-rejected",
          error.status >= 500
            ? "The secure upload service is temporarily unavailable."
            : error.message
        );
      }
    }
  );

exports.deleteCloudinaryAsset =
  onRequest(
    {
      cors: ALLOWED_ORIGINS,
      secrets: [
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET
      ],
      timeoutSeconds: 60,
      memory: "256MiB"
    },
    async (request, response) => {
      if (request.method !== "POST") {
        sendError(
          response,
          405,
          "method-not-allowed",
          "Use POST."
        );
        return;
      }

      try {
        const user =
          await authenticateRequest(
            request
          );
        const roomCode =
          normalizeRoomCode(
            request.body?.roomCode
          );
        const publicId =
          cleanPublicId(
            request.body?.publicId
          );
        const assetKind =
          String(
            request.body
              ?.assetKind || "map"
          )
            .trim()
            .toLowerCase();
        const access =
          await getRoomAccess(
            roomCode,
            user.uid
          );
        let ignoredCharacterId = "";

        if (!access.isDm) {
          if (
            assetKind !== "portrait"
          ) {
            const error =
              new Error(
                "Only the room DM can delete this image type."
              );
            error.status = 403;
            error.code =
              "permission-denied";
            throw error;
          }

          ignoredCharacterId =
            String(
              request.body
                ?.characterId || ""
            ).trim();

          if (!ignoredCharacterId) {
            const error =
              new Error(
                "Save the character before deleting its hosted portrait."
              );
            error.status = 403;
            error.code =
              "permission-denied";
            throw error;
          }

          const characterSnapshot =
            await access.roomRef
              .collection(
                "characters"
              )
              .doc(
                ignoredCharacterId
              )
              .get();
          const character =
            characterSnapshot.data() ||
            {};

          if (
            !characterSnapshot.exists ||
            character.ownerUid !==
              user.uid
          ) {
            const error =
              new Error(
                "Only the character owner or room DM can delete this portrait."
              );
            error.status = 403;
            error.code =
              "permission-denied";
            throw error;
          }
        }

        const expectedPrefix =
          `homebrewgod/${roomCode}/`;

        if (
          !publicId.startsWith(
            expectedPrefix
          )
        ) {
          const error =
            new Error(
              "This image is outside the room's managed Cloudinary folder."
            );
          error.status = 403;
          error.code =
            "permission-denied";
          throw error;
        }

        if (
          await isAssetReferenced({
            roomRef:
              access.roomRef,
            room:
              access.room,
            publicId,
            ignoredCharacterId
          })
        ) {
          const error =
            new Error(
              "The image is still referenced by room data."
            );
          error.status = 409;
          error.code =
            "asset-still-referenced";
          throw error;
        }

        configureCloudinary();

        let result;

        try {
          result =
            await cloudinary
              .uploader
              .destroy(
                publicId,
                {
                  resource_type:
                    "image",
                  invalidate: true
                }
              );
        } catch (cloudinaryError) {
          throw markUpstreamError(
            cloudinaryError
          );
        }

        response.status(200).json({
          ok: true,
          result:
            result.result
        });
      } catch (error) {
        logger.warn(
          "Secure Cloudinary deletion rejected.",
          {
            code: error.code,
            message: error.message
          }
        );
        sendError(
          response,
          error.status || 400,
          error.code ||
            "delete-rejected",
          error.status >= 500
            ? "The secure deletion service is temporarily unavailable."
            : error.message
        );
      }
    }
  );

exports._test = {
  detectImageMimeType,
  normalizeRoomCode,
  cleanPublicId,
  decodeImagePayload
};
