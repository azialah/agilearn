import { describe, it, expect } from 'vitest'
import {
  computeCombinedFinalGrade,
  computeConfiguredStudentGradebook,
  computeReportedFinalGrade,
  isConfiguredGradeComplete,
  remarkFor,
  summarizeClass,
  transmuteGrade,
  type GradebookStructure,
  type Remark,
  type ScoringPolicy,
  type ScoreMap,
  type TransmutationTable,
} from './grading'
import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradingPeriod,
} from '@/types/domain'

/**
 * Acceptance test: reproduce a real Philippine college class record.
 *
 * Source: "BSCS3B CLASS RECORD (Finals).xlsx", CS-Electives 2, two class codes
 * (43214 CSP317A Lecture, 43215 CSP317L Laboratory). Every raw score and every
 * expected term grade below was extracted from the workbook by script rather
 * than typed in, so this fixture is a faithful transcription of what the
 * teacher actually recorded.
 *
 * The sheet's arithmetic, per category:
 *   raw      = SUM(item scores)
 *   maxTotal = SUM(item max points)
 *   tabScore = (raw / maxTotal) * 40 + 60      <- ScoringPolicy.floor = 60
 *   weighted = tabScore * weight
 *   term     = SUM(weighted)
 * A blank score is a zero, not an exclusion.   <- ScoringPolicy.ungradedAsZero
 *
 * If this file passes, Agilearn can replace the spreadsheet.
 */

const POLICY: ScoringPolicy = { floor: 60, ungradedAsZero: true }

function period(id: string, weight: number, position: number): GradingPeriod {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject',
    name: id,
    weight,
    position,
    starts_on: null,
    ends_on: null,
  }
}

function component(id: string, weight: number): GradeComponentRecord {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject',
    name: id,
    weight,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function category(
  id: string,
  componentId: string,
  periodId: string,
  weight: number,
): ActivityCategory {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject',
    component: 'lecture',
    grading_period_id: periodId,
    grade_component_id: componentId,
    position: 0,
    name: id,
    weight,
  }
}

function activities(
  categoryId: string,
  periodId: string,
  maxScores: number[],
): Activity[] {
  return maxScores.map((max, index) => ({
    id: `${categoryId}-${index}`,
    grading_period_id: periodId,
    category_id: categoryId,
    name: `${categoryId}-${index}`,
    max_score: max,
    date: null,
    position: index,
  }))
}

/** Column max scores, read from row 4 of each sheet. */
const LAB_MAX = {
  midHo: [150, 8],
  midQp: [100, 150],
  midEx: [100],
  finHo: [2],
  finQp: [100, 100],
  finEx: [200],
}
const LEC_MAX = {
  midAs: [30, 30],
  midQp: [50],
  midRe: [8, 8],
  midEx: [100],
  finAs: [60, 50, 50],
  finQp: [60, 20, 80],
  finRe: [10, 10],
  finEx: [100],
}

/**
 * Laboratory: Class Standing 70% (Hands-On/Machine Problems 30% +
 * Quizzes/Projects 40%) + Term Exam 30%. The sub-weights are absolute shares of
 * the term grade, so all three total 100% — which is why the exam is modelled
 * as a category rather than as a separate concept.
 */
const LAB_STRUCTURE: GradebookStructure = {
  periods: [period('midterm', 0.5, 0), period('finals', 0.5, 1)],
  components: [component('lab', 1)],
  categories: [
    category('midHo', 'lab', 'midterm', 0.3),
    category('midQp', 'lab', 'midterm', 0.4),
    category('midEx', 'lab', 'midterm', 0.3),
    category('finHo', 'lab', 'finals', 0.3),
    category('finQp', 'lab', 'finals', 0.4),
    category('finEx', 'lab', 'finals', 0.3),
  ],
  activities: [
    ...activities('midHo', 'midterm', LAB_MAX.midHo),
    ...activities('midQp', 'midterm', LAB_MAX.midQp),
    ...activities('midEx', 'midterm', LAB_MAX.midEx),
    ...activities('finHo', 'finals', LAB_MAX.finHo),
    ...activities('finQp', 'finals', LAB_MAX.finQp),
    ...activities('finEx', 'finals', LAB_MAX.finEx),
  ],
  policy: POLICY,
}

