import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import ResourceCard from "@/components/resource-card"
import { useApp } from "@/store"
import type { Post } from "@/types"
import { formatWhen } from "@/utils"

export default function PostCard({
  post,
  onAuthor,
}: {
  post: Post
  onAuthor: (id: string) => void
}) {
  const { educatorById, resources } = useApp()
  const author = educatorById(post.authorId)
  const resource = post.resourceId
    ? resources.find((item) => item.id === post.resourceId)
    : undefined

  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        {author ? (
          <button type="button" onClick={() => onAuthor(author.id)}>
            <Avatar educator={author} size={40} rounded="rounded-xl" />
          </button>
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-soft font-mono text-[11px] font-semibold text-navy">
            ED
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => author && onAuthor(author.id)}
              className="text-[14px] font-semibold text-ink hover:text-navy"
            >
              {author?.name ?? "Educator"}
            </button>
            {author?.verified ? <Icons.VerifiedSeal className="h-3.5 w-3.5 text-navy" /> : null}
            <span className="font-mono text-[11px] text-muted">{formatWhen(post.createdAt)}</span>
          </div>
          {author ? (
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              {author.school} · {author.subject}
            </p>
          ) : null}
          {post.body ? (
            <p className="mt-3 text-[14px] leading-relaxed text-ink/90">{post.body}</p>
          ) : null}
        </div>
      </div>
      {resource ? (
        <div className="mt-4">
          <ResourceCard resource={resource} compact onAuthor={onAuthor} />
        </div>
      ) : null}
    </article>
  )
}
