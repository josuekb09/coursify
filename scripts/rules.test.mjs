// Security-rule checks for firestore.rules and storage.rules against the Firebase emulators.
// Run with:  npm run test:rules
import { readFileSync } from "node:fs"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing"
import { arrayRemove, arrayUnion, deleteDoc, deleteField, doc, getDoc, increment, setDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"

const FOUNDER = "kabuyatambwe03@gmail.com"

const env = await initializeTestEnvironment({
  projectId: "demo-coursify",
  firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
})

const alice = env.authenticatedContext("alice", { email: "alice@school.za" })
const bob = env.authenticatedContext("bob", { email: "bob@school.za" })
const founder = env.authenticatedContext("founder", { email: FOUNDER })
const anon = env.unauthenticatedContext()
const db = (ctx) => ctx.firestore()

let passed = 0
let failed = 0
async function check(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  FAIL ${name}\n       ${error?.message ?? error}`)
  }
}

async function seed() {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore()
    await setDoc(doc(d, "educators/alice"), { name: "Alice", email: "alice@school.za", bio: "Teacher", school: "Hoërskool", verified: false, legacyField: 1 })
    await setDoc(doc(d, "educators/bob"), { name: "Bob", bio: "", school: "", verified: false })
    for (const id of ["r1", "r2", "r3"]) {
      await setDoc(doc(d, `resources/${id}`), { title: id, authorId: "alice", downloads: 0, saves: 0 })
    }
    await setDoc(doc(d, "resources/b1"), { title: "b1", authorId: "bob", downloads: 0, saves: 0 })
    await setDoc(doc(d, "events/e1"), { title: "Meetup", hostId: "alice", format: "online", rsvpIds: ["alice", "carol"] })
    await setDoc(doc(d, "messages/m1"), { conversationId: "alice:bob", senderId: "alice", participantIds: ["alice", "bob"], body: "hi" })
    await setDoc(doc(d, "accounts/alice"), { email: "alice@school.za" })
  })
}

await seed()
console.log("Firestore")

await check("signed-out visitors cannot read profiles", () => assertFails(getDoc(doc(db(anon), "educators/alice"))))
await check("members can read profiles", () => assertSucceeds(getDoc(doc(db(bob), "educators/alice"))))
await check("emails in accounts/* are private", () => assertFails(getDoc(doc(db(bob), "accounts/alice"))))
await check("owner reads own account", () => assertSucceeds(getDoc(doc(db(alice), "accounts/alice"))))
await check("founder reads accounts", () => assertSucceeds(getDoc(doc(db(founder), "accounts/alice"))))
await check("cannot store someone else's email", () =>
  assertFails(setDoc(doc(db(bob), "accounts/bob"), { email: "alice@school.za" })))
await check("stores own email privately", () => assertSucceeds(setDoc(doc(db(bob), "accounts/bob"), { email: "bob@school.za" })))

await check("new profile cannot include an email", () =>
  assertFails(setDoc(doc(db(env.authenticatedContext("carol", { email: "c@x.za" })), "educators/carol"), { name: "Carol", email: "c@x.za" })))
await check("new profile cannot self-verify", () =>
  assertFails(setDoc(doc(db(env.authenticatedContext("carol", { email: "c@x.za" })), "educators/carol"), { name: "Carol", verified: true })))
await check("new profile cannot claim founder", () =>
  assertFails(setDoc(doc(db(env.authenticatedContext("carol", { email: "c@x.za" })), "educators/carol"), { name: "Carol", founder: true })))
await check("new profile with sane fields works", () =>
  assertSucceeds(setDoc(doc(db(env.authenticatedContext("carol", { email: "c@x.za" })), "educators/carol"), { name: "Carol", verified: false, school: "X" })))
await check("cannot add unknown fields", () => assertFails(updateDoc(doc(db(alice), "educators/alice"), { role: "admin" })))
await check("bio length is capped", () => assertFails(updateDoc(doc(db(alice), "educators/alice"), { bio: "x".repeat(801) })))
await check("legacy profile stays editable", () => assertSucceeds(updateDoc(doc(db(alice), "educators/alice"), { lastActiveAt: "2026-10-31T00:00:00Z" })))
await check("legacy email can be removed", () => assertSucceeds(updateDoc(doc(db(alice), "educators/alice"), { email: deleteField() })))
await check("cannot edit someone else's profile", () => assertFails(updateDoc(doc(db(bob), "educators/alice"), { bio: "hacked" })))
await check("cannot self-verify without evidence", () =>
  assertFails(updateDoc(doc(db(bob), "educators/bob"), { verified: true, badgeClaimed: true })))
await check("cannot verify with someone else's resources", () =>
  assertFails(updateDoc(doc(db(bob), "educators/bob"), { verified: true, badgeClaimed: true, badgeEvidence: ["r1", "r2", "r3"] })))
await check("cannot verify with a repeated resource", () =>
  assertFails(updateDoc(doc(db(alice), "educators/alice"), { verified: true, badgeClaimed: true, badgeEvidence: ["r1", "r1", "r2"] })))
await check("earns the badge with three own resources", () =>
  assertSucceeds(updateDoc(doc(db(alice), "educators/alice"), { verified: true, badgeClaimed: true, badgeClaimedAt: "now", badgeEvidence: ["r1", "r2", "r3"] })))
await check("founder can verify anyone", () => assertSucceeds(updateDoc(doc(db(founder), "educators/bob"), { verified: true })))

await check("download counter only moves by one", () => assertFails(updateDoc(doc(db(bob), "resources/r1"), { downloads: 9999 })))
await check("download counter +1 works", () => assertSucceeds(updateDoc(doc(db(bob), "resources/r1"), { downloads: increment(1) })))
await check("save counter needs a save marker", () => assertFails(updateDoc(doc(db(bob), "resources/r1"), { saves: increment(1) })))
await check("save marker id must match", () =>
  assertFails(setDoc(doc(db(bob), "saves/alice_r1"), { userId: "bob", resourceId: "r1" })))
await check("save then +1 works", async () => {
  await assertSucceeds(setDoc(doc(db(bob), "saves/bob_r1"), { userId: "bob", resourceId: "r1" }))
  await assertSucceeds(updateDoc(doc(db(bob), "resources/r1"), { saves: increment(1) }))
})
await check("cannot rename someone else's resource", () => assertFails(updateDoc(doc(db(bob), "resources/r1"), { title: "mine" })))
await check("cannot delete someone else's resource", () => assertFails(deleteDoc(doc(db(bob), "resources/r1"))))
await check("cannot create a resource for someone else", () =>
  assertFails(setDoc(doc(db(bob), "resources/x"), { title: "x", authorId: "alice", downloads: 0, saves: 0 })))
await check("cannot create a resource with inflated counters", () =>
  assertFails(setDoc(doc(db(bob), "resources/x"), { title: "x", authorId: "bob", downloads: 500, saves: 0 })))

await check("RSVP adds yourself", () => assertSucceeds(updateDoc(doc(db(bob), "events/e1"), { rsvpIds: arrayUnion("bob") })))
await check("RSVP cannot remove others", () => assertFails(updateDoc(doc(db(bob), "events/e1"), { rsvpIds: arrayRemove("carol") })))
await check("RSVP cannot replace the list", () => assertFails(updateDoc(doc(db(bob), "events/e1"), { rsvpIds: ["bob"] })))
await check("RSVP removes yourself", () => assertSucceeds(updateDoc(doc(db(bob), "events/e1"), { rsvpIds: arrayRemove("bob") })))

await check("cannot read others' messages", () =>
  assertFails(getDoc(doc(db(env.authenticatedContext("eve", { email: "e@x.za" })), "messages/m1"))))
await check("cannot delete the other person's message", () => assertFails(deleteDoc(doc(db(bob), "messages/m1"))))
await check("cannot fake the sender", () =>
  assertFails(setDoc(doc(db(bob), "messages/m2"), { conversationId: "alice:bob", senderId: "alice", participantIds: ["alice", "bob"], body: "x" })))
await check("cannot message into a mismatched conversation", () =>
  assertFails(setDoc(doc(db(bob), "messages/m2"), { conversationId: "alice:eve", senderId: "bob", participantIds: ["alice", "bob"], body: "x" })))
await check("sends a normal message", () =>
  assertSucceeds(setDoc(doc(db(bob), "messages/m2"), { conversationId: "alice:bob", senderId: "bob", participantIds: ["alice", "bob"], body: "hey" })))
await check("app message with attachment is accepted", () =>
  assertSucceeds(setDoc(doc(db(bob), "messages/m3"), {
    conversationId: "alice:bob", senderId: "bob", participantIds: ["alice", "bob"], body: "Shared memo.pdf",
    createdAt: "now", attachmentUrl: "https://example.test/memo.pdf", attachmentName: "memo.pdf",
    attachmentType: "application/pdf", attachmentSize: "0.3 KB",
  })))
await check("conversation id must match participants", () =>
  assertFails(setDoc(doc(db(bob), "conversations/bob:zed"), { participantIds: ["alice", "bob"], lastMessage: "x" })))
await check("conversation create works", () =>
  assertSucceeds(setDoc(doc(db(bob), "conversations/alice:bob"), { participantIds: ["alice", "bob"], lastMessage: "x", updatedAt: "now" })))
await check("cannot follow on someone's behalf", () =>
  assertFails(setDoc(doc(db(bob), "follows/alice_bob"), { followerId: "alice", followeeId: "bob" })))
await check("follow works", () =>
  assertSucceeds(setDoc(doc(db(bob), "follows/bob_alice"), { followerId: "bob", followeeId: "alice", createdAt: "now" })))
await check("meta stats only +1", () => assertFails(setDoc(doc(db(bob), "meta/stats"), { users: 999 }, { merge: true })))

await check("sign-up bumps the account counter by one", () =>
  assertSucceeds(setDoc(doc(db(bob), "meta/stats"), { hasAccounts: true, users: increment(1) }, { merge: true })))
await check("app sign-up payload is accepted", () =>
  assertSucceeds(setDoc(doc(db(env.authenticatedContext("dan", { email: "d@x.za" })), "educators/dan"), {
    name: "Dan", initials: "D", school: "S", subject: "Mathematics", bio: "", joinedYear: 2026, storageBytes: 0,
    verified: false, badgeClaimed: false, institutionLevel: "high-school", createdAt: "2026-10-31T00:00:00Z",
  })))
await check("app message batch (conversation merge) is accepted", () =>
  assertSucceeds(setDoc(doc(db(alice), "conversations/alice:bob"), {
    participantIds: ["alice", "bob"], updatedAt: "now", lastMessage: "hello",
    lastReadAt: { alice: "now" }, typingAt: { alice: deleteField() },
  }, { merge: true })))
await check("read marker update is accepted", () =>
  assertSucceeds(updateDoc(doc(db(alice), "conversations/alice:bob"), { "lastReadAt.alice": "later" })))
await check("app meetup payload is accepted", () =>
  assertSucceeds(setDoc(doc(db(bob), "events/e2"), {
    title: "Maths cluster", description: "Term 4 prep", hostId: "bob", format: "in-person",
    startsAt: "2026-11-10T10:00:00Z", location: "Durban", rsvpIds: ["bob"], createdAt: "now",
  })))

console.log("Storage")
const bytes = new Uint8Array(1024)
await check("uploads a PDF to own folder", () =>
  assertSucceeds(uploadBytes(ref(alice.storage(), "resources/alice/r/doc.pdf"), bytes, { contentType: "application/pdf" })))
await check("blocks HTML uploads", () =>
  assertFails(uploadBytes(ref(alice.storage(), "resources/alice/r/x.html"), bytes, { contentType: "text/html" })))
await check("blocks SVG uploads", () =>
  assertFails(uploadBytes(ref(alice.storage(), "resources/alice/r/x.svg"), bytes, { contentType: "image/svg+xml" })))
await check("blocks writing into another folder", () =>
  assertFails(uploadBytes(ref(bob.storage(), "resources/alice/r/doc.pdf"), bytes, { contentType: "application/pdf" })))
await check("blocks unknown paths", () =>
  assertFails(uploadBytes(ref(alice.storage(), "public/x.pdf"), bytes, { contentType: "application/pdf" })))
await check("avatars must be images", () =>
  assertFails(uploadBytes(ref(alice.storage(), "avatars/alice/a.pdf"), bytes, { contentType: "application/pdf" })))

await env.cleanup()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