/**
 * Lecture: Class Standing 70% (Assignments/Seatworks 20% + Quizzes/Projects 30%
 * + Recitation/Attendance 20%) + Term Exam 30%.
 */
const LEC_STRUCTURE: GradebookStructure = {
  periods: [period('midterm', 0.5, 0), period('finals', 0.5, 1)],
  components: [component('lec', 1)],
  categories: [
    category('midAs', 'lec', 'midterm', 0.2),
    category('midQp', 'lec', 'midterm', 0.3),
    category('midRe', 'lec', 'midterm', 0.2),
    category('midEx', 'lec', 'midterm', 0.3),
    category('finAs', 'lec', 'finals', 0.2),
    category('finQp', 'lec', 'finals', 0.3),
    category('finRe', 'lec', 'finals', 0.2),
    category('finEx', 'lec', 'finals', 0.3),
  ],
  activities: [
    ...activities('midAs', 'midterm', LEC_MAX.midAs),
    ...activities('midQp', 'midterm', LEC_MAX.midQp),
    ...activities('midRe', 'midterm', LEC_MAX.midRe),
    ...activities('midEx', 'midterm', LEC_MAX.midEx),
    ...activities('finAs', 'finals', LEC_MAX.finAs),
    ...activities('finQp', 'finals', LEC_MAX.finQp),
    ...activities('finRe', 'finals', LEC_MAX.finRe),
    ...activities('finEx', 'finals', LEC_MAX.finEx),
  ],
  policy: POLICY,
}

const S = 'student'

function scoreMap(groups: Record<string, (number | null)[]>): ScoreMap {
  const map: ScoreMap = {}
  for (const [categoryId, values] of Object.entries(groups)) {
    values.forEach((value, index) => {
      map[`${categoryId}-${index}`] = { [S]: value }
    })
  }
  return map
}

/**
 * The registrar's numeric-equivalent table, seeded by migration 0037. Bands sit
 * on half-points so an unrounded percentage looks up the same as ROUND(p, 0).
 */
const CHED_TABLE: TransmutationTable = [
  { minPercent: 0, maxPercent: 74.49, transmutedGrade: 5.0 },
  { minPercent: 74.5, maxPercent: 75.49, transmutedGrade: 3.0 },
  { minPercent: 75.5, maxPercent: 76.49, transmutedGrade: 2.9 },
  { minPercent: 76.5, maxPercent: 77.49, transmutedGrade: 2.8 },
  { minPercent: 77.5, maxPercent: 78.49, transmutedGrade: 2.7 },
  { minPercent: 78.5, maxPercent: 79.49, transmutedGrade: 2.6 },
  { minPercent: 79.5, maxPercent: 80.49, transmutedGrade: 2.5 },
  // 80.50-88.49 is deliberately absent, matching migration 0037: the source
  // table had no rows for 81-88 and inventing eight grade values is not
  // acceptable in a table that issues real grades.
  { minPercent: 88.5, maxPercent: 89.49, transmutedGrade: 1.6 },
  { minPercent: 89.5, maxPercent: 90.49, transmutedGrade: 1.5 },
  { minPercent: 90.5, maxPercent: 92.49, transmutedGrade: 1.4 },
  { minPercent: 92.5, maxPercent: 94.49, transmutedGrade: 1.3 },
  { minPercent: 94.5, maxPercent: 96.49, transmutedGrade: 1.2 },
  { minPercent: 96.5, maxPercent: 98.49, transmutedGrade: 1.1 },
  { minPercent: 98.5, maxPercent: 100, transmutedGrade: 1.0 },
]

/**
 * ClassCode CSP313L(Lab)!W12 should hold =SUM(S12:V12) like every other row.
 * It holds a typed constant 0 instead, while S12 holds a numeric 1 — so the
 * sheet scores this student's finals hands-on as zero and floors the category
 * to 60. It is the only overwritten formula in either sheet. Agilearn computes
 * from the score, so it reports the value the sheet should have shown.
 */
const SHEET_FORMULA_BUG = 'ESTRELLADO, XYMER, PAZ'
const ESTRELLADO_CORRECTED_FIN = 72.8

