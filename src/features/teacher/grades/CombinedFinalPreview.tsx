import {
  computeCombinedFinalGrade,
  computeConfiguredStudentGradebook,
} from '@/lib/grading'
import type {
  SubjectGradebook,
  SubjectGradeCombinationWithItems,
} from '@/lib/queries/grades'
import { studentFullName, type CourseSubject, type Student } from '@/types/domain'
import { Skeleton } from '@/components/ui/Skeleton'

export function CombinedFinalPreview({
  combinations,
  subjects,
  gradebooks,
  loading,
  students,
}: {
  combinations: SubjectGradeCombinationWithItems[]
  subjects: CourseSubject[]
  gradebooks: Map<string, SubjectGradebook>
  loading: boolean
  students: Student[]
}) {
  if (loading) return <Skeleton className="h-44 w-full" />

  const subjectName = (id: string) =>
    subjects.find((subject) => subject.id === id)?.name ?? 'Subject'

  return (
    <section className="space-y-3 rounded-lg border border-(--color-border) p-4">
      <div>
        <h3 className="font-medium">Combined final preview</h3>
        <p className="text-sm text-(--color-ink-faint)">
          A reported final is shown only when every selected subject has a valid final.
        </p>
      </div>
      {combinations.map((combination) => (
        <div
          key={combination.id}
          className="overflow-x-auto rounded-md border border-(--color-border)"
        >
          <table className="w-full min-w-130 text-sm">
            <thead className="bg-(--color-surface-2) text-left text-xs text-(--color-ink-faint)">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                {combination.items.map((item) => (
                  <th
                    key={item.course_subject_id}
                    className="px-3 py-2 text-right font-medium"
                  >
                    {subjectName(item.course_subject_id)} ({item.weight * 100}%)
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">{combination.name}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const grades = combination.items.map((item) => {
                  const gradebook = gradebooks.get(item.course_subject_id)
                  return gradebook
                    ? computeConfiguredStudentGradebook(
                        gradebook.structure,
                        gradebook.scores,
                        student.id,
                      ).final
                    : null
                })
                const final = computeCombinedFinalGrade(
                  combination.items.map((item, index) => ({
                    grade: grades[index],
                    weight: item.weight,
                  })),
                )
                return (
                  <tr key={student.id} className="border-t border-(--color-border)">
                    <td className="px-3 py-2 font-medium">{studentFullName(student)}</td>
                    {grades.map((grade, index) => (
                      <td
                        key={combination.items[index].course_subject_id}
                        className="px-3 py-2 text-right tabular-nums"
                      >
                        {grade == null ? '—' : grade.toFixed(2)}
                      </td>
                    ))}
                    <td className="bg-(--color-accent-500)/10 px-3 py-2 text-right font-semibold tabular-nums text-(--color-accent-300)">
                      {final == null ? '—' : final.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}
