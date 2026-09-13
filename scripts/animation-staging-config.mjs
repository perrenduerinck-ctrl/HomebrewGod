const firebaseKeys = new Set(["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"]);
export function validateAnimationStagingConfig(input) {
  if (input?.environment !== "staging") throw new Error("Set environment to staging explicitly.");
  if (Object.keys(input).some(key => !["environment", "firebase", "cloudinary"].includes(key))) throw new Error("Only public staging configuration is allowed; never include credentials or service-account keys.");
  const firebase = input.firebase || {}, cloudinary = input.cloudinary || {};
  if (Object.keys(firebase).some(key => !firebaseKeys.has(key)) || Object.keys(cloudinary).some(key => !["cloudName", "uploadPreset"].includes(key))) throw new Error("Only public Firebase web configuration and an unsigned upload preset are allowed.");
  for (const key of ["apiKey", "authDomain", "projectId", "appId"]) if (typeof firebase[key] !== "string" || !firebase[key].trim()) throw new Error(`Missing Firebase ${key}.`);
  if (firebase.projectId === "homebrewgd" || firebase.authDomain === "homebrewgd.firebaseapp.com" || firebase.apiKey === "AIzaSyCT1IqS08HyXsP-o6pXJfYtz8p6BtM9Cb4" || firebase.appId === "1:1067340395343:web:03ad344ced2aaa16c48b3a") throw new Error("Refusing production Firebase configuration for animation staging.");
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(firebase.projectId)) throw new Error("Use a valid staging Firebase project ID.");
  for (const key of ["cloudName", "uploadPreset"]) if (!/^[a-zA-Z0-9_-]+$/.test(cloudinary[key] || "")) throw new Error(`Missing or invalid Cloudinary ${key}.`);
  if (cloudinary.cloudName === "dkezxpnl6" && cloudinary.uploadPreset === "homebrewgod_maps") throw new Error("Use a separate Cloudinary cloud or an explicitly authorized staging upload preset.");
  return { environment: "staging", firebase: { ...firebase }, cloudinary: { ...cloudinary } };
}
function replaceOnce(source, pattern, value, label) {
  if ([...source.matchAll(new RegExp(pattern.source, "g"))].length !== 1) throw new Error(`Could not safely replace the ${label} configuration. Source layout changed.`);
  return source.replace(pattern, () => value);
}
export function applyAnimationStagingConfig(source, input) {
  const config = validateAnimationStagingConfig(input);
  let result = replaceOnce(source, /const firebaseConfig = \{[\s\S]*?\n\};/, `const firebaseConfig = ${JSON.stringify(config.firebase, null, 2)};`, "Firebase");
  result = replaceOnce(result, /const cloudName = "[^"\n]+";/, `const cloudName = ${JSON.stringify(config.cloudinary.cloudName)};`, "Cloudinary cloud");
  result = replaceOnce(result, /const uploadPreset = "[^"\n]+";/, `const uploadPreset = ${JSON.stringify(config.cloudinary.uploadPreset)};`, "unsigned preset");
  return replaceOnce(result, /const cloudinaryDeleteEndpoint =\s*"[^"\n]+";/, 'const cloudinaryDeleteEndpoint = "";', "hosted deletion endpoint");
}