interface Fixture {
  name: string
  lab: {
    midHo: (number | null)[]
    midQp: (number | null)[]
    midEx: (number | null)[]
    finHo: (number | null)[]
    finQp: (number | null)[]
    finEx: (number | null)[]
    sheetMid: number | null
    sheetFin: number | null
  }
  lec: {
    midAs: (number | null)[]
    midQp: (number | null)[]
    midRe: (number | null)[]
    midEx: (number | null)[]
    finAs: (number | null)[]
    finQp: (number | null)[]
    finRe: (number | null)[]
    finEx: (number | null)[]
    sheetMid: number | null
    sheetFin: number | null
  }
}

const CLASS: Fixture[] = [
  {
    name: 'ASORO, JOHN LAWRENCE, TRIUMFANTE',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 90],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 73.2,
    },
    lec: {
      midAs: [28, 28],
      midQp: [37],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 76.34666666666666,
      sheetFin: 60,
    },
  },
  {
    name: 'BORLADO, KLARISSE ANNE, null',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 85],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 72.8,
    },
    lec: {
      midAs: [28, 26],
      midQp: [22],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 72.48,
      sheetFin: 60,
    },
  },
  {
    name: 'CABANIZAS, DENNIEL JOHN, PIGA',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 60],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 64.8,
    },
    lec: {
      midAs: [28, 26],
      midQp: [50],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 79.2,
      sheetFin: 60,
    },
  },
  {
    name: 'CALIGUIA, MICHAEL ANGELO, MENDEZ',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 90],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 67.2,
    },
    lec: {
      midAs: [28, 29],
      midQp: [45],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 78.4,
      sheetFin: 60,
    },
  },
  {
    name: 'CARLOS, JEAN LANIEROD, V',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 95],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 67.6,
    },
    lec: {
      midAs: [28, 27],
      midQp: [39],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 76.69333333333333,
      sheetFin: 60,
    },
  },
  {
    name: 'CASAUL, DENCH GREGORY ZHYLLE, PASCUA',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 70],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 65.6,
    },
    lec: {
      midAs: [27, 27],
      midQp: [24],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 72.96000000000001,
      sheetFin: 60,
    },
  },
  {
    name: 'DIAZ, LUISE FLORENZ , JACOB',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 80],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 72.4,
    },
    lec: {
      midAs: [26, 23],
      midQp: [34],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 74.69333333333333,
      sheetFin: 60,
    },
  },
  {
    name: 'ESTRELLADO, XYMER, PAZ',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 85],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 66.8,
    },
    lec: {
      midAs: [28, 28],
      midQp: [14],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 70.82666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'FRANCIA, MATTHEW, CIRIACO',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 85],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 66.8,
    },
    lec: {
      midAs: [28, 28],
      midQp: [36],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 76.10666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'GLODOVIZA, JON ZEPH, RIESGO',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 95],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 73.6,
    },
    lec: {
      midAs: [28, 28],
      midQp: [34],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 75.62666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'INOCENCIO, ROBERT,',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 70],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 71.6,
    },
    lec: {
      midAs: [27, 24],
      midQp: [18],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 71.12,
      sheetFin: 60,
    },
  },
  {
    name: 'LAGUATAN, JUSTINE, CHUA',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 95],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 73.6,
    },
    lec: {
      midAs: [27, 28],
      midQp: [29],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 74.29333333333334,
      sheetFin: 60,
    },
  },
  {
    name: 'MALANG , RITCHELL, COSTALES',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 60],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 64.8,
    },
    lec: {
      midAs: [27, 29],
      midQp: [24],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 73.22666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'NAVARRO, CARL NICOLAS, MAMARIL',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 70],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 65.6,
    },
    lec: {
      midAs: [28, 28],
      midQp: [41],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 77.30666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'NOTARIO, NOEL JUSTIN, FRAYCO',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 60],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 70.8,
    },
    lec: {
      midAs: [28, 28],
      midQp: [31],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 74.90666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'PARAZO, GAIL, MIRAL',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 90],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 73.2,
    },
    lec: {
      midAs: [29, 27],
      midQp: [45],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 78.26666666666667,
      sheetFin: 60,
    },
  },
  {
    name: 'RELOPEZ, THOMEN JEILO, REYES',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [0],
      finQp: [null, 80],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 66.4,
    },
    lec: {
      midAs: [28, 21],
      midQp: [48],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 78.05333333333333,
      sheetFin: 60,
    },
  },
  {
    name: 'RONQUILLO , CRISTINA , EMANEL',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 90],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 73.2,
    },
    lec: {
      midAs: [28, 23],
      midQp: [39],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 76.16,
      sheetFin: 60,
    },
  },
  {
    name: 'UY, RYAN DENIEL, LAO',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 80],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 72.4,
    },
    lec: {
      midAs: [28, 27],
      midQp: [25],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 73.33333333333333,
      sheetFin: 60,
    },
  },
  {
    name: 'VILLAFLORES , JUSTIN, MARPA',
    lab: {
      midHo: [130, 4],
      midQp: [100, 130],
      midEx: [null],
      finHo: [1],
      finQp: [null, 85],
      finEx: [null],
      sheetMid: 84.89721518987342,
      sheetFin: 72.8,
    },
    lec: {
      midAs: [27, 26],
      midQp: [18],
      midRe: [null, null],
      midEx: [null],
      finAs: [null, null, null],
      finQp: [null, null, null],
      finRe: [null, null],
      finEx: [null],
      sheetMid: 71.38666666666667,
      sheetFin: 60,
    },
  },
]

