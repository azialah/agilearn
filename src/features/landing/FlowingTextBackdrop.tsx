import { useReducedMotion } from 'motion/react'

/*
 * Adapted from a Wispr-style flowing-text hero: faint copy runs along a curved
 * path and drifts sideways as a marquee. The interactive bezier editor from the
 * original is intentionally dropped — this is a static, decorative backdrop.
 */
const PATH_D =
  'M0.6 50.9C17.5 143.3 97.9 293.1 284.5 353.5C440.8 399.1 583.8 294.1 500.6 184.7C417.4 75.4 238.2 282.1 499.3 441.7C551.9 477.8 817.5 561.3 1046.4 565.2'

const FLOW_TEXT =
  'grades   attendance   modules   classrooms   rosters   weighted finals   lesson plans   slideshow   '.repeat(
    6,
  )

export function FlowingTextBackdrop() {
  const reduce = useReducedMotion()

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <svg
        viewBox="0 0 1048 594"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="absolute left-1/2 top-1/2 h-[130%] w-[150%] -translate-x-1/2 -translate-y-1/2"
      >
        <path id="flow-curve" d={PATH_D} fill="none" />
        <text
          className="fill-[var(--color-ink-faint)] font-[family-name:var(--font-mono)]"
          style={{ fontSize: 15 }}
          opacity={0.16}
        >
          {/* startOffset (not the text's x) is what positions textPath content,
              so the marquee must animate startOffset. The copy repeats every
              ~900px, so shifting by one unit loops seamlessly. */}
          <textPath href="#flow-curve" className="[baseline-shift:-20%]">
            {FLOW_TEXT}
            {!reduce && (
              <animate
                attributeName="startOffset"
                dur="36s"
                values="0; -900"
                repeatCount="indefinite"
              />
            )}
          </textPath>
        </text>
      </svg>
    </div>
  )
}
