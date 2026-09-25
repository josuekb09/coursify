// End-to-end check of the upload path against the Firebase emulators and this repo's storage.rules.
// Run with:  npx firebase emulators:exec --only auth,storage --project demo-coursify "node scripts/storage-roundtrip.test.mjs"
import { randomBytes, createHash } from "node:crypto"
import { initializeApp } from "firebase/app"
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth"
import {
  connectStorageEmulator,
  getBytes,
  getDownloadURL,
  getMetadata,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage"

const app = initializeApp({ apiKey: "demo", projectId: "demo-coursify", storageBucket: "demo-coursify.appspot.com" })
const auth = getAuth(app)
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
const storage = getStorage(app)
connectStorageEmulator(storage, "127.0.0.1", 9199)

const MiB = 1024 * 1024
const cases = [
  ["lesson.pdf", "application/pdf", 2 * MiB],
  ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 6 * MiB],
  ["worksheet.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 800 * 1024],
  ["marks.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1.5 * MiB],
  ["starter-code.zip", "application/zip", 4 * MiB],
  ["notes.txt", "text/plain", 20 * 1024],
  ["lesson-recording.mp4", "video/mp4", 28 * MiB],
]

function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16)
}

function upload(path, bytes, contentType) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), bytes, { contentType })
    let events = 0
    task.on("state_changed", () => (events += 1), reject, () => resolve(events))
  })
}

let failures = 0
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`)
  if (!ok) failures += 1
}

const owner = await createUserWithEmailAndPassword(auth, "owner@school.test", "password123")
const uid = owner.user.uid

for (const [name, type, size] of cases) {
  const bytes = randomBytes(Math.round(size))
  const path = `resources/${uid}/res-test/${name}`
  const started = Date.now()
  const events = await upload(path, bytes, type)
  const url = await getDownloadURL(ref(storage, path))
  const meta = await getMetadata(ref(storage, path))
  const back = Buffer.from(await getBytes(ref(storage, path)))
  check(
    sha(back) === sha(bytes) && meta.contentType === type && url.startsWith("http"),
    `${name.padEnd(22)} ${(size / MiB).toFixed(1).padStart(5)} MiB  ${events} progress events  ${Date.now() - started} ms  bytes+type round-trip`,
  )
}

await upload(`resources/${uid}/chat/att-1_photo.jpg`, randomBytes(300 * 1024), "image/jpeg")
check(true, "chat attachment path resources/{uid}/chat/ accepted")

try {
  await upload(`resources/${uid}/res-big/too-big.pdf`, randomBytes(50 * MiB + 1), "application/pdf")
  check(false, "file over 50 MiB rejected by rules")
} catch (error) {
  check(error.code === "storage/unauthorized", `file over 50 MiB rejected by rules (${error.code})`)
}

await signOut(auth)
await createUserWithEmailAndPassword(auth, "colleague@school.test", "password123")
const shared = Buffer.from(await getBytes(ref(storage, `resources/${uid}/res-test/lesson.pdf`)))
check(shared.length === 2 * MiB, "another signed-in teacher can download the file")
try {
  await upload(`resources/${uid}/res-test/evil.pdf`, randomBytes(10), "application/pdf")
  check(false, "another teacher cannot write into someone else's folder")
} catch (error) {
  check(error.code === "storage/unauthorized", `another teacher cannot write into someone else's folder (${error.code})`)
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll storage checks passed")
process.exit(failures ? 1 : 0)