function labScoresFor(student: Fixture): ScoreMap {
  return scoreMap({
    midHo: student.lab.midHo,
    midQp: student.lab.midQp,
    midEx: student.lab.midEx,
    finHo: student.lab.finHo,
    finQp: student.lab.finQp,
    finEx: student.lab.finEx,
  })
}

function lecScoresFor(student: Fixture): ScoreMap {
  return scoreMap({
    midAs: student.lec.midAs,
    midQp: student.lec.midQp,
    midRe: student.lec.midRe,
    midEx: student.lec.midEx,
    finAs: student.lec.finAs,
    finQp: student.lec.finQp,
    finRe: student.lec.finRe,
    finEx: student.lec.finEx,
  })
}

describe('CS-Electives 2 class record (BSCS-3B)', () => {
  it('has the whole roster', () => {
    expect(CLASS).toHaveLength(20)
  })

  describe.each(CLASS)('$name', (student) => {
    const lab = computeConfiguredStudentGradebook(LAB_STRUCTURE, labScoresFor(student), S)
    const lec = computeConfiguredStudentGradebook(LEC_STRUCTURE, lecScoresFor(student), S)

    it('reproduces the LAB midterm grade', () => {
      expect(lab.perPeriod.midterm.lab).toBeCloseTo(student.lab.sheetMid as number, 10)
    })

    it('reproduces the LAB tentative final grade', () => {
      const expected =
        student.name === SHEET_FORMULA_BUG
          ? ESTRELLADO_CORRECTED_FIN
          : (student.lab.sheetFin as number)
      expect(lab.perPeriod.finals.lab).toBeCloseTo(expected, 10)
    })

    it('reproduces the LEC midterm grade', () => {
      expect(lec.perPeriod.midterm.lec).toBeCloseTo(student.lec.sheetMid as number, 10)
    })

    it('reproduces the LEC tentative final grade', () => {
      expect(lec.perPeriod.finals.lec).toBeCloseTo(student.lec.sheetFin as number, 10)
    })
  })

  it('flags the one student the sheet miscomputed', () => {
    const student = CLASS.find((entry) => entry.name === SHEET_FORMULA_BUG)
    expect(student).toBeDefined()
    // The sheet says 66.8 because its SUM was overwritten with a constant 0.
    expect(student?.lab.sheetFin).toBeCloseTo(66.8, 10)
    // The score of 1 out of 2 really is there, so the honest grade is higher.
    expect(ESTRELLADO_CORRECTED_FIN).toBeGreaterThan(student?.lab.sheetFin as number)
  })

  describe('combined final grade (Lecture 40% / Laboratory 60%)', () => {
    // Combining per term and then averaging terms — what the sheet does — is
    // algebraically identical to averaging each subject's terms and then
    // combining, because both are the same linear map. Agilearn does the latter.
    function combinedFor(student: Fixture) {
      return computeCombinedFinalGrade([
        {
          grade: computeConfiguredStudentGradebook(
            LEC_STRUCTURE,
            lecScoresFor(student),
            S,
          ).final,
          weight: 0.4,
        },
        {
          grade: computeConfiguredStudentGradebook(
            LAB_STRUCTURE,
            labScoresFor(student),
            S,
          ).final,
          weight: 0.6,
        },
      ])
    }

    it('matches the sheet for the first student', () => {
      // Sheet: MIDTERM 81.477, TENTATIVE FINAL 67.92, COMPUTED FINAL 75.
      const expected = (81.47699578059071 + 67.92) / 2
      // Two decimals, not more: each subject's final is round2'd before the
      // combination and the result is round2'd again, where the sheet carries
      // full precision the whole way. The gap is ~0.0015 — far below the
      // half-point band boundaries the numeric equivalent is looked up on, and
      // far below the whole number the registrar is given.
      expect(combinedFor(CLASS[0])).toBeCloseTo(expected, 2)
    })

    it('rounds to the whole number the registrar receives', () => {
      // The sheet's COMPUTED FINAL GRADE is ROUND(AVERAGE(midterm, finals), 0).
      expect(Math.round(combinedFor(CLASS[0]) as number)).toBe(75)
    })

    it('produces a grade for every student on the roster', () => {
      for (const student of CLASS) {
        expect(combinedFor(student)).not.toBeNull()
      }
      // The sheet dropped one: SummaryOfGrades carries 19 rows while both class
      // sheets carry 20. DIAZ has a complete record and no final grade at all.
      expect(CLASS).toHaveLength(20)
    })
  })

  describe('numeric equivalent and remarks', () => {
    it('reads the registrar table, not the built-in CHED formula', () => {
      // The built-in linear formula reports 89% as 2.00; the table says 1.60.
      expect(transmuteGrade(89, CHED_TABLE)).toBe(1.6)
      expect(transmuteGrade(75, CHED_TABLE)).toBe(3.0)
      expect(transmuteGrade(74, CHED_TABLE)).toBe(5.0)
      expect(transmuteGrade(100, CHED_TABLE)).toBe(1.0)
    })

    it('refuses to invent a grade for the 81-88 hole in the sheet', () => {
      // The sheet's VLOOKUP(..., TRUE) silently returned 2.5 across this whole
      // range, because the rows were missing. Reporting no equivalent is the
      // honest answer until the registrar's real values are entered; the engine
      // treats an uncovered percentage as "no grade yet" by design.
      expect(transmuteGrade(81, CHED_TABLE)).toBeNull()
      expect(transmuteGrade(85, CHED_TABLE)).toBeNull()
      expect(transmuteGrade(88, CHED_TABLE)).toBeNull()
      // The transcribed bands on either side still resolve.
      expect(transmuteGrade(80, CHED_TABLE)).toBe(2.5)
      expect(transmuteGrade(89, CHED_TABLE)).toBe(1.6)
    })

    it('routes higher_education through the table when one is set', () => {
      const scores = labScoresFor(CLASS[0])
      const percent = computeConfiguredStudentGradebook(LAB_STRUCTURE, scores, S).final
      expect(
        computeReportedFinalGrade(LAB_STRUCTURE, scores, S, {
          gradingTemplate: 'higher_education',
          table: CHED_TABLE,
        }),
      ).toBe(transmuteGrade(percent, CHED_TABLE))
    })

    it('marks a student with unrecorded exams INCOMPLETE, not FAILED', () => {
      const complete = isConfiguredGradeComplete(LAB_STRUCTURE, labScoresFor(CLASS[0]), S)
      // Neither exam was ever recorded for this class.
      expect(complete).toBe(false)
      expect(remarkFor(73.2, complete)).toBe('INCOMPLETE')
    })

    it('applies the 75% passing mark once every score is in', () => {
      expect(remarkFor(75, true)).toBe('PASSED')
      expect(remarkFor(74.99, true)).toBe('FAILED')
      expect(remarkFor(null, true)).toBe('INCOMPLETE')
    })

    it('tallies the class the way the sheet does', () => {
      const remarks: Remark[] = ['PASSED', 'PASSED', 'FAILED', 'INCOMPLETE']
      expect(summarizeClass(remarks)).toEqual({
        count: 4,
        passed: 2,
        failed: 1,
        incomplete: 1,
      })
    })
  })
})
