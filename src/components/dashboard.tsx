import { CoursifyMark } from "@/components/logo"
import EducatorCard from "@/components/educator-card"
import Icons from "@/components/icons"
import PostCard from "@/components/post-card"
import { useApp } from "@/store"
import { firstName, followButtonLabel, formatCount, rankEducatorSearchResults, todayLabel } from "@/utils"
import { useMemo, useState, type FormEvent } from "react"

export default function Dashboard({
  query,
  onAuthor,
  onUpload,
  onDiscover,
  onMessage,
}: {
  query: string
  onAuthor: (id: string) => void
  onUpload: () => void
  onDiscover: () => void
  onMessage: (id: string) => void
}) {
  const {
    currentUser,
    educators,
    myResources,
    feedPosts,
    followingCount,
    followerCount,
    followBackSuggestions,
    publishPost,
    isFollowing,
    followsYou,
    toggleFollow,
    notify,
  } = useApp()
  const [body, setBody] = useState("")
  const [resourceId, setResourceId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const needle = query.trim().toLowerCase()
  const posts = useMemo(
    () =>
      feedPosts.filter((post) => {
        if (!needle) return true
        return post.body.toLowerCase().includes(needle)
      }),
    [feedPosts, needle],
  )

  const colleagueMatches = useMemo(() => {
    if (needle.length < 2) return []
    return rankEducatorSearchResults(educators, query, currentUser?.id).slice(0, 6)
  }, [currentUser?.id, educators, needle, query])

  const suggestions = useMemo(() => {
    const pool = educators.filter((educator) => educator.id !== currentUser?.id)
    const pending = followBackSuggestions
    const rest = pool.filter((educator) => !pending.some((item) => item.id === educator.id))
    return [...pending, ...rest].slice(0, 4)
  }, [currentUser?.id, educators, followBackSuggestions])

  async function handlePost(event: FormEvent) {
    event.preventDefault()
    const result = await publishPost(body, resourceId || undefined)
    if (result) {
      setError(result)
      return
    }
    setBody("")
    setResourceId("")
    setError(null)
  }

  const stats = [
    {
      label: "Following",
      value: String(currentUser ? followingCount(currentUser.id) : 0),
      delta: "Colleagues you follow",
    },
    {
      label: "Followers",
      value: String(currentUser ? followerCount(currentUser.id) : 0),
      delta: "Educators following you",
    },
    {
      label: "Your uploads",
      value: String(myResources.length),
      delta: "In your library",
    },
    {
      label: "Feed posts",
      value: formatCount(posts.length),
      delta: "From you and people you follow",
    },
  ]

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <section className="overflow-hidden rounded-2xl border border-line bg-navy text-white">
        <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div
            className="pointer-events-none absolute -right-10 -top-16 hidden h-64 w-64 opacity-[0.08] lg:block"
            aria-hidden="true"
          >
            <CoursifyMark className="h-full w-full [&_path]:!fill-white" />
          </div>
          <div className="relative max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
              {todayLabel()} · Academic feed
            </p>
            <h1 className="mt-3 font-display text-[1.65rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-3xl lg:text-[34px]">
              Welcome back, {currentUser ? firstName(currentUser.name) : "educator"}.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Follow colleagues, share curriculum notes, and keep a verified teaching profile in one
              workspace for high school and university educators.
            </p>
          </div>
          <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={onDiscover}
              className="min-h-11 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-white/90"
            >
              Discover colleagues
            </button>
            <button
              type="button"
              onClick={onUpload}
              className="min-h-11 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Upload resource
            </button>
          </div>
        </div>
      </section>

      {colleagueMatches.length > 0 ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold text-ink">Colleague search</h2>
            <button type="button" onClick={onDiscover} className="text-[12px] font-semibold text-navy">
              Open Discover
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {colleagueMatches.map((educator) => (
              <EducatorCard
                key={educator.id}
                educator={educator}
                onProfile={onAuthor}
                onMessage={onMessage}
              />
            ))}
          </div>
        </section>
      ) : null}

      {followBackSuggestions.length > 0 ? (
        <section className="mt-6 rounded-xl border border-navy/20 bg-navy-soft p-5">
          <h2 className="font-display text-[15px] font-bold text-ink">New followers</h2>
          <p className="mt-1 text-sm text-muted">
            Colleagues followed you. Follow back to connect and see their updates in your feed.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {followBackSuggestions.slice(0, 4).map((educator) => {
              const following = isFollowing(educator.id)
              const theyFollowYou = followsYou(educator.id)
              return (
                <article
                  key={educator.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                >
                  <button type="button" onClick={() => onAuthor(educator.id)} className="min-w-0 text-left">
                    <p className="truncate text-[14px] font-semibold text-ink">{educator.name}</p>
                    <p className="truncate text-[12px] text-muted">{educator.school || educator.subject}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleFollow(educator.id)
                      notify(`Following ${educator.name}`)
                    }}
                    className="shrink-0 rounded-lg bg-navy px-3 py-2 text-[12px] font-semibold text-white hover:bg-navy-hover"
                  >
                    {followButtonLabel(following, theyFollowYou)}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-line bg-surface p-4 sm:p-5 transition-colors hover:border-line-strong"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{item.label}</p>
            <p className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-ink">{item.value}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-muted">
              <Icons.Trend className="h-3.5 w-3.5 text-navy" />
              {item.delta}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <form onSubmit={handlePost} className="rounded-xl border border-line bg-surface p-5">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Share with colleagues you follow
              </span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-navy"
                placeholder="A note on a lesson, a question for colleagues, or a resource you just published."
              />
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <select
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-line bg-canvas px-3 text-sm text-ink sm:w-auto sm:max-w-full"
              >
                <option value="">No attached resource</option>
                {myResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover sm:w-auto"
              >
                <Icons.Send className="h-4 w-4" />
                Post
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-[#8a3b32]">{error}</p> : null}
          </form>

          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onAuthor={onAuthor} />
            ))}
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-surface p-12 text-center">
                <p className="font-display text-[15px] font-semibold text-ink">The feed is quiet.</p>
                <p className="mt-1 text-sm text-muted">
                  Follow colleagues in Discover, or post an update from your own classroom.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold text-ink">Discover colleagues</h2>
              <button type="button" onClick={onDiscover} className="text-[12px] font-semibold text-navy">
                Directory
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {suggestions.map((educator) => (
                <EducatorCard
                  key={educator.id}
                  educator={educator}
                  onProfile={onAuthor}
                  onMessage={onMessage}
                />
              ))}
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted">
                  No other educators have joined yet. Invite a colleague to create an account.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export { default as ResourceFeed } from "@/components/resource-feed"
