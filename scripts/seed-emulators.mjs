// Seeds the local Firebase emulators with a few teachers, conversations, meetups and resources
// so every screen has realistic content during development. Every write is made as the owning
// user, so it also exercises firestore.rules and storage.rules.
//
//   npx firebase emulators:start --only auth,firestore,storage --project demo-coursify
//   node scripts/seed-emulators.mjs
//
// Then run the app with VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-coursify
// VITE_FIREBASE_STORAGE_BUCKET=demo-coursify.appspot.com and sign in as thandi@school.test / password123.
import { readFileSync } from "node:fs"
import { initializeApp } from "firebase/app"
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { arrayUnion, connectFirestoreEmulator, doc, getFirestore, setDoc, updateDoc } from "firebase/firestore"
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"

const app = initializeApp({ apiKey: "demo", projectId: "demo-coursify", storageBucket: "demo-coursify.appspot.com" })
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
connectFirestoreEmulator(db, "127.0.0.1", 8080)
connectStorageEmulator(storage, "127.0.0.1", 9199)

const PASSWORD = "password123"
const now = Date.now()
const ago = (minutes) => new Date(now - minutes * 60_000).toISOString()
const ahead = (days, hour = 15) => {
  const date = new Date(now + days * 86_400_000)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const people = {
  thandi: { email: "thandi@school.test", name: "Thandi Mokoena", school: "Morris Isaacson High School", subject: "Physics", bio: "Physical Sciences teacher (Grades 10 to 12) in Soweto. I build practical-first worksheets and I'm always looking for better ways to teach electricity.", lastActiveAt: ago(0) },
  sipho: { email: "sipho@school.test", name: "Sipho Ndlovu", school: "Pretoria Boys High School", subject: "Mathematics", bio: "Maths HOD. Euclidean geometry enthusiast and Saturday-school tutor.", lastActiveAt: ago(0) },
  ayesha: { email: "ayesha@school.test", name: "Ayesha Patel", school: "Durban Girls' College", subject: "Literature & Language Arts", bio: "English Home Language, Grade 11 and 12. Poetry, essays and a lot of red pen.", lastActiveAt: ago(35) },
  pieter: { email: "pieter@school.test", name: "Pieter van Wyk", school: "Hoërskool Menlopark", subject: "Biology", bio: "Life Sciences teacher and moderator for the district cluster.", lastActiveAt: ago(60 * 26) },
}

const uids = {}
async function as(key) {
  await signOut(auth).catch(() => undefined)
  const person = people[key]
  try {
    uids[key] = (await createUserWithEmailAndPassword(auth, person.email, PASSWORD)).user.uid
  } catch {
    uids[key] = (await signInWithEmailAndPassword(auth, person.email, PASSWORD)).user.uid
  }
  return uids[key]
}

function pdfBytes(title) {
  const text = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 60>>stream\nBT /F1 24 Tf 72 760 Td (${title}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`
  return new TextEncoder().encode(text)
}

function wavBytes(seconds = 4) {
  const rate = 8000
  const samples = rate * seconds
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + samples * 2, 4)
  buffer.write("WAVEfmt ", 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24)
  buffer.writeUInt32LE(rate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.sin((Math.PI * i) / samples)
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * i) / rate) * 6000 * envelope), 44 + i * 2)
  }
  return new Uint8Array(buffer)
}

async function upload(path, bytes, contentType) {
  const target = ref(storage, path)
  await uploadBytes(target, bytes, { contentType })
  return getDownloadURL(target)
}

async function educator(key) {
  const uid = await as(key)
  const person = people[key]
  // Emails are private: they live in accounts/{uid}, never in the public profile.
  await setDoc(doc(db, "accounts", uid), { email: person.email, updatedAt: ago(0) })
  await setDoc(doc(db, "educators", uid), {
    name: person.name,
    initials: person.name.split(" ").map((part) => part[0]).join("").slice(0, 2),
    school: person.school,
    subject: person.subject,
    bio: person.bio,
    joinedYear: 2026,
    storageBytes: 0,
    verified: false,
    badgeClaimed: false,
    institutionLevel: "high-school",
    lastActiveAt: person.lastActiveAt,
    createdAt: ago(60 * 24 * 30),
  })
  return uid
}

async function resource(key, id, fields, file) {
  const uid = await as(key)
  let extra = {}
  if (file) {
    const storagePath = `resources/${uid}/${id}/${file.name}`
    extra = {
      fileName: file.name,
      mimeType: file.type,
      fileBytes: file.bytes.length,
      fileSize: `${(file.bytes.length / 1_000_000).toFixed(1)} MB`,
      storagePath,
      fileUrl: await upload(storagePath, file.bytes, file.type),
      hasFile: true,
    }
  }
  // Counters start at zero: the rules only let them move one step at a time.
  await setDoc(doc(db, "resources", id), { authorId: uid, createdAt: ago(60 * 24 * 3), ...fields, ...extra, downloads: 0, saves: 0 })
}

async function message(from, to, minutesAgo, body, attachment) {
  const sender = await as(from)
  const participantIds = [uids[from], uids[to]].sort()
  const conversationId = participantIds.join(":")
  const createdAt = ago(minutesAgo)
  await setDoc(doc(db, "conversations", conversationId), { participantIds, updatedAt: createdAt, lastMessage: body || `Shared ${attachment?.name}` }, { merge: true })
  await setDoc(doc(db, "messages", `seed-${conversationId}-${minutesAgo}`), {
    conversationId,
    senderId: sender,
    participantIds,
    body: body || `Shared ${attachment.name}`,
    createdAt,
    ...(attachment
      ? { attachmentUrl: attachment.url, attachmentName: attachment.name, attachmentType: attachment.type, attachmentSize: attachment.size }
      : {}),
  })
}

async function markRead(key, peer, minutesAgo) {
  await as(key)
  const conversationId = [uids[key], uids[peer]].sort().join(":")
  await updateDoc(doc(db, "conversations", conversationId), { [`lastReadAt.${uids[key]}`]: ago(minutesAgo) })
}

for (const key of Object.keys(people)) await educator(key)

// Only teachers the founder has verified (SACE check) may publish. Pieter stays unverified so the
// verification banner and the founder's review queue have something to show.
await signOut(auth).catch(() => undefined)
try {
  await createUserWithEmailAndPassword(auth, "kabuyatambwe03@gmail.com", PASSWORD)
} catch {
  await signInWithEmailAndPassword(auth, "kabuyatambwe03@gmail.com", PASSWORD)
}
for (const key of ["thandi", "sipho", "ayesha"]) {
  await updateDoc(doc(db, "educators", uids[key]), { verified: true, badgeClaimed: true, badgeClaimedAt: ago(60 * 24 * 7) })
}

await as("thandi")
for (const other of ["sipho", "ayesha"]) {
  await setDoc(doc(db, "follows", `${uids.thandi}_${uids[other]}`), { followerId: uids.thandi, followeeId: uids[other], createdAt: ago(900) })
}
await as("sipho")
await setDoc(doc(db, "follows", `${uids.sipho}_${uids.thandi}`), { followerId: uids.sipho, followeeId: uids.thandi, createdAt: ago(800) })
await as("pieter")
await setDoc(doc(db, "follows", `${uids.pieter}_${uids.thandi}`), { followerId: uids.pieter, followeeId: uids.thandi, createdAt: ago(700) })

await resource("thandi", "res-seed-circuits", { title: "Electric circuits practical: Ohm's law investigation", subject: "Physics", grade: "Grade 10", kind: "lesson-plan", format: "document", type: "Lesson plan · PDF" }, { name: "ohms-law-practical.pdf", type: "application/pdf", bytes: pdfBytes("Ohm's law practical") })
await resource("thandi", "res-seed-momentum", { title: "Momentum and impulse revision pack", subject: "Physics", grade: "Grade 12", kind: "resource", format: "document", type: "Resource · PDF", downloads: 14 }, { name: "momentum-revision.pdf", type: "application/pdf", bytes: pdfBytes("Momentum revision") })
await resource("thandi", "res-seed-local", { title: "Waves and sound slides (draft)", subject: "Physics", grade: "Grade 10", kind: "resource", format: "slides", type: "Resource · PPTX", fileName: "waves-and-sound.pptx", fileSize: "8.4 MB", fileBytes: 8_400_000, localOnly: true, hasFile: true })
await resource("sipho", "res-seed-geometry", { title: "Euclidean geometry: Term 3 proofs worksheet", subject: "Mathematics", grade: "Grade 11", kind: "resource", format: "document", type: "Resource · PDF", downloads: 31 }, { name: "geometry-proofs.pdf", type: "application/pdf", bytes: pdfBytes("Geometry proofs") })

// Sipho <-> Thandi: grouped messages, an image, a file, a voice note and read receipts.
await as("sipho")
const photo = readFileSync(new URL("../public/landing-images/pretoria-assembly.jpg", import.meta.url))
const photoUrl = await upload(`resources/${uids.sipho}/chat/att-seed_cluster.jpg`, new Uint8Array(photo), "image/jpeg")
const memoUrl = await upload(`resources/${uids.sipho}/chat/att-seed_memo.pdf`, pdfBytes("Paper 2 memo"), "application/pdf")
await as("thandi")
const voiceUrl = await upload(`resources/${uids.thandi}/chat/att-seed_voice.wav`, wavBytes(4), "audio/wav")

await message("sipho", "thandi", 60 * 26, "Morning Thandi! Are you going to the cluster meeting on Saturday?")
await message("thandi", "sipho", 60 * 26 - 4, "Morning! Yes, I'll be there. Are you bringing the Paper 2 memo?")
await message("sipho", "thandi", 60 * 26 - 6, "", { url: memoUrl, name: "Paper 2 memo.pdf", type: "application/pdf", size: "0.3 KB" })
await message("sipho", "thandi", 60 * 26 - 5, "Here it is. Question 4 caught a lot of my learners.")
await message("sipho", "thandi", 42, "", { url: photoUrl, name: "cluster.jpg", type: "image/jpeg", size: "393 KB" })
await message("sipho", "thandi", 41, "This is how we set up the tables last time. Worked really well for the moderation.")
await message("thandi", "sipho", 12, "That's perfect, thank you 🙏")
await message("thandi", "sipho", 11, "I'll share my circuits practical tonight. The Ohm's law one my Grade 10s loved.")
await message("thandi", "sipho", 9, "", { url: voiceUrl, name: "Voice note (0:04).wav", type: "audio/wav", size: "63 KB" })
await markRead("sipho", "thandi", 10)
await markRead("thandi", "sipho", 40)

await message("ayesha", "thandi", 180, "Hi Thandi, could I borrow your practical write-up template for my Grade 11 essay rubric idea?")
await message("pieter", "thandi", 60 * 24 * 3, "Thanks for the momentum pack, using it with my matrics.")
await markRead("thandi", "pieter", 60 * 24 * 2)

// Meetups: one upcoming of each format, one the user hosts, one past.
await as("sipho")
await setDoc(doc(db, "events", "evt-seed-cluster"), {
  title: "Gauteng Maths & Science cluster: Paper 2 moderation",
  description: "Bring three marked scripts per class. We'll moderate together, compare memos and plan the Term 4 revision schedule.",
  hostId: uids.sipho, format: "in-person", startsAt: ahead(2, 9), location: "Morris Isaacson High School, Soweto", rsvpIds: [uids.sipho], createdAt: ago(600),
})
await as("ayesha")
await setDoc(doc(db, "events", "evt-seed-online"), {
  title: "Teaching unseen poetry: what's working in 2026",
  description: "A 45-minute online session for English HL teachers. Share one poem and one strategy that lands with Grade 12s.",
  hostId: uids.ayesha, format: "online", startsAt: ahead(5, 17), meetingUrl: "https://meet.google.com/abc-defg-hij", rsvpIds: [uids.ayesha], createdAt: ago(300),
})
await as("thandi")
await setDoc(doc(db, "events", "evt-seed-mine"), {
  title: "Physical Sciences practical swap",
  description: "Everyone brings one practical that works on a shoestring budget.",
  hostId: uids.thandi, format: "in-person", startsAt: ahead(9, 14), location: "Soweto Science Centre", rsvpIds: [uids.thandi], createdAt: ago(200),
})
await setDoc(doc(db, "events", "evt-seed-past"), {
  title: "Term 2 results reflection",
  description: "Looking back at June exam results together.",
  hostId: uids.thandi, format: "online", startsAt: ahead(-20, 16), meetingUrl: "https://zoom.us/j/123456789", rsvpIds: [uids.thandi], createdAt: ago(60 * 24 * 30),
})
await updateDoc(doc(db, "events", "evt-seed-cluster"), { rsvpIds: arrayUnion(uids.thandi) })
await as("pieter")
await updateDoc(doc(db, "events", "evt-seed-cluster"), { rsvpIds: arrayUnion(uids.pieter) })

// Pieter confirms his email (done directly in the Auth emulator) and asks to be verified.
await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-coursify/accounts:update", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
  body: JSON.stringify({ localId: uids.pieter, emailVerified: true }),
})
await signOut(auth)
await signInWithEmailAndPassword(auth, people.pieter.email, PASSWORD)
await auth.currentUser.getIdToken(true)
await setDoc(doc(db, "verificationRequests", uids.pieter), {
  saceNumber: "10293847", school: people.pieter.school, name: people.pieter.name, status: "pending", submittedAt: ago(30),
})

await signOut(auth)
console.log("Seeded. Sign in as thandi@school.test /", PASSWORD)
process.exit(0)
