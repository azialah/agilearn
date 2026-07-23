import { motion, useReducedMotion, type Variants } from 'motion/react'
import { FileUp, ShieldCheck } from 'lucide-react'
import { ClassroomIcon, UsersIcon } from '@/components/icons'

const ITEMS = [
  {
    icon: ClassroomIcon,
    title: 'Classrooms & rosters',
    body: 'Organize every section, course, and student roster in one tidy place.',
  },
  {
    icon: FileUp,
    title: 'Import & export',
    body: 'Bring rosters in from Excel, and export grades to PDF or a spreadsheet.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Row-level security scopes every teacher to only their own classes.',
  },
  {
    icon: UsersIcon,
    title: 'Admin & roles',
    body: 'Admins manage users and roles; teachers stay focused on teaching.',
  },
]

/** Secondary capabilities grid — complements the primary four-tool section. */
export function MoreFeatures() {
  const reduce = useReducedMotion()
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  }
  const card: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a teaching term needs
        </h2>
        <p className="mt-3 text-base text-(--color-ink-muted)">
          The details that make a whole semester run, from the first roster import to the
          privacy that keeps your classes yours.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {ITEMS.map((item) => {
          const IconComp = item.icon
          return (
            <motion.div
              key={item.title}
              variants={card}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group rounded-lg border border-(--color-border) bg-(--color-surface-1)/95 p-5"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-(--color-accent-500)/15 text-xl text-(--color-accent-300) transition-colors group-hover:bg-(--color-accent-500)/25">
                <IconComp className="size-5" />
              </div>
              <h3 className="font-display font-medium text-(--color-ink)">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm text-(--color-ink-muted)">{item.body}</p>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
