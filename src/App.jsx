import { useState, useMemo, useRef, Component } from 'react'
import {
  ArrowUpRight, Bell, Bot, Check, ChevronDown, ChevronUp, ChevronRight, CircleHelp,
  Clock3, Droplets, Dumbbell, Edit3, Flame, HeartPulse, Home, Info, LayoutGrid,
  Menu, Moon, MoreHorizontal, Pencil, Pill, Plus, Send, Settings, ShieldCheck, Sparkles, Target, TrendingUp, UserRound,
  Utensils, X, Zap, AlertCircle, CheckCircle2, Trash2, Clock, Brain, Smile, AlertTriangle, Calendar
} from 'lucide-react'
import './App.css'

const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date())

/* ==========================================================================
   REACT ERROR BOUNDARY (Prevents White Screen Crashes & Preserves Nav)
   ========================================================================== */

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught rendering error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="card" style={{ padding: '32px', maxWidth: '520px', margin: '40px auto' }}>
            <AlertTriangle size={40} style={{ color: '#c25555', marginBottom: '14px' }} />
            <h2 style={{ font: '700 20px Manrope', color: '#1e352b' }}>Something went wrong in this view</h2>
            <p className="muted" style={{ margin: '8px 0 20px', fontSize: '12px' }}>
              {this.state.error?.toString() || 'An error occurred while loading this view.'}
            </p>
            <button
              className="primary-button"
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
            >
              Reset View
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/* ==========================================================================
   1. THREE CORE DATA CONCEPTS & TEMPLATES
   A. Actual Daily Data (empty by default for a new day)
   B. Temporary Defaults (quantity preferences)
   C. Permanent Routine / Schedule (saved recurring timings)
   ========================================================================== */

export const createEmptyDailyLog = () => ({
  sleep: {
    bedtime: '',
    sleepStart: '',
    wakeTime: '',
    quality: 0, // 1-5
    awakenings: '', // 'None', '1', '2', '3+', "Don't know"
    feltRested: '', // 'Yes', 'Somewhat', 'No'
  },
  meals: [], // Array of meal objects: { id, type, time, food, tags: [], quality }
  hydration: {
    liters: null,
    glasses: null,
    didNotTrack: false,
  },
  activities: [], // Array of activity objects: { id, type, startTime, durationMinutes }
  sedentary: '', // '<2 hours', '2–4 hours', '4–6 hours', '6–8 hours', '8+ hours'
  medications: [], // Array of medication objects: { id, name, scheduledTime, status }
  dailyRoutineBlocks: [], // Array of time blocks: { id, title, startTime, endTime }
  wellbeing: {
    mood: 0, // 1-5
    energy: 0, // 1-5
    stress: 0, // 1-5
    overallDay: 0, // 1-5
  },
  lifestyle: {
    caffeineCups: 0,
    caffeineSource: 'None',
    smokingType: 'None',
    smokingQuantity: 0,
    alcoholDrinks: 0,
    workoutType: 'No workout',
    workoutDuration: 0,
    workoutIntensity: 'Moderate',
    screenTimeHours: 0,
    outdoorTimeHours: 0,
    steps: 0,
  },
  healthEvent: {
    unusual: false,
    type: 'Nothing unusual',
    whatHappened: '',
    time: '',
  },
})

export function isDailyLogEmpty(log) {
  if (!log) return true
  const sleep = log.sleep || {}
  const meals = log.meals || []
  const activities = log.activities || []
  const hydration = log.hydration || {}
  const wellbeing = log.wellbeing || {}
  const healthEvent = log.healthEvent || {}
  const lifestyle = log.lifestyle || {}

  return (
    !sleep.bedtime &&
    !sleep.wakeTime &&
    !sleep.quality &&
    !sleep.awakenings &&
    !sleep.feltRested &&
    meals.length === 0 &&
    activities.length === 0 &&
    !hydration.liters &&
    !hydration.glasses &&
    !hydration.didNotTrack &&
    !log.sedentary &&
    !wellbeing.mood &&
    !wellbeing.energy &&
    !wellbeing.stress &&
    !wellbeing.overallDay &&
    !healthEvent.unusual &&
    !lifestyle.caffeineCups &&
    lifestyle.caffeineSource === 'None' &&
    lifestyle.smokingType === 'None' &&
    !lifestyle.smokingQuantity &&
    !lifestyle.alcoholDrinks &&
    lifestyle.workoutType === 'No workout' &&
    !lifestyle.workoutDuration &&
    !lifestyle.screenTimeHours &&
    !lifestyle.outdoorTimeHours &&
    !lifestyle.steps
  )
}

export function calculateLifestyleAge(log) {
  if (!log) return 35

  const scoreInfo = calculateDailyScoreAndConfidence(log)
  const score = scoreInfo.score || 0

  let age = 38
  if (score >= 85) age = 24
  else if (score >= 75) age = 27
  else if (score >= 65) age = 31
  else if (score >= 55) age = 35
  else if (score >= 45) age = 40
  else if (score >= 35) age = 45
  else age = 52

  const sleep = log.sleep || {}
  const meals = log.meals || []
  const activities = log.activities || []
  const hydration = log.hydration || {}
  const sedentary = log.sedentary || ''
  const lifestyle = log.lifestyle || {}

  if (sleep.quality >= 4) age -= 2
  if (sleep.quality <= 2) age += 3
  if (meals.length >= 3) age -= 2
  if (activities.length >= 1) age -= 2
  if (hydration.liters && hydration.liters >= 2) age -= 2
  if (sedentary && sedentary.includes('8+')) age += 4
  if (sedentary && sedentary.includes('2–4')) age -= 1
  if (lifestyle.workoutType && lifestyle.workoutType !== 'No workout' && Number(lifestyle.workoutDuration || 0) >= 30) age -= 2
  if ((Number(lifestyle.screenTimeHours) || 0) > 6) age += 4
  if ((Number(lifestyle.outdoorTimeHours) || 0) >= 1) age -= 2
  if ((Number(lifestyle.caffeineCups) || 0) >= 4) age += 3
  if (lifestyle.smokingType && lifestyle.smokingType !== 'None') age += 4

  return Math.max(20, Math.min(60, age))
}

export const defaultDailyDefaults = {
  configured: false,
  mealsCount: 3,
  meals: [
    { id: 'def-m1', type: 'Breakfast', description: '', duration: '' },
    { id: 'def-m2', type: 'Lunch', description: '', duration: '' },
    { id: 'def-m3', type: 'Dinner', description: '', duration: '' },
  ],
  snacksCount: 1,
  snacks: [
    { id: 'def-s1', name: 'Afternoon Snack', description: '' },
  ],
  exercise: {
    usuallyExercise: 'Yes',
    frequency: '3–4 days/week',
    workoutTypes: ['Walking'],
    duration: '30 min',
  },
  hydration: {
    mode: 'Liters',
    amount: 2.0,
  },
  medicationsCount: 0,
  medications: [],
  typicalSleepDuration: '7h 30m',
  sedentary: {
    activityLevel: 'Moderately active',
    typicalSedentaryHours: '6 hours',
  },
  wellbeingDefaults: {
    mood: 0,
    stress: 0,
    energy: 0,
  },
  healthyBehaviors: ['Walking', 'Breaks'],
}

export const defaultRoutineSchedule = {
  configured: false,
  sleepSchedule: {
    bedtime: '11:30 PM',
    wakeTime: '07:00 AM',
  },
  mealSchedule: [
    { id: 'm1', type: 'Breakfast', time: '08:00 AM' },
    { id: 'm2', type: 'Lunch', time: '01:30 PM' },
    { id: 'm3', type: 'Dinner', time: '08:30 PM' },
  ],
  medicationSchedule: [],
  weekdayWeekendDifferent: false,
  weekendMealSchedule: [
    { id: 'wm1', type: 'Breakfast', time: '09:30 AM' },
    { id: 'wm2', type: 'Lunch', time: '02:00 PM' },
    { id: 'wm3', type: 'Dinner', time: '09:00 PM' },
  ],
}

// Sample Populated Day for Demo Scenarios
export const demoPopulatedDay = {
  sleep: {
    bedtime: '11:45 PM',
    sleepStart: '12:10 AM',
    wakeTime: '06:45 AM',
    quality: 3,
    awakenings: '2',
    feltRested: 'Somewhat',
  },
  meals: [
    { id: '1', type: 'Breakfast', time: '08:15 AM', food: 'Oatmeal & black coffee', tags: ['Home-cooked'], quality: 4 },
    { id: '2', type: 'Lunch', time: '01:45 PM', food: 'Grilled chicken salad', tags: ['Home-cooked', 'Protein-rich'], quality: 5 },
    { id: '3', type: 'Dinner', time: '08:45 PM', food: 'Pasta & side salad', tags: ['Restaurant'], quality: 3 },
  ],
  hydration: {
    liters: 1.8,
    glasses: 7,
    didNotTrack: false,
  },
  activities: [
    { id: 'act1', type: 'Walking', startTime: '05:30 PM', durationMinutes: 35 },
  ],
  sedentary: '6–8 hours',
  medications: [
    { id: 'm1', name: 'Medicine A', scheduledTime: '08:00 AM', status: 'Taken' },
    { id: 'm2', name: 'Medicine B', scheduledTime: '08:00 PM', status: 'Taken late' },
  ],
  dailyRoutineBlocks: [
    { id: 'b1', title: 'Work Session', startTime: '09:00 AM', endTime: '01:00 PM' },
    { id: 'b2', title: 'Study', startTime: '03:00 PM', endTime: '05:00 PM' },
  ],
  wellbeing: {
    mood: 3,
    energy: 3,
    stress: 4,
    overallDay: 3,
  },
  healthEvent: {
    unusual: true,
    type: 'Headache',
    whatHappened: 'Mild throbbing pain around temples starting in the late afternoon.',
    time: '04:15 PM',
  },
}

/* ==========================================================================
   2. SAFE HELPER CALCULATIONS: TIME, DEVIATIONS, SCORE & CONFIDENCE
   ========================================================================== */

export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const clean = timeStr.trim().toUpperCase()
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)
  if (!match) return null

  let hrs = parseInt(match[1], 10)
  const mins = parseInt(match[2], 10)
  const period = match[3]

  if (period === 'PM' && hrs < 12) hrs += 12
  if (period === 'AM' && hrs === 12) hrs = 0

  return hrs * 60 + mins
}

export function calculateSleepDurationText(bedtime, wakeTime) {
  const bedMins = parseTimeToMinutes(bedtime)
  const wakeMins = parseTimeToMinutes(wakeTime)

  if (bedMins === null || wakeMins === null) return null

  let diff = wakeMins - bedMins
  if (diff <= 0) diff += 24 * 60
  const hrs = Math.floor(diff / 60)
  const mins = diff % 60
  return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`
}

export function calculateSleepDurationMinutes(bedtime, wakeTime) {
  const bedMins = parseTimeToMinutes(bedtime)
  const wakeMins = parseTimeToMinutes(wakeTime)

  if (bedMins === null || wakeMins === null) return 0

  let diff = wakeMins - bedMins
  if (diff <= 0) diff += 24 * 60
  return diff
}

export function getMealTimingDiffText(actualTime, routineTime) {
  const actM = parseTimeToMinutes(actualTime)
  const routM = parseTimeToMinutes(routineTime)

  if (actM === null || routM === null) return null

  const diff = actM - routM
  if (diff === 0) return 'On schedule'
  if (diff > 0) return `${diff} min later than usual`
  return `${Math.abs(diff)} min earlier than usual`
}

export function calculateDailyScoreAndConfidence(log) {
  if (!log) return { score: 0, confidence: 'Limited Data', answeredCategories: 0 }
  if (isDailyLogEmpty(log)) return { score: 0, confidence: 'Limited Data', answeredCategories: 0 }

  const sleep = log.sleep || {}
  const meals = log.meals || []
  const activities = log.activities || []
  const hydration = log.hydration || {}
  const wellbeing = log.wellbeing || {}
  const healthEvent = log.healthEvent || {}
  const medications = log.medications || []
  const lifestyle = log.lifestyle || {}

  let scoreSum = 0
  let categoryWeightsTotal = 0
  let answeredCategories = 0

  // 1. Sleep & Recovery (Weight 20)
  const sleepMins = calculateSleepDurationMinutes(sleep.bedtime, sleep.wakeTime)
  if (sleepMins > 0 || (sleep.quality && sleep.quality > 0)) {
    answeredCategories++
    categoryWeightsTotal += 20
    let sleepPts = 12
    if (sleepMins >= 420 && sleepMins <= 540) sleepPts = 20
    else if (sleepMins >= 360) sleepPts = 16
    else if (sleepMins >= 300) sleepPts = 12
    else if (sleepMins > 0) sleepPts = 8

    if (sleep.quality >= 4) sleepPts = Math.min(20, sleepPts + 2)
    scoreSum += sleepPts
  }

  // 2. Meals & Nutrition (Weight 20)
  if (meals.length > 0) {
    answeredCategories++
    categoryWeightsTotal += 20
    let mealPts = Math.min(20, meals.length * 6)
    const hasHomeCooked = meals.some(m => m.tags && m.tags.includes('Home-cooked'))
    if (hasHomeCooked) mealPts = Math.min(20, mealPts + 2)
    scoreSum += mealPts
  }

  // 3. Physical Activity (Weight 20)
  if (activities.length > 0) {
    answeredCategories++
    categoryWeightsTotal += 20
    const totalMins = activities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0)
    let actPts = 10
    if (totalMins >= 45) actPts = 20
    else if (totalMins >= 30) actPts = 17
    else if (totalMins > 0) actPts = 13
    scoreSum += actPts
  }

  // 4. Hydration (Weight 10)
  if (hydration.liters !== null || hydration.glasses !== null || hydration.didNotTrack) {
    answeredCategories++
    categoryWeightsTotal += 10
    if (!hydration.didNotTrack) {
      const liters = hydration.liters || 0
      let hydPts = 5
      if (liters >= 2.0) hydPts = 10
      else if (liters >= 1.5) hydPts = 8
      else if (liters > 0) hydPts = 6
      scoreSum += hydPts
    } else {
      scoreSum += 7
    }
  }

  // 5. Routine Consistency (Weight 10)
  if (meals.length > 0 || sleepMins > 0) {
    answeredCategories++
    categoryWeightsTotal += 10
    scoreSum += 8
  }

  // 6. Wellbeing (Weight 10)
  if ((wellbeing.mood && wellbeing.mood > 0) || (wellbeing.stress && wellbeing.stress > 0) || (wellbeing.energy && wellbeing.energy > 0)) {
    answeredCategories++
    categoryWeightsTotal += 10
    const moodVal = wellbeing.mood || 3
    const energyVal = wellbeing.energy || 3
    const stressVal = 6 - (wellbeing.stress || 3)
    const avgVal = (moodVal + energyVal + stressVal) / 3
    const wellPts = Math.round((avgVal / 5) * 10)
    scoreSum += wellPts
  }

  // 7. Healthy Daily Behaviors (Weight 10)
  if (medications.length > 0 || !healthEvent.unusual || lifestyle.workoutType || lifestyle.caffeineCups !== undefined) {
    answeredCategories++
    categoryWeightsTotal += 10
    let behPts = 8
    if (!healthEvent.unusual) behPts += 2
    if (lifestyle.workoutType && lifestyle.workoutType !== 'No workout') behPts += 2
    if ((Number(lifestyle.caffeineCups) || 0) <= 3) behPts += 1
    if (lifestyle.smokingType && lifestyle.smokingType !== 'None') behPts -= 2
    scoreSum += Math.max(4, Math.min(18, behPts))
  }

  // 8. Lifestyle habits (Weight 10)
  if (lifestyle.caffeineCups !== undefined || lifestyle.smokingType || lifestyle.workoutType || lifestyle.screenTimeHours !== undefined || lifestyle.outdoorTimeHours !== undefined) {
    answeredCategories++
    categoryWeightsTotal += 10
    let habitPts = 7
    if ((Number(lifestyle.caffeineCups) || 0) <= 2) habitPts += 2
    if (lifestyle.workoutType && lifestyle.workoutType !== 'No workout') habitPts += 2
    if ((Number(lifestyle.screenTimeHours) || 0) <= 5) habitPts += 2
    if ((Number(lifestyle.outdoorTimeHours) || 0) >= 1) habitPts += 2
    if (lifestyle.smokingType && lifestyle.smokingType !== 'None') habitPts -= 3
    scoreSum += Math.max(4, Math.min(18, habitPts))
  }

  const finalScore = categoryWeightsTotal > 0 ? Math.min(100, Math.max(0, Math.round((scoreSum / categoryWeightsTotal) * 100))) : 0

  let confidence = 'Limited Data'
  if (answeredCategories >= 5) confidence = 'High Confidence'
  else if (answeredCategories >= 3) confidence = 'Medium Confidence'

  return {
    score: finalScore,
    confidence,
    answeredCategories,
  }
}

export function generateChronologicalTimeline(log) {
  if (!log) return []

  const events = []
  const sleep = log.sleep || {}
  const meals = log.meals || []
  const medications = log.medications || []
  const routineBlocks = log.dailyRoutineBlocks || []
  const activities = log.activities || []
  const healthEvent = log.healthEvent || {}

  // Sleep wake time
  if (sleep.wakeTime) {
    events.push({
      id: 'evt-wake',
      time: sleep.wakeTime,
      title: 'Wake up',
      category: 'Sleep',
      icon: '🌅',
      details: sleep.feltRested ? `Felt ${sleep.feltRested.toLowerCase()}` : '',
    })
  }

  // Meals
  meals.forEach(m => {
    if (m.time) {
      events.push({
        id: `evt-meal-${m.id}`,
        time: m.time,
        title: `${m.type || 'Meal'} (${m.food || 'Logged'})`,
        category: 'Meals',
        icon: '🍽️',
        details: m.tags ? m.tags.join(', ') : '',
      })
    }
  })

  // Medications
  medications.forEach(med => {
    if (med.scheduledTime && med.status === 'Taken') {
      events.push({
        id: `evt-med-${med.id}`,
        time: med.scheduledTime,
        title: `Medication (${med.name})`,
        category: 'Medication',
        icon: '💊',
        details: med.status,
      })
    }
  })

  // Routine Time Blocks
  routineBlocks.forEach(b => {
    if (b.startTime) {
      events.push({
        id: `evt-block-${b.id}`,
        time: b.startTime,
        title: `${b.title} (${b.startTime} → ${b.endTime || ''})`,
        category: 'Routine',
        icon: '💻',
        details: 'Daily Routine Block',
      })
    }
  })

  // Physical Activities
  activities.forEach(a => {
    if (a.startTime) {
      events.push({
        id: `evt-act-${a.id}`,
        time: a.startTime,
        title: `${a.type || 'Activity'} (${a.durationMinutes || 0} min)`,
        category: 'Activity',
        icon: '🏃',
        details: `${a.durationMinutes || 0} minutes`,
      })
    }
  })

  // Health Event
  if (healthEvent.unusual && healthEvent.time) {
    events.push({
      id: 'evt-health',
      time: healthEvent.time,
      title: `Health Event: ${healthEvent.type}`,
      category: 'Health',
      icon: '🩺',
      details: healthEvent.whatHappened || '',
    })
  }

  // Sleep bedtime
  if (sleep.bedtime) {
    events.push({
      id: 'evt-bed',
      time: sleep.bedtime,
      title: 'Bedtime',
      category: 'Sleep',
      icon: '🌙',
      details: sleep.quality > 0 ? `Quality ${sleep.quality}/5` : '',
    })
  }

  events.sort((a, b) => {
    const ma = parseTimeToMinutes(a.time) || 0
    const mb = parseTimeToMinutes(b.time) || 0
    return ma - mb
  })

  return events
}

/* ==========================================================================
   3. MAIN APP COMPONENT
   ========================================================================== */

function App() {
  const [view, setView] = useState('Dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Three Core Data Structures with Lazy Initializers
  const [dailyLog, setDailyLog] = useState(() => createEmptyDailyLog())
  const [dailyDefaults, setDailyDefaults] = useState(defaultDailyDefaults)
  const [routineSchedule, setRoutineSchedule] = useState(defaultRoutineSchedule)
  const [lastRecordedScore, setLastRecordedScore] = useState(null)
  const [lastRecordedLifestyleAge, setLastRecordedLifestyleAge] = useState(null)

  const [conflictModal, setConflictModal] = useState(null)
  const [quickAddType, setQuickAddType] = useState(null)
  const [showEditDefaultsModal, setShowEditDefaultsModal] = useState(false)
  const [showRoutineSetupModal, setShowRoutineSetupModal] = useState(false)

  const [toastMessage, setToastMessage] = useState('')
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const scoreData = useMemo(() => calculateDailyScoreAndConfidence(dailyLog), [dailyLog])
  const lifestyleAge = useMemo(() => calculateLifestyleAge(dailyLog), [dailyLog])
  const chronologicalEvents = useMemo(() => generateChronologicalTimeline(dailyLog), [dailyLog])

  const saveTodayRecord = () => {
    if (!isDailyLogEmpty(dailyLog)) {
      setLastRecordedScore(scoreData.score)
      setLastRecordedLifestyleAge(lifestyleAge)
    }
  }

  // Defensive Actions
  const applyDailyDefaults = (force = false) => {
    const meals = dailyLog?.meals || []
    const activities = dailyLog?.activities || []
    const bedtime = dailyLog?.sleep?.bedtime

    const hasActualData = meals.length > 0 || activities.length > 0 || !!bedtime
    if (hasActualData && !force) {
      setConflictModal({
        type: 'defaults',
        message: 'Your day already has actual entries. Keep existing entries or apply daily defaults?',
      })
      return
    }

    const defaultMeals = (dailyDefaults.meals || []).slice(0, dailyDefaults.mealsCount || 3).map((m, i) => {
      const routineMatch = (routineSchedule?.mealSchedule || []).find(r => r.type?.toLowerCase() === m.type?.toLowerCase())
      const defaultTime = routineMatch ? routineMatch.time : (i === 0 ? '08:00 AM' : i === 1 ? '01:30 PM' : '08:30 PM')
      return {
        id: `def-meal-${i}-${Date.now()}`,
        type: m.type || 'Meal',
        time: defaultTime,
        food: m.description || '',
        tags: [],
        quality: 4,
        isDefault: true,
      }
    })

    const defaultSnacks = (dailyDefaults.snacks || []).slice(0, dailyDefaults.snacksCount || 0).map((s, i) => ({
      id: `def-snack-${i}-${Date.now()}`,
      type: 'Snack',
      time: '04:00 PM',
      food: s.description || s.name || 'Snack',
      tags: [],
      quality: 4,
      isDefault: true,
    }))

    let defaultActivities = []
    if (dailyDefaults.exercise?.usuallyExercise === 'Yes') {
      const durationMins = parseInt(dailyDefaults.exercise?.duration) || 30
      const types = dailyDefaults.exercise?.workoutTypes?.length > 0 ? dailyDefaults.exercise.workoutTypes : ['Walking']
      defaultActivities = types.map((t, i) => ({
        id: `def-act-${i}-${Date.now()}`,
        type: t,
        startTime: '05:30 PM',
        durationMinutes: durationMins,
        isDefault: true,
      }))
    }

    let hydLiters = 2.0
    let hydGlasses = 8
    let didNotTrack = false
    if (dailyDefaults.hydration?.mode === "Don't track") {
      didNotTrack = true
      hydLiters = null
      hydGlasses = null
    } else if (dailyDefaults.hydration?.mode === 'Glasses/cups') {
      hydGlasses = parseFloat(dailyDefaults.hydration?.amount) || 8
      hydLiters = parseFloat((hydGlasses * 0.25).toFixed(1))
    } else {
      hydLiters = parseFloat(dailyDefaults.hydration?.amount) || 2.0
      hydGlasses = Math.round(hydLiters / 0.25)
    }

    const defaultMeds = (dailyDefaults.medications || []).slice(0, dailyDefaults.medicationsCount || 0).map((med, i) => {
      const routineMed = (routineSchedule?.medicationSchedule || []).find(r => r.name?.toLowerCase() === med.name?.toLowerCase())
      const schedTime = routineMed ? routineMed.time : (i === 0 ? '08:00 AM' : '08:00 PM')
      return {
        id: `def-med-${i}-${Date.now()}`,
        name: med.name || `Medication ${i + 1}`,
        scheduledTime: schedTime,
        status: 'Taken',
        isDefault: true,
      }
    })

    const sedentaryMap = {
      '<2 hours': '<2 hours',
      '2–4 hours': '2–4 hours',
      '4–6 hours': '4–6 hours',
      '6–8 hours': '6–8 hours',
      '8+ hours': '8+ hours',
      '6 hours': '4–6 hours',
    }
    const sedentaryVal = sedentaryMap[dailyDefaults.sedentary?.typicalSedentaryHours] || '4–6 hours'

    setDailyLog(prev => ({
      ...createEmptyDailyLog(),
      ...prev,
      hydration: {
        ...(prev?.hydration || {}),
        liters: didNotTrack ? null : hydLiters,
        glasses: didNotTrack ? null : hydGlasses,
        didNotTrack,
      },
      sedentary: sedentaryVal,
      meals: [...defaultMeals, ...defaultSnacks],
      activities: defaultActivities,
      medications: defaultMeds,
    }))
    showToast('Applied Daily Defaults! Edit today\'s actual values as needed.')
  }

  const applyRoutineSchedule = (force = false) => {
    const meals = dailyLog?.meals || []
    const bedtime = dailyLog?.sleep?.bedtime

    const hasActualData = meals.length > 0 || !!bedtime
    if (hasActualData && !force) {
      setConflictModal({
        type: 'routine',
        message: 'Your day already contains recorded entries. Keep existing entries or apply your routine schedule?',
      })
      return
    }

    const mealSchedule = routineSchedule?.mealSchedule || []
    const medicationSchedule = routineSchedule?.medicationSchedule || []
    const sleepSchedule = routineSchedule?.sleepSchedule || { bedtime: '11:30 PM', wakeTime: '07:00 AM' }

    setDailyLog(prev => ({
      ...createEmptyDailyLog(),
      ...prev,
      sleep: {
        ...(prev?.sleep || {}),
        bedtime: sleepSchedule.bedtime,
        wakeTime: sleepSchedule.wakeTime,
      },
      meals: mealSchedule.map(m => ({
        id: `rout-meal-${m.id}-${Date.now()}`,
        type: m.type,
        time: m.time,
        food: '',
        tags: [],
        quality: 4,
      })),
      medications: medicationSchedule.map(med => ({
        id: `rout-med-${med.id}-${Date.now()}`,
        name: med.name,
        scheduledTime: med.time,
        status: 'Taken',
      })),
    }))
    showToast('Applied saved Routine Schedule!')
  }

  const applyBoth = () => {
    applyRoutineSchedule(true)
    applyDailyDefaults(true)
    showToast('Applied Routine Schedule and Daily Defaults!')
  }

  const loadDemoPopulatedDay = () => {
    setDailyLog(JSON.parse(JSON.stringify(demoPopulatedDay)))
    showToast('Loaded Demo Scenario: Active Day')
  }

  const resetToEmptyDay = () => {
    setDailyLog(createEmptyDailyLog())
    showToast('Cleared day. Today\'s activity is now empty.')
  }

  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'user', text: "I have a headache." },
    {
      role: 'ai',
      text: 'I noticed you reported less sleep than usual today (6.8h), along with lower hydration and delayed meals. Those are useful lifestyle factors to consider.',
      context: true,
    },
  ])

  const sendMessage = (text = chatInput) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text }

    const query = text.toLowerCase()
    const sleepHrs = calculateSleepDurationText(dailyLog?.sleep?.bedtime, dailyLog?.sleep?.wakeTime) || 'not recorded'
    const water = dailyLog?.hydration?.liters ? `${dailyLog.hydration.liters}L` : 'not tracked'
    const mealsCount = dailyLog?.meals?.length || 0

    let reply = ''
    if (query.includes('headache') || query.includes('tired') || query.includes('pain')) {
      reply = `Looking at your recorded entries today: Sleep duration is ${sleepHrs}, hydration is ${water}, and ${mealsCount} meal(s) are logged. Stress level is recorded at ${dailyLog?.wellbeing?.stress || 'unanswered'}/5. Resting, drinking water, and having a balanced meal can help support recovery.`
    } else if (query.includes('score') || query.includes('health')) {
      reply = `Your Daily Activity Score today is ${scoreData.score}/100 with ${scoreData.confidence}. Scores are calculated exclusively from actual entries recorded today.`
    } else {
      reply = `Based on your Daily Activity log: Sleep (${sleepHrs}), Hydration (${water}), Meals (${mealsCount} logged), and Stress (${dailyLog?.wellbeing?.stress || 'N/A'}/5). Keep tracking your day!`
    }

    setMessages(prev => [...prev, userMsg, { role: 'ai', text: reply, context: true }])
    setChatInput('')
  }

  return (
    <div className="app-shell">
      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={mobileNavOpen ? 'sidebar mobile-open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark"><HeartPulse size={20} /></span>
          <span>heal <b>24/7</b></span>
          <button className="mobile-nav-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={20} /></button>
        </div>
        <div className="side-label">Your space</div>
        <nav>
          {[
            ['Dashboard', Home],
            ['Daily Activity', LayoutGrid],
            ['Heal AI', Bot],
            ['My Routine', Target],
            ['Profile', UserRound],
          ].map(([label, Icon]) => (
            <button
              key={label}
              className={view === label ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setView(label)
                setMobileNavOpen(false)
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Heal AI' && <i className="new-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={18} />
            <div>
              <b>Need a hand?</b>
              <small>Visit our help centre</small>
            </div>
            <ChevronRight size={16} />
          </div>
          <button className="nav-item" onClick={() => setMobileNavOpen(false)}>
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="privacy">
            <ShieldCheck size={16} /> Your data stays private
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}><Menu /></button>
          <div className="crumb">
            My health <ChevronRight size={14} /> <b>{view}</b>
          </div>
          <div className="top-actions">
            <button className="icon-button" title="Take a moment to check in on your day."><Bell size={18} /><i /></button>
            <div className="user-chip">
              <span className="avatar small">JD</span>
              <span>
                <b>Jordan Davis</b>
                <small>Member since 2024</small>
              </span>
              <ChevronRight size={15} />
            </div>
          </div>
        </header>

        <ErrorBoundary>
          {view === 'Dashboard' && (
            <Dashboard
              dailyLog={dailyLog}
              scoreData={scoreData}
              chronologicalEvents={chronologicalEvents}
              routineSchedule={routineSchedule}
              setView={setView}
              lifestyleAge={lifestyleAge}
              previousScore={lastRecordedScore}
              previousLifestyleAge={lastRecordedLifestyleAge}
            />
          )}
          {view === 'Daily Activity' && (
            <DailyActivityPage
              dailyLog={dailyLog}
              setDailyLog={setDailyLog}
              scoreData={scoreData}
              chronologicalEvents={chronologicalEvents}
              routineSchedule={routineSchedule}
              dailyDefaults={dailyDefaults}
              applyDailyDefaults={applyDailyDefaults}
              applyRoutineSchedule={applyRoutineSchedule}
              applyBoth={applyBoth}
              loadDemoPopulatedDay={loadDemoPopulatedDay}
              resetToEmptyDay={resetToEmptyDay}
              setQuickAddType={setQuickAddType}
              setShowEditDefaultsModal={setShowEditDefaultsModal}
              setShowRoutineSetupModal={setShowRoutineSetupModal}
              showToast={showToast}
              setView={setView}
              onSaveToday={saveTodayRecord}
            />
          )}
          {view === 'My Routine' && (
            <Routine
              routineSchedule={routineSchedule}
              setRoutineSchedule={setRoutineSchedule}
              dailyDefaults={dailyDefaults}
              setShowEditDefaultsModal={setShowEditDefaultsModal}
              setShowRoutineSetupModal={setShowRoutineSetupModal}
              showToast={showToast}
            />
          )}
          {view === 'Heal AI' && (
            <AI
              messages={messages}
              input={chatInput}
              setInput={setChatInput}
              send={sendMessage}
              dailyLog={dailyLog}
              scoreData={scoreData}
            />
          )}
          {view === 'Profile' && (
            <Profile
              dailyLog={dailyLog}
              routineSchedule={routineSchedule}
              scoreData={scoreData}
              lifestyleAge={lifestyleAge}
              previousScore={lastRecordedScore}
              previousLifestyleAge={lastRecordedLifestyleAge}
            />
          )}
        </ErrorBoundary>
      </main>

      {conflictModal && (
        <div className="modal-backdrop" onClick={() => setConflictModal(null)}>
          <div className="modal conflict-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConflictModal(null)}><X size={18} /></button>
            <div className="activity-icon yellow"><AlertTriangle size={24} /></div>
            <p className="eyebrow">PROTECT ACTUAL DATA</p>
            <h2>Overwrite Warning</h2>
            <p className="muted">{conflictModal.message}</p>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              <button
                className="primary-button"
                onClick={() => {
                  if (conflictModal.type === 'defaults') applyDailyDefaults(true)
                  else applyRoutineSchedule(true)
                  setConflictModal(null)
                }}
              >
                Overwrite with {conflictModal.type === 'defaults' ? 'Defaults' : 'Routine'}
              </button>
              <button className="outline-button" onClick={() => setConflictModal(null)}>
                Keep existing actual entries
              </button>
            </div>
          </div>
        </div>
      )}

      {quickAddType && (
        <QuickAddModal
          type={quickAddType.type || quickAddType}
          initialMealType={quickAddType.mealType}
          dailyLog={dailyLog}
          setDailyLog={setDailyLog}
          close={() => setQuickAddType(null)}
          showToast={showToast}
        />
      )}

      {showRoutineSetupModal && (
        <RoutineSetupModal
          routineSchedule={routineSchedule}
          setRoutineSchedule={setRoutineSchedule}
          dailyDefaults={dailyDefaults}
          setDailyDefaults={setDailyDefaults}
          close={() => setShowRoutineSetupModal(false)}
          showToast={showToast}
        />
      )}

      {showEditDefaultsModal && (
        <EditDefaultsModal
          dailyDefaults={dailyDefaults}
          setDailyDefaults={setDailyDefaults}
          close={() => setShowEditDefaultsModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   4. USER DASHBOARD COMPONENT
   ========================================================================== */

function QuickChoices({ label, value, options, onChange, className = '' }) {
  return (
    <div className={`quick-choice-group ${className}`}>
      <label>{label}</label>
      <div className="quick-choice-grid">
        {options.map(option => {
          const optionValue = typeof option === 'object' ? option.value : option
          const optionLabel = typeof option === 'object' ? option.label : option
          return (
            <button
              type="button"
              key={String(optionValue)}
              className={value === optionValue ? 'quick-choice selected' : 'quick-choice'}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimeQuickPicker({ label, value, options, onChange }) {
  const customInputRef = useRef(null)
  const [customOpen, setCustomOpen] = useState(Boolean(value && !options.includes(value)))

  const openCustomPicker = () => {
    setCustomOpen(true)
    window.requestAnimationFrame(() => {
      if (customInputRef.current?.showPicker) customInputRef.current.showPicker()
      else customInputRef.current?.click()
    })
  }

  return (
    <div className="quick-choice-group">
      <label>{label}</label>
      <div className="time-choice-grid">
        {options.map(option => (
          <button
            type="button"
            key={option}
            className={value === option ? 'time-choice selected' : 'time-choice'}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
        <button type="button" className={value && !options.includes(value) ? 'time-choice selected' : 'time-choice'} onClick={openCustomPicker}>
          {value && !options.includes(value) ? value : 'Custom'}
        </button>
      </div>
      {customOpen && (
        <input
          ref={customInputRef}
          className="custom-time-input"
          type="time"
          aria-label={`${label} custom time`}
          value={toTimeInputValue(value)}
          onChange={event => onChange(formatTimeInputValue(event.target.value))}
        />
      )}
    </div>
  )
}

function Stepper({ label, value, step = 0.1, min = 0, max = 10, suffix = '', onChange }) {
  const safeValue = Number(value) || 0
  return (
    <div className="stepper-field">
      <label>{label}</label>
      <div className="stepper-control">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, Number((safeValue - step).toFixed(2))))}>−</button>
        <strong>{safeValue}{suffix}</strong>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, Number((safeValue + step).toFixed(2))))}>+</button>
      </div>
    </div>
  )
}

function toTimeInputValue(value) {
  const minutes = parseTimeToMinutes(value)
  if (minutes === null) return ''
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatTimeInputValue(value) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

function mealTimeSuggestions(mealType) {
  if (mealType === 'Lunch') return ['12:00 PM', '01:00 PM', '02:00 PM']
  if (mealType === 'Dinner') return ['07:00 PM', '08:00 PM', '09:00 PM']
  if (mealType === 'Snack') return ['10:00 AM', '04:00 PM', '08:00 PM']
  return ['07:00 AM', '08:00 AM', '09:00 AM']
}

function Dashboard({ dailyLog, scoreData, chronologicalEvents, routineSchedule, setView, lifestyleAge, previousScore, previousLifestyleAge }) {
  const sleep = dailyLog?.sleep || {}
  const meals = dailyLog?.meals || []
  const activities = dailyLog?.activities || []
  const hydration = dailyLog?.hydration || {}

  const sleepDuration = calculateSleepDurationText(sleep.bedtime, sleep.wakeTime)
  const todayComplete = !isDailyLogEmpty(dailyLog)
  const scoreValue = todayComplete ? (scoreData?.score ?? 0) : (previousScore ?? 0)
  const displayLifestyleAge = todayComplete ? lifestyleAge : (previousLifestyleAge ?? 35)

  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{todayLabel.toUpperCase()}</p>
          <h1>Good morning, Jordan <span>✦</span></h1>
          <p className="subtitle">Here is your actual daily record and current activity overview.</p>
        </div>
        <button className="date-button">
          <Clock3 size={16} /> {todayLabel} <ChevronRight size={15} />
        </button>
      </div>

      <section className="hero-grid">
        <div className="score-card card">
          <div className="card-top">
            <div>
              <p className="eyebrow light">{todayComplete ? "TODAY'S DAILY SCORE" : 'LAST RECORDED SCORE'} <CircleHelp size={14} /></p>
              <h2>{scoreValue}<small>/100</small></h2>
              <span className="trend positive">
                <CheckCircle2 size={15} /> {todayComplete ? (scoreData?.confidence || 'Limited Data') : (previousScore !== null ? 'Based on previous logs' : 'No previous logs')}
              </span>
            </div>
            <div className="score-ring" style={{ '--score': `${(scoreValue || 0) * 3.6}deg` }}>
              <div>
                <b>{scoreValue}</b>
                <small>{todayComplete ? 'today' : 'last'}</small>
              </div>
            </div>
          </div>
          <div className="score-line">
            <span>
              {todayComplete
                ? 'Score calculated exclusively from actual entries recorded today.'
                : previousScore !== null
                  ? `Based on your previous logs: ${previousScore}. Today's data isn't filled yet.`
                  : 'Complete your first check-in to calculate your Health Score.'}
            </span>
            <button onClick={() => setView('Daily Activity')}>
              {todayComplete ? "View check-in" : "Start today's check-in"} <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="age-card card">
          <div className="section-heading compact" style={{ marginBottom: '12px' }}>
            <div>
              <p className="eyebrow">LIFESTYLE AGE</p>
              <h2 style={{ fontSize: '20px' }}>{displayLifestyleAge} yrs</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#fafcfb', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px' }}>
              <small style={{ fontSize: '10px', color: '#82918b' }}>Sleep</small>
              <b style={{ display: 'block', fontSize: '15px', color: '#1f332a', marginTop: '2px' }}>{sleepDuration || 'Not logged'}</b>
            </div>
            <div style={{ background: '#fafcfb', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px' }}>
              <small style={{ fontSize: '10px', color: '#82918b' }}>Meals</small>
              <b style={{ display: 'block', fontSize: '15px', color: '#1f332a', marginTop: '2px' }}>{meals.length} recorded</b>
            </div>
            <div style={{ background: '#fafcfb', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px' }}>
              <small style={{ fontSize: '10px', color: '#82918b' }}>Hydration</small>
              <b style={{ display: 'block', fontSize: '15px', color: '#1f332a', marginTop: '2px' }}>
                {hydration.liters ? `${hydration.liters} L` : 'Not tracked'}
              </b>
            </div>
          </div>
          <div className="age-footer" style={{ marginTop: '16px' }}>
            <span>{todayComplete ? 'Today’s check-in is complete.' : "Today's data isn't filled yet."}</span>
            <span>Routine Bedtime: <b>{routineSchedule?.sleepSchedule?.bedtime || '11:30 PM'}</b></span>
            <button onClick={() => setView('My Routine')}>Edit Routine <ChevronRight size={14} /></button>
          </div>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <h2>Today's Timeline</h2>
          <p className="muted">Chronological view of what actually happened today.</p>
        </div>
        <button className="text-button" onClick={() => setView('Daily Activity')}>
          View full check-in <ChevronRight size={15} />
        </button>
      </section>

      <div className="timeline-card card">
        {chronologicalEvents && chronologicalEvents.length > 0 ? (
          <div className="timeline-track">
            {chronologicalEvents.map(ev => (
              <div key={ev.id} className="timeline-node">
                <span className="timeline-icon">{ev.icon}</span>
                <b className="timeline-time">{ev.time}</b>
                <span className="timeline-title">{ev.title}</span>
                {ev.details && <small style={{ fontSize: '9px', color: '#8fa097' }}>{ev.details}</small>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#7a8e84' }}>
            <p style={{ margin: '0 0 8px', font: '600 14px Manrope' }}>Your day is empty</p>
            <small style={{ fontSize: '11px' }}>Start recording your actual activities, meals, and sleep to generate your timeline.</small>
          </div>
        )}
      </div>

      <section className="lower-grid">
        <div className="insights-card card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">TODAY'S INSIGHT</p>
              <h2>Observation & Baseline</h2>
            </div>
            <Sparkles size={22} className="sparkle" />
          </div>
          {sleepDuration ? (
            <p className="muted" style={{ fontSize: '13px', lineHeight: '1.6' }}>
              Your sleep duration was <b>{sleepDuration}</b>. You recorded <b>{meals.length} meals</b> and <b>{activities.length} activity session(s)</b> today.
            </p>
          ) : (
            <p className="muted" style={{ fontSize: '13px', lineHeight: '1.6' }}>
              Log today's actual sleep, meals, and hydration to see personalized baseline comparisons.
            </p>
          )}
        </div>

        <div className="streak-card card">
          <div className="section-heading compact">
            <div>
              <h2>Weekly Streak <span className="fire">✦</span></h2>
              <p className="muted">Completed 5 of 7 daily check-ins per week.</p>
            </div>
            <b className="streak-number">🔥 4 <small>Weeks</small></b>
          </div>
          <p className="streak-note"><Flame size={15} /> Consistent check-ins reward your weekly streak!</p>
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   5. REBUILT DAILY ACTIVITY PAGE (10 LOGICAL CATEGORIES)
   ========================================================================== */

function DailyActivityPage({
  dailyLog,
  setDailyLog,
  scoreData,
  chronologicalEvents,
  routineSchedule,
  dailyDefaults,
  applyDailyDefaults,
  applyRoutineSchedule,
  applyBoth,
  loadDemoPopulatedDay,
  resetToEmptyDay,
  setQuickAddType,
  setShowEditDefaultsModal,
  setShowRoutineSetupModal,
  showToast,
  setView,
  onSaveToday,
}) {
  const [activeTab, setActiveTab] = useState('Today')
  const [activeSection, setActiveSection] = useState(null)

  const sleep = dailyLog?.sleep || {}
  const meals = dailyLog?.meals || []
  const activities = dailyLog?.activities || []
  const hydration = dailyLog?.hydration || {}
  const sedentary = dailyLog?.sedentary || ''
  const medications = dailyLog?.medications || []
  const dailyRoutineBlocks = dailyLog?.dailyRoutineBlocks || []
  const wellbeing = dailyLog?.wellbeing || {}
  const healthEvent = dailyLog?.healthEvent || {}

  const isDayEmpty = useMemo(() => {
    return (
      !sleep.bedtime &&
      meals.length === 0 &&
      activities.length === 0 &&
      hydration.liters === null &&
      !hydration.didNotTrack &&
      !sedentary &&
      !wellbeing.mood &&
      !healthEvent.unusual
    )
  }, [sleep, meals, activities, hydration, sedentary, wellbeing, healthEvent])

  const removeMeal = (id) => {
    setDailyLog(prev => ({
      ...prev,
      meals: (prev?.meals || []).filter(m => m.id !== id)
    }))
    showToast('Meal removed')
  }

  const removeActivity = (id) => {
    setDailyLog(prev => ({
      ...prev,
      activities: (prev?.activities || []).filter(a => a.id !== id)
    }))
    showToast('Activity session removed')
  }

  return (
    <div className="page activity-page">
      <div className="page-heading checkin-heading">
        <div>
          <p className="eyebrow">TODAY'S ACTUAL RECORD</p>
          <h1>Daily Activity Collection System <span>✦</span></h1>
          <p className="subtitle">
            {todayLabel} &mdash; Record what actually happened today.
          </p>
        </div>
      </div>

      {!dailyDefaults?.configured && !routineSchedule?.configured && (
        <div className="routine-banner inline-banner" style={{ background: '#fcf8ec', borderColor: '#f3e6bd', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="banner-icon" style={{ background: '#f7ebd0', color: '#966d1e' }}><Edit3 size={20} /></div>
            <div>
              <b style={{ fontSize: '14px', color: '#3d3112' }}>No defaults configured</b>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#786638' }}>
                Optionally configure workout and medication routines, or edit your daily defaults for faster future check-ins.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="primary-button small-btn" onClick={() => setShowRoutineSetupModal(true)}>
              <Target size={14} /> Set up routines
            </button>
            <button className="outline-button small-btn" onClick={() => setShowEditDefaultsModal(true)}>
              <Edit3 size={14} /> Edit Defaults
            </button>
          </div>
        </div>
      )}

      <div className="quick-add-toolbar card">
        <span className="quick-add-label"><Plus size={15} /> Quick Add:</span>
        <button className="quick-add-btn" onClick={() => setQuickAddType('meal')}><Utensils size={14} /> + Meal</button>
        <button className="quick-add-btn" onClick={() => setQuickAddType('activity')}><Dumbbell size={14} /> + Activity</button>
        <button className="quick-add-btn" onClick={() => setQuickAddType('water')}><Droplets size={14} /> + Water</button>
        <button className="quick-add-btn" onClick={() => setQuickAddType('medication')}><Pill size={14} /> + Medication</button>
        <button className="quick-add-btn" onClick={() => setQuickAddType('sleep')}><Moon size={14} /> + Sleep</button>
        <button className="quick-add-btn" onClick={() => setQuickAddType('event')}><AlertTriangle size={14} /> + Health Event</button>
      </div>

      <div className="checkin-progress-card card">
        <div className="progress-top">
          <div>
            <span className="progress-badge-label">Today's Activity Score</span>
            <strong className="progress-percent-text">{scoreData?.score || 0} / 100</strong>
            <span className="confidence-pill" style={{ marginLeft: '10px', fontSize: '11px', background: '#eaf4ee', color: '#257053', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
              {scoreData?.confidence || 'Limited Data'}
            </span>
          </div>

          <div className="action-buttons-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
            {dailyDefaults?.configured && <button className="primary-button fill-default-btn" onClick={() => applyDailyDefaults(false)}>
              <Zap size={15} /> Fill Daily Defaults
            </button>}
            <button className="outline-button" onClick={() => setShowEditDefaultsModal(true)}>
              <Edit3 size={15} /> Edit Defaults
            </button>
            {routineSchedule?.configured && <button className="outline-button" onClick={() => applyRoutineSchedule(false)}>
              <Clock size={15} /> Use saved routine
            </button>}
            {routineSchedule?.configured && <button className="outline-button" onClick={applyBoth}>
              <span>{value && !options.includes(value) ? value : 'Custom'}</span>
            </button>}
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${scoreData?.score || 0}%` }} />
        </div>

        <div className="demo-preset-strip">
          <span className="demo-strip-label"><Sparkles size={14} /> Demo Controls:</span>
          <button className="preset-chip success" onClick={loadDemoPopulatedDay}>
            Load Sample Populated Day
          </button>
          <button className="preset-chip warning" onClick={resetToEmptyDay}>
            Reset to Empty Day
          </button>
        </div>
      </div>

      {isDayEmpty && (
        <div className="routine-banner inline-banner" style={{ background: '#f5faf7', borderColor: '#d2e8db', flexDirection: 'column', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="banner-icon" style={{ background: '#dceee3', color: '#28785e' }}><Calendar size={22} /></div>
            <div>
              <b style={{ fontSize: '15px', color: '#1c362b' }}>Your day is empty</b>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#63796f' }}>
                Start recording your activities, meals, sleep, and wellbeing to build your personal health timeline.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', paddingTop: '10px', borderTop: '1px solid #e0f0e6' }}>
            <button className="primary-button small-btn" onClick={() => setQuickAddType('activity')}>+ Add Activity</button>
            <button className="primary-button small-btn" onClick={() => setQuickAddType('meal')}>+ Add Meal</button>
            <button className="primary-button small-btn" onClick={() => setQuickAddType('sleep')}>+ Add Sleep</button>
            <button className="primary-button small-btn" onClick={() => setQuickAddType('event')}>+ Add Event</button>
            {dailyDefaults?.configured && <button className="outline-button small-btn" onClick={() => applyDailyDefaults(false)}>Fill Daily Defaults</button>}
            {routineSchedule?.configured && <button className="outline-button small-btn" onClick={() => applyRoutineSchedule(false)}>Use saved routine</button>}
          </div>
        </div>
      )}

      <div className="activity-toolbar">
        <div className="tabs">
          <button className={activeTab === 'Today' ? 'tab active' : 'tab'} onClick={() => setActiveTab('Today')}>
            Today's Check-in
          </button>
          <button className={activeTab === 'Timeline' ? 'tab active' : 'tab'} onClick={() => setActiveTab('Timeline')}>
            Your Day (Timeline)
          </button>
        </div>
      </div>

      {activeTab === 'Today' && (
        <div className="checkin-sections-container">
          {/* 1. SLEEP */}
          <SectionCard sectionId="sleep" activeSection={activeSection} setActiveSection={setActiveSection} title="Sleep & Recovery" icon="💤" status={sleep.bedtime || sleep.wakeTime ? 'Partially completed' : 'Not completed'} summary={calculateSleepDurationText(sleep.bedtime, sleep.wakeTime) || ''}>
            <div className="quick-checkin-stack">
              {routineSchedule?.configured && (
                <div className="routine-shortcut">
                  <span>Saved routine: {routineSchedule.sleepSchedule?.bedtime} → {routineSchedule.sleepSchedule?.wakeTime}</span>
                  <button type="button" onClick={() => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), bedtime: routineSchedule.sleepSchedule?.bedtime, wakeTime: routineSchedule.sleepSchedule?.wakeTime } }))}>Use saved routine</button>
                </div>
              )}
              <div className="sleep-picker-grid">
                <TimeQuickPicker
                  label="Bedtime"
                  value={sleep.bedtime}
                  options={['10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM']}
                  onChange={value => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), bedtime: value } }))}
                />
                <TimeQuickPicker
                  label="Wake-up"
                  value={sleep.wakeTime}
                  options={['06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM']}
                  onChange={value => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), wakeTime: value } }))}
                />
              </div>
              <div className="sleep-summary">
                <span>Sleep duration</span>
                <strong>{calculateSleepDurationText(sleep.bedtime, sleep.wakeTime) || 'Choose bedtime and wake-up'}</strong>
                <small>Automatically calculated</small>
              </div>
              <div className="quick-checkin-grid">
                <QuickChoices label="Sleep quality" value={sleep.quality} options={[1, 2, 3, 4, 5].map(value => ({ value, label: `${value}${value === 1 ? ' Poor' : value === 5 ? ' Excellent' : ''}` }))} onChange={value => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), quality: value } }))} />
                <QuickChoices label="Night awakenings" value={sleep.awakenings} options={['None', '1', '2', '3+', "Don't know"]} onChange={value => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), awakenings: value } }))} />
                <QuickChoices label="Felt rested?" value={sleep.feltRested} options={['Yes', 'Somewhat', 'No']} onChange={value => setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), feltRested: value } }))} />
              </div>
            </div>
          </SectionCard>

          {/* 2. MEALS & NUTRITION */}
          <SectionCard sectionId="meals" activeSection={activeSection} setActiveSection={setActiveSection} title="Meals & Nutrition" icon="🍽️" status={meals.length > 0 ? 'Completed' : 'Not completed'} summary={`${meals.length} meal${meals.length === 1 ? '' : 's'} logged`}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#687e74' }}>
                Recorded Meals: <b>{meals.length}</b>
              </span>
              <div className="meal-quick-actions">
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                  <button key={type} className="quick-choice" type="button" onClick={() => setQuickAddType({ type: 'meal', mealType: type })}>
                    <Plus size={13} /> {type}
                  </button>
                ))}
              </div>
            </div>

            {meals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meals.map((meal, index) => {
                  const routineMatch = (routineSchedule?.mealSchedule || []).find(m => m.type?.toLowerCase() === meal.type?.toLowerCase())
                  const diffText = routineMatch ? getMealTimingDiffText(meal.time, routineMatch.time) : null

                  return (
                    <div key={meal.id} className="card" style={{ padding: '14px', border: '1px solid var(--line)', background: '#fafcfb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <b>Meal {index + 1}: {meal.type}</b>
                        <button onClick={() => removeMeal(meal.id)} style={{ border: 0, background: 'transparent', color: '#c25555', cursor: 'pointer' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="meal-entry-grid">
                        <TimeQuickPicker
                          label="When"
                          value={meal.time}
                          options={['08:00 AM', '12:30 PM', '06:30 PM']}
                          onChange={value => setDailyLog(prev => ({
                            ...prev,
                            meals: (prev?.meals || []).map(m => m.id === meal.id ? { ...m, time: value } : m)
                          }))}
                        />
                        <input
                          type="text"
                          placeholder="What did you eat? (e.g. Oatmeal & berries)"
                          value={meal.food || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setDailyLog(prev => ({
                              ...prev,
                              meals: (prev?.meals || []).map(m => m.id === meal.id ? { ...m, food: val } : m)
                            }))
                          }}
                        />
                      </div>
                      {diffText && (
                        <small style={{ display: 'block', marginTop: '6px', fontSize: '10px', color: '#28785e' }}>
                          ℹ️ {diffText} (Routine: {routineMatch.time})
                        </small>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="field-hint">No meals recorded yet today. Click "+ Add Meal" or "Fill Daily Defaults".</p>
            )}
          </SectionCard>

          {/* 3. HYDRATION */}
          <SectionCard sectionId="hydration" activeSection={activeSection} setActiveSection={setActiveSection} title="Hydration" icon="💧" status={hydration.liters || hydration.didNotTrack ? 'Completed' : 'Not completed'} summary={hydration.didNotTrack ? 'Not tracked' : hydration.liters ? `${hydration.liters} L` : ''}>
            <div className="quick-checkin-grid hydration-grid">
              <Stepper label="Water intake" value={hydration.liters || 0} step={0.25} max={6} suffix=" L" onChange={value => setDailyLog(prev => ({ ...prev, hydration: { ...(prev?.hydration || {}), liters: value || null, didNotTrack: false } }))} />
              <button type="button" className={hydration.didNotTrack ? 'skip-choice selected' : 'skip-choice'} onClick={() => setDailyLog(prev => ({ ...prev, hydration: { ...(prev?.hydration || {}), didNotTrack: !prev?.hydration?.didNotTrack, liters: null } }))}>Didn't track today</button>
            </div>
          </SectionCard>

          {/* 3B. LIFESTYLE QUICK CHECK-IN */}
          <SectionCard sectionId="lifestyle" activeSection={activeSection} setActiveSection={setActiveSection} title="Lifestyle & Daily Habits" icon="🌿" status="Optional">
            <div className="section-grid-form">
              <div className="form-group">
                <label>Caffeine</label>
                <div className="chip-selector">
                  {[0, 1, 2, 3, 4].map(value => (
                    <button
                      key={value}
                      className={((dailyLog?.lifestyle?.caffeineCups ?? 0) === value) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), caffeineCups: value, caffeineSource: value === 0 ? 'None' : (prev?.lifestyle?.caffeineSource || 'Coffee') } }))}
                    >
                      {value === 0 ? 'None' : `${value}${value === 4 ? '+' : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Caffeine source</label>
                <div className="chip-selector">
                  {['Coffee', 'Tea', 'Energy drink', 'Other'].map(source => (
                    <button
                      key={source}
                      className={((dailyLog?.lifestyle?.caffeineSource || 'None') === source) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), caffeineSource: source } }))}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Workout / Gym</label>
                <div className="chip-selector">
                  {['No workout', 'Gym', 'Running', 'Walking', 'Sports', 'Home workout'].map(option => (
                    <button
                      key={option}
                      className={((dailyLog?.lifestyle?.workoutType || 'No workout') === option) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), workoutType: option, workoutDuration: option === 'No workout' ? 0 : (prev?.lifestyle?.workoutDuration || 30) } }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Workout duration</label>
                <div className="chip-selector">
                  {[0, 15, 30, 45, 60, 90].map(value => (
                    <button
                      key={value}
                      className={((dailyLog?.lifestyle?.workoutDuration || 0) === value) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), workoutDuration: value } }))}
                    >
                      {value === 0 ? 'None' : `${value} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Smoking</label>
                <div className="chip-selector">
                  {['None', 'Cigarettes', 'Vape', 'Other'].map(option => (
                    <button
                      key={option}
                      className={((dailyLog?.lifestyle?.smokingType || 'None') === option) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), smokingType: option, smokingQuantity: option === 'None' ? 0 : (prev?.lifestyle?.smokingQuantity || 1) } }))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {dailyLog?.lifestyle?.smokingType && dailyLog.lifestyle.smokingType !== 'None' && (
                  <Stepper label="Quantity" value={dailyLog.lifestyle.smokingQuantity} max={40} suffix=" today" onChange={value => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), smokingQuantity: value } }))} />
                )}
              </div>

              <div className="form-group">
                <label>Alcohol</label>
                <div className="chip-selector">
                  {[0, 1, 2, 3, 4].map(value => (
                    <button
                      key={value}
                      className={((dailyLog?.lifestyle?.alcoholDrinks || 0) === value) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), alcoholDrinks: value } }))}
                    >
                      {value === 0 ? 'None' : `${value}${value === 4 ? '+' : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Screen time</label>
                <div className="chip-selector">
                  {[0, 1, 2, 3, 5, 8].map(value => (
                    <button
                      key={value}
                      className={((dailyLog?.lifestyle?.screenTimeHours || 0) === value) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), screenTimeHours: value } }))}
                    >
                      {value === 0 ? 'None' : `${value}h`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Outdoor time</label>
                <div className="chip-selector">
                  {[0, 0.5, 1, 2, 3].map(value => (
                    <button
                      key={value}
                      className={((dailyLog?.lifestyle?.outdoorTimeHours || 0) === value) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, lifestyle: { ...(prev?.lifestyle || {}), outdoorTimeHours: value } }))}
                    >
                      {value === 0 ? 'None' : `${value}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 4. PHYSICAL ACTIVITY */}
          <SectionCard sectionId="activity" activeSection={activeSection} setActiveSection={setActiveSection} title="Physical Activity" icon="🏃" status={activities.length > 0 ? 'Completed' : 'Not completed'} summary={activities.length > 0 ? `${activities.length} session${activities.length === 1 ? '' : 's'}` : ''}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#687e74' }}>
                Recorded Activities: <b>{activities.length}</b>
              </span>
              <button className="primary-button small-btn" onClick={() => setQuickAddType('activity')}>
                <Plus size={14} /> Add Activity
              </button>
            </div>

            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activities.map(act => (
                  <div key={act.id} className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafcfb' }}>
                    <div>
                      <b>{act.type}</b> &mdash; <span>{act.durationMinutes} min</span> ({act.startTime || 'Time unassigned'})
                    </div>
                    <button onClick={() => removeActivity(act.id)} style={{ border: 0, background: 'transparent', color: '#c25555', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="field-hint">No physical activity recorded yet. Click "+ Add Activity".</p>
            )}
          </SectionCard>

          {/* 5. SEDENTARY / REST PERIODS */}
          <SectionCard sectionId="sedentary" activeSection={activeSection} setActiveSection={setActiveSection} title="Sedentary & Rest" icon="🪑" status={sedentary ? 'Completed' : 'Optional'} summary={sedentary}>
            <div className="form-group full-width">
              <label>Approximately how much of your day was spent sitting or inactive?</label>
              <div className="chip-selector">
                {['<2 hours', '2–4 hours', '4–6 hours', '6–8 hours', '8+ hours'].map(s => (
                  <button
                    key={s}
                    className={sedentary === s ? 'chip-btn selected' : 'chip-btn'}
                    onClick={() => setDailyLog(prev => ({ ...prev, sedentary: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* 6. MEDICATION / SUPPLEMENTS */}
          <SectionCard sectionId="medications" activeSection={activeSection} setActiveSection={setActiveSection} title="Medication & Supplements" icon="💊" status={medications.length > 0 ? 'Completed' : 'Optional'} summary={medications.length > 0 ? `${medications.length} medication${medications.length === 1 ? '' : 's'}` : 'None configured'}>
            {(routineSchedule?.medicationSchedule || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {routineSchedule.medicationSchedule.map(med => {
                  const existing = medications.find(m => m.name === med.name)
                  const currentStatus = existing ? existing.status : 'Not tracked'

                  return (
                    <div key={med.id} className="med-check-item">
                      <div>
                        <b>{med.name}</b>
                        <small>Scheduled time: {med.time}</small>
                      </div>
                      <div className="chip-selector">
                        {['Taken', 'Missed', 'Taken late', 'Not tracked'].map(st => (
                          <button
                            key={st}
                            className={currentStatus === st ? 'chip-btn selected' : 'chip-btn'}
                            onClick={() => {
                              setDailyLog(prev => {
                                const filtered = (prev?.medications || []).filter(m => m.name !== med.name)
                                return {
                                  ...prev,
                                  medications: [...filtered, { id: med.id, name: med.name, scheduledTime: med.time, status: st }]
                                }
                              })
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <p className="field-hint">No medication routine configured. This section is optional.</p>
                <button type="button" className="outline-button small-btn" onClick={() => setShowRoutineSetupModal(true)}><Plus size={14} /> Set up medication routine</button>
              </div>
            )}
          </SectionCard>

          {/* 7. WORK / STUDY / DAILY ROUTINE */}
          <SectionCard sectionId="blocks" activeSection={activeSection} setActiveSection={setActiveSection} title="Work / Study / Routine" icon="💻" status={dailyRoutineBlocks.length > 0 ? 'Completed' : 'Optional'} summary={dailyRoutineBlocks.length > 0 ? `${dailyRoutineBlocks.length} block${dailyRoutineBlocks.length === 1 ? '' : 's'}` : ''}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#687e74' }}>
                Time Blocks: <b>{dailyRoutineBlocks.length}</b>
              </span>
              <button
                className="outline-button small-btn"
                onClick={() => {
                  const newBlock = { id: `b-${Date.now()}`, title: 'Work', startTime: '09:00 AM', endTime: '01:00 PM' }
                  setDailyLog(prev => ({ ...prev, dailyRoutineBlocks: [...(prev?.dailyRoutineBlocks || []), newBlock] }))
                }}
              >
                + Add Routine Block
              </button>
            </div>
            {dailyRoutineBlocks.map(b => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={b.title || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setDailyLog(prev => ({ ...prev, dailyRoutineBlocks: (prev?.dailyRoutineBlocks || []).map(x => x.id === b.id ? { ...x, title: val } : x) }))
                  }}
                />
                <TimeQuickPicker
                  label="Start"
                  value={b.startTime}
                  options={['07:00 AM', '09:00 AM', '12:00 PM', '05:00 PM']}
                  onChange={value => setDailyLog(prev => ({ ...prev, dailyRoutineBlocks: (prev?.dailyRoutineBlocks || []).map(x => x.id === b.id ? { ...x, startTime: value } : x) }))}
                />
                <TimeQuickPicker
                  label="End"
                  value={b.endTime}
                  options={['12:00 PM', '01:00 PM', '05:00 PM', '09:00 PM']}
                  onChange={value => setDailyLog(prev => ({ ...prev, dailyRoutineBlocks: (prev?.dailyRoutineBlocks || []).map(x => x.id === b.id ? { ...x, endTime: value } : x) }))}
                />
                <button onClick={() => setDailyLog(prev => ({ ...prev, dailyRoutineBlocks: (prev?.dailyRoutineBlocks || []).filter(x => x.id !== b.id) }))} style={{ border: 0, background: 'none', color: '#c25555', cursor: 'pointer' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </SectionCard>

          {/* 8. PERSONAL WELLBEING */}
          <SectionCard sectionId="wellbeing" activeSection={activeSection} setActiveSection={setActiveSection} title="Personal Wellbeing" icon="🧠" status={wellbeing.mood || wellbeing.energy || wellbeing.stress ? 'Partially completed' : 'Optional'}>
            <div className="section-grid-form">
              <div className="form-group">
                <label>Mood (1–5)</label>
                <div className="chip-selector">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      className={wellbeing.mood === v ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, wellbeing: { ...(prev?.wellbeing || {}), mood: v } }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Energy (1–5)</label>
                <div className="chip-selector">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      className={wellbeing.energy === v ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, wellbeing: { ...(prev?.wellbeing || {}), energy: v } }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Stress (1–5)</label>
                <div className="chip-selector">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      className={wellbeing.stress === v ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, wellbeing: { ...(prev?.wellbeing || {}), stress: v } }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Overall Day Rating (1–5)</label>
                <div className="chip-selector">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      className={wellbeing.overallDay === v ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, wellbeing: { ...(prev?.wellbeing || {}), overallDay: v } }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 9. HEALTH EVENTS */}
          <SectionCard sectionId="events" activeSection={activeSection} setActiveSection={setActiveSection} title="Health Events" icon="🩺" status={healthEvent.unusual ? 'Completed' : 'Optional'} summary={healthEvent.unusual ? healthEvent.type : 'Nothing unusual'}>
            <div className="section-grid-form">
              <div className="form-group full-width">
                <label>Did anything unusual happen today?</label>
                <div className="chip-selector">
                  {[
                    'Nothing unusual',
                    'Pain/discomfort',
                    'Headache',
                    'Digestive issue',
                    'Injury',
                    'Feeling unusually tired',
                    'Feeling sick',
                    'Other',
                  ].map(t => (
                    <button
                      key={t}
                      className={healthEvent.type === t ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setDailyLog(prev => ({ ...prev, healthEvent: { ...(prev?.healthEvent || {}), type: t, unusual: t !== 'Nothing unusual' } }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {healthEvent.unusual && (
                <>
                  <div className="form-group">
                    <label>When did it happen?</label>
                    <TimeQuickPicker
                      label="When did it happen?"
                      value={healthEvent.time}
                      options={['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM']}
                      onChange={value => setDailyLog(prev => ({ ...prev, healthEvent: { ...(prev?.healthEvent || {}), time: value } }))}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>What happened?</label>
                    <input
                      type="text"
                      placeholder="Describe what you felt..."
                      value={healthEvent.whatHappened || ''}
                      onChange={(e) => setDailyLog(prev => ({ ...prev, healthEvent: { ...(prev?.healthEvent || {}), whatHappened: e.target.value } }))}
                    />
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          {/* 10. SAVE FOOTER */}
          <div className="save-day-footer-card card">
            <div>
              <h3>Save Today's Activity Record</h3>
              <p className="muted">
                Daily Activity Score: <b>{scoreData?.score || 0}/100</b> ({scoreData?.confidence || 'Limited Data'}).
                Actual entries update Dashboard, Timeline, and Heal AI context.
              </p>
            </div>
            <button className="primary-button save-activity-btn" onClick={() => showToast('Today\'s actual daily activity record saved successfully.')}>
              <Check size={16} /> Save Record
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Timeline' && (
        <div className="history-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR DAY</p>
              <h2>Chronological Daily Timeline</h2>
            </div>
          </div>
          <div className="timeline-card card" style={{ padding: '22px' }}>
            {chronologicalEvents && chronologicalEvents.length > 0 ? (
              <div className="timeline-track">
                {chronologicalEvents.map(ev => (
                  <div key={ev.id} className="timeline-node">
                    <span className="timeline-icon">{ev.icon}</span>
                    <b className="timeline-time">{ev.time}</b>
                    <span className="timeline-title">{ev.title}</span>
                    {ev.details && <small style={{ fontSize: '9px', color: '#8fa097' }}>{ev.details}</small>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#7a8e84' }}>
                <p style={{ margin: '0 0 8px', font: '600 14px Manrope' }}>Your day is empty</p>
                <small style={{ fontSize: '11px' }}>Add actual entries to render your chronological timeline.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ sectionId, activeSection, setActiveSection, title, icon, status = 'Not completed', summary = '', children }) {
  const isExpanded = activeSection === sectionId

  return (
    <div className={`checkin-section card ${isExpanded ? 'expanded' : 'collapsed'}`} style={{ marginBottom: '14px' }}>
      <button className="section-header" type="button" onClick={() => setActiveSection(isExpanded ? null : sectionId)} aria-expanded={isExpanded}>
        <div className="header-left">
          <span className="section-emoji">{icon}</span>
          <div>
            <h3 style={{ font: '700 16px Manrope', color: '#1e352b', margin: 0 }}>{title}</h3>
            <span className="header-status-sub">{summary || status}</span>
          </div>
        </div>
        <div className="header-right">
          <span className={`section-status ${status === 'Completed' ? 'complete' : ''}`}>{status}</span>
          <ChevronDown size={18} className={isExpanded ? 'section-chevron rotated' : 'section-chevron'} />
        </div>
      </button>
      {isExpanded && (
        <div className="section-body">
          {children}
          <button type="button" className="section-done-button" onClick={() => setActiveSection(null)}><Check size={15} /> Done</button>
        </div>
      )}
    </div>
  )
}

function RoutineSetupModal({ routineSchedule, setRoutineSchedule, dailyDefaults, setDailyDefaults, close, showToast }) {
  const existingExercise = dailyDefaults?.configured ? (dailyDefaults.exercise || {}) : {}
  const [worksOut, setWorksOut] = useState(existingExercise.usuallyExercise || '')
  const [workoutType, setWorkoutType] = useState(existingExercise.workoutTypes?.[0] || 'Gym')
  const [frequency, setFrequency] = useState(parseInt(existingExercise.frequency) || 3)
  const [duration, setDuration] = useState(parseInt(existingExercise.duration) || 30)
  const [takesMedication, setTakesMedication] = useState(routineSchedule?.medicationSchedule?.length > 0 ? 'Yes' : '')
  const [medications, setMedications] = useState((routineSchedule?.medicationSchedule || []).map(med => ({ ...med, frequency: med.frequency || 'Once daily', timing: med.timing || 'Morning' })))

  const addMedication = () => setMedications(prev => [...prev, { id: `setup-med-${Date.now()}`, name: '', frequency: 'Once daily', timing: 'Morning' }])
  const updateMedication = (id, changes) => setMedications(prev => prev.map(med => med.id === id ? { ...med, ...changes } : med))

  const saveSetup = () => {
    const validMedications = takesMedication === 'Yes' ? medications.filter(med => med.name.trim()) : []
    const timingToTime = { Morning: '08:00 AM', Afternoon: '01:00 PM', Evening: '06:00 PM', Bedtime: '10:00 PM' }
    setRoutineSchedule(prev => ({
      ...prev,
      configured: true,
      medicationSchedule: validMedications.map(med => ({ ...med, time: med.timing === 'Custom' ? (med.time || '08:00 AM') : timingToTime[med.timing] })),
    }))
    setDailyDefaults(prev => ({
      ...prev,
      configured: true,
      exercise: { ...(prev?.exercise || {}), usuallyExercise: worksOut || 'No', workoutTypes: worksOut === 'Yes' ? [workoutType] : [], frequency: `${frequency} days/week`, duration: `${duration} min` },
      medicationsCount: validMedications.length,
      medications: validMedications.map(med => ({ id: med.id, name: med.name })),
    }))
    showToast('Routine setup saved. Daily check-ins will use it as an optional shortcut.')
    close()
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal routine-setup-modal" onClick={event => event.stopPropagation()}>
        <button className="modal-close" onClick={close}><X size={18} /></button>
        <p className="eyebrow">OPTIONAL SETUP</p>
        <h2>Make future check-ins faster</h2>
        <p className="muted">Set only what applies. This is your routine, not today's activity record.</p>

        <div className="setup-block">
          <h3>Workout routine</h3>
          <QuickChoices label="Do you work out?" value={worksOut} options={['Yes', 'No']} onChange={setWorksOut} />
          {worksOut === 'Yes' && (
            <div className="setup-grid">
              <QuickChoices label="Workout type" value={workoutType} options={['Gym', 'Running', 'Walking', 'Sports', 'Home', 'Other']} onChange={setWorkoutType} />
              <QuickChoices label="Days per week" value={frequency} options={[1, 2, 3, 4, 5, 6, 7]} onChange={setFrequency} />
              <QuickChoices label="Typical duration" value={duration} options={[15, 30, 45, 60, 90].map(value => ({ value, label: `${value} min` }))} onChange={setDuration} />
            </div>
          )}
        </div>

        <div className="setup-block">
          <h3>Medication routine</h3>
          <QuickChoices label="Do you take medication regularly?" value={takesMedication} options={['Yes', 'No']} onChange={setTakesMedication} />
          {takesMedication === 'Yes' && (
            <div className="medication-setup-list">
              {medications.map(med => (
                <div className="medication-setup-row" key={med.id}>
                  <input value={med.name} placeholder="Medication name" onChange={event => updateMedication(med.id, { name: event.target.value })} />
                  <QuickChoices label="Frequency" value={med.frequency} options={['Once daily', 'Twice daily', 'Custom']} onChange={value => updateMedication(med.id, { frequency: value })} />
                  <QuickChoices label="Timing" value={med.timing} options={['Morning', 'Afternoon', 'Evening', 'Bedtime', 'Custom']} onChange={value => updateMedication(med.id, { timing: value })} />
                  {med.timing === 'Custom' && <TimeQuickPicker label="Custom timing" value={med.time || '08:00 AM'} options={['08:00 AM', '01:00 PM', '06:00 PM', '10:00 PM']} onChange={value => updateMedication(med.id, { time: value })} />}
                  <button type="button" className="remove-setup-item" onClick={() => setMedications(prev => prev.filter(item => item.id !== med.id))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="outline-button small-btn" onClick={addMedication}><Plus size={14} /> Add medication</button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="outline-button" onClick={close}>Cancel</button>
          <button className="primary-button" onClick={saveSetup}><Check size={16} /> Save setup</button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   6. QUICK ADD MODAL DRAWER
   ========================================================================== */

function QuickAddModal({ type, initialMealType = 'Breakfast', dailyLog, setDailyLog, close, showToast }) {
  const [mealType, setMealType] = useState(initialMealType)
  const [mealTime, setMealTime] = useState('08:00 AM')
  const [foodText, setFoodText] = useState('')

  const [actType, setActType] = useState('Walking')
  const [actTime, setActTime] = useState('05:00 PM')
  const [actMins, setActMins] = useState(30)

  const [waterLiters, setWaterLiters] = useState(1.8)

  const [bedtime, setBedtime] = useState('11:30 PM')
  const [wakeTime, setWakeTime] = useState('07:00 AM')

  const [medName, setMedName] = useState('')
  const [medTime, setMedTime] = useState('08:00 AM')

  const [eventType, setEventType] = useState('Headache')
  const [eventTime, setEventTime] = useState('04:00 PM')
  const [eventDesc, setEventDesc] = useState('')

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={close}><X size={18} /></button>
        <p className="eyebrow">QUICK LOG</p>
        <h2 style={{ textTransform: 'capitalize' }}>Add {type}</h2>

        {type === 'meal' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <label>Meal Type</label>
              <select value={mealType} onChange={e => setMealType(e.target.value)}>
                {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <TimeQuickPicker label="Suggested time" value={mealTime} options={mealTimeSuggestions(mealType)} onChange={setMealTime} />
            </div>
            <div className="form-group full-width">
              <label>What did you eat?</label>
              <input value={foodText} onChange={e => setFoodText(e.target.value)} placeholder="e.g. Oatmeal & berries" />
            </div>
          </div>
        )}

        {type === 'activity' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <label>Activity Type</label>
              <select value={actType} onChange={e => setActType(e.target.value)}>
                {['Walking', 'Running', 'Gym', 'Cycling', 'Sports', 'Yoga', 'Stretching', 'Household activity', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <TimeQuickPicker label="Start time" value={actTime} options={['07:00 AM', '12:00 PM', '05:00 PM', '07:00 PM']} onChange={setActTime} />
            </div>
            <div className="form-group full-width">
              <QuickChoices label="Duration" value={actMins} options={[15, 30, 45, 60, 90].map(value => ({ value, label: `${value} min` }))} onChange={setActMins} />
            </div>
          </div>
        )}

        {type === 'water' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <Stepper label="Water intake" value={waterLiters} step={0.25} max={6} suffix=" L" onChange={setWaterLiters} />
            </div>
          </div>
        )}

        {type === 'sleep' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <TimeQuickPicker label="Bedtime" value={bedtime} options={['10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM']} onChange={setBedtime} />
            </div>
            <div className="form-group full-width">
              <TimeQuickPicker label="Wake-up" value={wakeTime} options={['06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM']} onChange={setWakeTime} />
            </div>
          </div>
        )}

        {type === 'medication' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <label>Medication Name</label>
              <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Vitamin D" />
            </div>
            <div className="form-group full-width">
              <TimeQuickPicker label="Scheduled time" value={medTime} options={['08:00 AM', '12:00 PM', '06:00 PM', '10:00 PM']} onChange={setMedTime} />
            </div>
          </div>
        )}

        {type === 'event' && (
          <div className="section-grid-form" style={{ marginTop: '16px' }}>
            <div className="form-group full-width">
              <label>Event Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)}>
                {['Pain/discomfort', 'Headache', 'Digestive issue', 'Injury', 'Feeling unusually tired', 'Feeling sick', 'Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <TimeQuickPicker label="Time" value={eventTime} options={['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM']} onChange={setEventTime} />
            </div>
            <div className="form-group full-width">
              <label>What happened?</label>
              <input value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Describe event details..." />
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="outline-button" onClick={close}>Cancel</button>
          <button
            className="primary-button"
            onClick={() => {
              if (type === 'meal') {
                const newMeal = { id: `m-${Date.now()}`, type: mealType, time: mealTime, food: foodText, tags: ['Home-cooked'], quality: 4 }
                setDailyLog(prev => ({ ...prev, meals: [...(prev?.meals || []), newMeal] }))
                showToast(`Logged ${mealType}`)
              } else if (type === 'activity') {
                const newAct = { id: `a-${Date.now()}`, type: actType, startTime: actTime, durationMinutes: actMins }
                setDailyLog(prev => ({ ...prev, activities: [...(prev?.activities || []), newAct] }))
                showToast(`Logged ${actType}`)
              } else if (type === 'water') {
                setDailyLog(prev => ({ ...prev, hydration: { ...(prev?.hydration || {}), liters: waterLiters, didNotTrack: false } }))
                showToast(`Logged ${waterLiters}L water`)
              } else if (type === 'sleep') {
                setDailyLog(prev => ({ ...prev, sleep: { ...(prev?.sleep || {}), bedtime, wakeTime } }))
                showToast('Logged sleep times')
              } else if (type === 'medication') {
                const newMed = { id: `med-${Date.now()}`, name: medName, scheduledTime: medTime, status: 'Taken' }
                setDailyLog(prev => ({ ...prev, medications: [...(prev?.medications || []), newMed] }))
                showToast(`Logged ${medName}`)
              } else if (type === 'event') {
                setDailyLog(prev => ({ ...prev, healthEvent: { unusual: true, type: eventType, time: eventTime, whatHappened: eventDesc } }))
                showToast(`Logged ${eventType}`)
              }
              close()
            }}
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   7. ROUTINE MANAGEMENT PAGE ("MY ROUTINE")
   ========================================================================== */

function Routine({ routineSchedule, setRoutineSchedule, dailyDefaults, setShowEditDefaultsModal, showToast }) {
  const sleepSchedule = routineSchedule?.sleepSchedule || { bedtime: '11:30 PM', wakeTime: '07:00 AM' }
  const mealSchedule = routineSchedule?.mealSchedule || []
  const medicationSchedule = routineSchedule?.medicationSchedule || []

  return (
    <div className="page routine-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERMANENT SCHEDULE & DEFAULTS</p>
          <h1>My Routine & Defaults</h1>
          <p className="subtitle">
            <b>Default Routine</b> controls <i>when</i> things usually happen (timings/schedules). <b>Edit Defaults</b> controls <i>what</i> you usually do (quantities/values).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="outline-button" onClick={() => setShowEditDefaultsModal(true)}>
            <Edit3 size={16} /> Edit Defaults
          </button>
          <button className="primary-button" onClick={() => { setRoutineSchedule(prev => ({ ...prev, configured: true })); showToast('Permanent Routine Schedule saved!') }}>
            <Check size={16} /> Save Routine
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px', background: '#f8faf9', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p className="eyebrow">DEFAULT VALUES PREFERENCES</p>
            <h3 style={{ margin: '4px 0', fontSize: '16px', color: '#1e352b' }}>Edit Defaults (What you usually do)</h3>
            <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
              Configured usual meals ({dailyDefaults?.mealsCount || 3}), snacks ({dailyDefaults?.snacksCount || 0}), workout ({dailyDefaults?.exercise?.duration || '30 min'}), hydration ({dailyDefaults?.hydration?.amount || 2.0} {dailyDefaults?.hydration?.mode === 'Liters' ? 'L' : 'glasses'}), and typical sleep ({dailyDefaults?.typicalSleepDuration || '7h 30m'}).
            </p>
          </div>
          <button className="primary-button small-btn" onClick={() => setShowEditDefaultsModal(true)}>
            <Edit3 size={14} /> Edit Defaults
          </button>
        </div>
      </div>

      <div className="routine-layout">
        <div className="routine-form card">
          <div className="section-heading compact">
            <div>
              <h2>Recurring Sleep & Meal Timings</h2>
              <p className="muted">Default Routine schedule (when things happen). These remain saved for daily check-ins.</p>
            </div>
            <Target className="section-icon" size={20} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <b>Sleep Schedule</b>
            <div className="sleep-picker-grid" style={{ marginTop: '8px' }}>
              <TimeQuickPicker label="Usual bedtime" value={sleepSchedule.bedtime} options={['10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM']} onChange={value => setRoutineSchedule(prev => ({ ...prev, sleepSchedule: { ...(prev?.sleepSchedule || {}), bedtime: value } }))} />
              <TimeQuickPicker label="Usual wake-up" value={sleepSchedule.wakeTime} options={['06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM']} onChange={value => setRoutineSchedule(prev => ({ ...prev, sleepSchedule: { ...(prev?.sleepSchedule || {}), wakeTime: value } }))} />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <b>Meal Schedule</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {mealSchedule.map(m => (
                <div key={m.id} className="routine-time-row">
                  <span><b>{m.type}</b></span>
                  <TimeQuickPicker label="Usual time" value={m.time} options={['08:00 AM', '12:30 PM', '06:30 PM']} onChange={value => setRoutineSchedule(prev => ({ ...prev, mealSchedule: (prev?.mealSchedule || []).map(x => x.id === m.id ? { ...x, time: value } : x) }))} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-context card">
          <p className="eyebrow">RECURRING MEDICATIONS</p>
          <h2>Medication Schedule</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            {medicationSchedule.map(med => (
              <div key={med.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <input
                  value={med.name || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setRoutineSchedule(prev => ({
                      ...prev,
                      medicationSchedule: (prev?.medicationSchedule || []).map(x => x.id === med.id ? { ...x, name: val } : x)
                    }))
                  }}
                />
                <input
                  value={med.time || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setRoutineSchedule(prev => ({
                      ...prev,
                      medicationSchedule: (prev?.medicationSchedule || []).map(x => x.id === med.id ? { ...x, time: val } : x)
                    }))
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   8. HEAL AI CHATBOT COMPONENT
   ========================================================================== */

function AI({ messages, input, setInput, send, dailyLog, scoreData }) {
  const prompts = [
    'I have a headache.',
    'Why am I feeling tired?',
    'How is my hydration today?',
    'What is my Daily Activity Score?',
  ]

  const sleep = dailyLog?.sleep || {}
  const hydration = dailyLog?.hydration || {}
  const wellbeing = dailyLog?.wellbeing || {}
  const meals = dailyLog?.meals || []

  const sleepHrs = calculateSleepDurationText(sleep.bedtime, sleep.wakeTime) || 'Not logged'
  const waterText = hydration.liters ? `${hydration.liters} L` : 'Not tracked'

  return (
    <div className="page ai-page">
      <div className="ai-header">
        <div className="ai-title">
          <span className="bot-mark"><Bot size={22} /></span>
          <div>
            <p className="eyebrow">CONTEXT-AWARE ASSISTANT</p>
            <h1>Heal AI</h1>
            <p className="subtitle">Powered by your actual recorded daily activity context.</p>
          </div>
        </div>
        <span className="online"><i /> Online</span>
      </div>

      <div className="context-strip">
        <span><Sparkles size={16} /> Active Context:</span>
        <small><Check size={13} /> Sleep ({sleepHrs})</small>
        <small><Check size={13} /> Meals ({meals.length} recorded)</small>
        <small><Check size={13} /> Hydration ({waterText})</small>
        <small><Check size={13} /> Stress ({wellbeing.stress || 'N/A'}/5)</small>
        <small><Check size={13} /> Score ({scoreData?.score || 0}/100)</small>
      </div>

      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`message-row ${message.role}`} key={`${message.text}-${index}`}>
            <span className={message.role === 'ai' ? 'chat-avatar bot' : 'chat-avatar'}>
              {message.role === 'ai' ? <Bot size={15} /> : 'JD'}
            </span>
            <div className="message-bubble">
              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="suggested">
        <span>Try asking</span>
        {prompts.map((prompt) => (
          <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask Heal AI about your daily activity..."
        />
        <button onClick={() => send()}><Send size={17} /></button>
      </div>

      <p className="ai-disclaimer">
        <ShieldCheck size={14} /> Heal AI offers lifestyle observations, not medical diagnoses.
      </p>
    </div>
  )
}

/* ==========================================================================
   9. PROFILE COMPONENT
   ========================================================================== */

function Profile({ dailyLog, routineSchedule, scoreData, lifestyleAge, previousScore, previousLifestyleAge }) {
  const sleepSchedule = routineSchedule?.sleepSchedule || { bedtime: '11:30 PM', wakeTime: '07:00 AM' }
  const todayComplete = !isDailyLogEmpty(dailyLog)
  const displayScore = todayComplete ? (scoreData?.score ?? 0) : (previousScore ?? 0)
  const displayLifestyleAge = todayComplete ? (lifestyleAge ?? 35) : (previousLifestyleAge ?? lifestyleAge ?? 35)

  return (
    <div className="page profile-page">
      <div className="profile-hero">
        <div className="avatar large">JD</div>
        <div>
          <p className="eyebrow">MY PROFILE</p>
          <h1>Jordan Davis</h1>
          <p className="subtitle">Your health context, baseline routine, and preferences.</p>
        </div>
        <button className="outline-button"><Edit3 size={15} /> Edit profile</button>
      </div>

      <div className="profile-stats">
        <div>
          <span>{todayComplete ? 'Current Score' : 'Last Recorded Score'}</span>
          <b>{displayScore}</b>
          <small>/ 100</small>
        </div>
        <div>
          <span>Lifestyle Age</span>
          <b>{displayLifestyleAge}</b>
          <small>years</small>
        </div>
        <div>
          <span>Data Confidence</span>
          <b style={{ fontSize: '18px' }}>{scoreData?.confidence || 'Limited Data'}</b>
        </div>
        <div>
          <span>Weekly Streak</span>
          <b>🔥 4</b>
          <small>weeks</small>
        </div>
      </div>

      <div className="profile-grid">
        <div className="settings-card card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">ROUTINE SCHEDULE</p>
              <h2>Permanent Timings</h2>
            </div>
          </div>
          <div className="setting-line"><span>Bedtime</span><b>{sleepSchedule.bedtime}</b></div>
          <div className="setting-line"><span>Wake-up</span><b>{sleepSchedule.wakeTime}</b></div>
        </div>

        <div className="settings-card card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">NOTIFICATIONS</p>
              <h2>Check-in Reminders</h2>
            </div>
            <Bell size={19} />
          </div>
          <div className="toggle-line">
            <span>Daily Activity Reminder<small>"Take a moment to check in on your day."</small></span>
            <button className="toggle on"><i /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   10. EDIT DEFAULTS MODAL (NEW FEATURE: EDIT WHAT DEFAULTS CONTAIN)
   ========================================================================== */

function EditDefaultsModal({ dailyDefaults, setDailyDefaults, close, showToast }) {
  const [mealsCount, setMealsCount] = useState(dailyDefaults?.mealsCount || 3)
  const [meals, setMeals] = useState(() => {
    const initial = dailyDefaults?.meals || []
    const filled = [...initial]
    while (filled.length < 6) {
      const idx = filled.length
      filled.push({
        id: `m-def-${idx + 1}`,
        type: idx === 0 ? 'Breakfast' : idx === 1 ? 'Lunch' : idx === 2 ? 'Dinner' : 'Snack',
        description: '',
        duration: '',
      })
    }
    return filled
  })

  const [snacksCount, setSnacksCount] = useState(dailyDefaults?.snacksCount || 1)
  const [snacks, setSnacks] = useState(() => {
    const initial = dailyDefaults?.snacks || []
    const filled = [...initial]
    while (filled.length < 4) {
      filled.push({ id: `s-def-${filled.length + 1}`, name: `Snack ${filled.length + 1}`, description: '' })
    }
    return filled
  })

  const [usuallyExercise, setUsuallyExercise] = useState(dailyDefaults?.exercise?.usuallyExercise || 'Yes')
  const [exerciseFrequency, setExerciseFrequency] = useState(dailyDefaults?.exercise?.frequency || '3–4 days/week')
  const [workoutTypes, setWorkoutTypes] = useState(dailyDefaults?.exercise?.workoutTypes || ['Walking'])
  const [exerciseDuration, setExerciseDuration] = useState(dailyDefaults?.exercise?.duration || '30 min')

  const [hydrationMode, setHydrationMode] = useState(dailyDefaults?.hydration?.mode || 'Liters')
  const [hydrationAmount, setHydrationAmount] = useState(dailyDefaults?.hydration?.amount || 2.0)

  const [medicationsCount, setMedicationsCount] = useState(dailyDefaults?.medicationsCount || 2)
  const [medications, setMedications] = useState(() => {
    const initial = dailyDefaults?.medications || []
    const filled = [...initial]
    while (filled.length < 4) {
      filled.push({ id: `med-def-${filled.length + 1}`, name: `Medication ${filled.length + 1}` })
    }
    return filled
  })

  const [typicalSleepDuration, setTypicalSleepDuration] = useState(dailyDefaults?.typicalSleepDuration || '7h 30m')

  const [activityLevel, setActivityLevel] = useState(dailyDefaults?.sedentary?.activityLevel || 'Moderately active')
  const [typicalSedentaryHours, setTypicalSedentaryHours] = useState(dailyDefaults?.sedentary?.typicalSedentaryHours || '6 hours')

  const [healthyBehaviors, setHealthyBehaviors] = useState(dailyDefaults?.healthyBehaviors || ['Walking', 'Breaks'])

  const toggleWorkoutType = (type) => {
    setWorkoutTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const toggleHealthyBehavior = (item) => {
    setHealthyBehaviors(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const handleSave = () => {
    setDailyDefaults({
      configured: true,
      mealsCount,
      meals: meals.slice(0, mealsCount),
      snacksCount,
      snacks: snacks.slice(0, snacksCount),
      exercise: {
        usuallyExercise,
        frequency: exerciseFrequency,
        workoutTypes,
        duration: exerciseDuration,
      },
      hydration: {
        mode: hydrationMode,
        amount: parseFloat(hydrationAmount) || 2.0,
      },
      medicationsCount,
      medications: medications.slice(0, medicationsCount),
      typicalSleepDuration,
      sedentary: {
        activityLevel,
        typicalSedentaryHours,
      },
      wellbeingDefaults: { mood: 0, stress: 0, energy: 0 },
      healthyBehaviors,
    })
    showToast('Defaults updated successfully.')
    close()
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal edit-defaults-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '88vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={close}><X size={18} /></button>
        <p className="eyebrow">EDIT DEFAULTS</p>
        <h2 style={{ font: '800 23px Manrope', color: '#1e352b', margin: '4px 0 4px' }}>Edit Your Daily Defaults</h2>
        <p className="subtitle" style={{ marginBottom: '18px' }}>
          Set the values you usually use so you can fill your daily activity faster.
        </p>

        {/* 1. MEAL DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🍽️ Meal Defaults</div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>How many meals do you usually have each day?</label>
            <div className="chip-selector">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  className={mealsCount === n ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => {
                    setMealsCount(n)
                    if (meals.length < n) {
                      const updated = [...meals]
                      while (updated.length < n) {
                        updated.push({ id: `m-def-${updated.length + 1}`, type: 'Meal', description: '', duration: '' })
                      }
                      setMeals(updated)
                    }
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label style={{ font: '600 11px Manrope', color: '#465d53', display: 'block', marginBottom: '8px' }}>Your usual meals</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {meals.slice(0, mealsCount).map((m, idx) => (
              <div key={m.id || idx} className="default-item-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '8px', alignItems: 'center' }}>
                <select
                  value={m.type}
                  onChange={e => {
                    const val = e.target.value
                    setMeals(prev => prev.map((item, i) => i === idx ? { ...item, type: val } : item))
                  }}
                >
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Typical description (Optional)"
                  value={m.description || ''}
                  onChange={e => {
                    const val = e.target.value
                    setMeals(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item))
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (mealsCount > 1) {
                      setMealsCount(prev => prev - 1)
                      setMeals(prev => prev.filter((_, i) => i !== idx))
                    }
                  }}
                  style={{ border: 0, background: 'none', color: '#c25555', cursor: 'pointer', padding: '4px' }}
                  title="Delete meal"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          {mealsCount < 6 && (
            <button
              type="button"
              className="outline-button small-btn"
              onClick={() => {
                setMealsCount(prev => prev + 1)
                if (meals.length <= mealsCount) {
                  setMeals(prev => [...prev, { id: `m-def-${prev.length + 1}`, type: 'Meal', description: '', duration: '' }])
                }
              }}
              style={{ marginTop: '8px' }}
            >
              <Plus size={14} /> Add Meal
            </button>
          )}
        </div>

        {/* 2. SNACK DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🍿 Snack Defaults</div>
          <div className="form-group">
            <label>How many snacks do you usually have?</label>
            <div className="chip-selector">
              {[0, 1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  className={snacksCount === n ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setSnacksCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {snacksCount > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {snacks.slice(0, snacksCount).map((s, idx) => (
                <div key={s.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#687b72', fontWeight: '600' }}>Snack {idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Usual snack description (Optional)"
                    value={s.description || ''}
                    onChange={e => {
                      const val = e.target.value
                      setSnacks(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item))
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. EXERCISE / WORKOUT DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🏃 Exercise / Workout Defaults</div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Do you usually exercise?</label>
            <div className="chip-selector">
              {['No', 'Yes'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={usuallyExercise === opt ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setUsuallyExercise(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {usuallyExercise === 'Yes' && (
            <>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Usual workout frequency</label>
                <div className="chip-selector">
                  {['Every day', '5–6 days/week', '3–4 days/week', '1–2 days/week', 'Occasionally'].map(freq => (
                    <button
                      key={freq}
                      type="button"
                      className={exerciseFrequency === freq ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setExerciseFrequency(freq)}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Usual workout type (select all that apply)</label>
                <div className="chip-selector">
                  {['Walking', 'Running', 'Gym', 'Cycling', 'Sports', 'Yoga', 'Stretching', 'Home workout', 'Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={workoutTypes.includes(type) ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => toggleWorkoutType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Usual duration</label>
                <div className="chip-selector">
                  {['15 min', '30 min', '45 min', '60 min', '90+ min'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      className={exerciseDuration === dur ? 'chip-btn selected' : 'chip-btn'}
                      onClick={() => setExerciseDuration(dur)}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <small className="muted" style={{ display: 'block', marginTop: '4px' }}>
            ℹ️ Workout timing belongs in Set Default Routine, not here.
          </small>
        </div>

        {/* 4. HYDRATION DEFAULT */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">💧 Hydration Default</div>
          <div className="form-group">
            <label>How much water do you usually drink per day?</label>
            <div className="chip-selector" style={{ marginBottom: '10px' }}>
              {['Liters', 'Glasses/cups', "Don't track"].map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={hydrationMode === mode ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setHydrationMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            {hydrationMode !== "Don't track" && (
              <input
                type="number"
                step="0.1"
                placeholder={hydrationMode === 'Liters' ? 'e.g. 2.0 L' : 'e.g. 8 glasses'}
                value={hydrationAmount}
                onChange={e => setHydrationAmount(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* 5. MEDICATION DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">💊 Medication Defaults</div>
          <div className="form-group">
            <label>How many medication events do you usually have each day?</label>
            <div className="chip-selector" style={{ marginBottom: '10px' }}>
              {[0, 1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  className={medicationsCount === n ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setMedicationsCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {medicationsCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {medications.slice(0, medicationsCount).map((med, idx) => (
                <div key={med.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#556b60', fontWeight: '600' }}>Medication {idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Medication name (e.g. Vitamin D)"
                    value={med.name || ''}
                    onChange={e => {
                      const val = e.target.value
                      setMedications(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item))
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <small className="muted" style={{ display: 'block', marginTop: '6px' }}>
            ℹ️ Medication timing belongs in Default Routine.
          </small>
        </div>

        {/* 6. SLEEP DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">💤 Sleep Defaults</div>
          <div className="form-group">
            <label>Typical sleep duration</label>
            <input
              type="text"
              placeholder="e.g. 7h 30m"
              value={typicalSleepDuration}
              onChange={e => setTypicalSleepDuration(e.target.value)}
            />
            <small className="muted" style={{ marginTop: '4px' }}>
              Reference default value. Does not automatically overwrite today's actual sleep.
            </small>
          </div>
        </div>

        {/* 7. SEDENTARY / DAILY ACTIVITY DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🪑 Sedentary / Daily Activity Defaults</div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>How active are you usually during a normal day?</label>
            <div className="chip-selector">
              {['Mostly inactive', 'Lightly active', 'Moderately active', 'Very active'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={activityLevel === lvl ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setActivityLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Typical sedentary time</label>
            <div className="chip-selector">
              {['<2 hours', '2–4 hours', '4–6 hours', '6–8 hours', '8+ hours'].map(hrs => (
                <button
                  key={hrs}
                  type="button"
                  className={typicalSedentaryHours === hrs ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setTypicalSedentaryHours(hrs)}
                >
                  {hrs}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 8. DAILY WELLBEING DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🧠 Daily Wellbeing Defaults</div>
          <div style={{ background: '#f5faf7', border: '1px solid #d2e6da', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: '#385547' }}>
            ℹ️ Mood, Stress, and Energy are kept as <b>No Default</b> so subjective observations are entered fresh for each specific day.
          </div>
        </div>

        {/* 9. HEALTH EVENT DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🩺 Health Event Defaults</div>
          <div style={{ background: '#f5faf7', border: '1px solid #d2e6da', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: '#385547' }}>
            ℹ️ Health events (headaches, pain, symptoms) have <b>no defaults</b> and remain empty until recorded.
          </div>
        </div>

        {/* 10. HEALTHY BEHAVIOR DEFAULTS */}
        <div className="edit-defaults-section">
          <div className="edit-defaults-section-title">🌱 Healthy Behavior Defaults</div>
          <div className="form-group">
            <label>Activities you commonly perform (Optional)</label>
            <div className="chip-selector">
              {['Walking', 'Outdoor time', 'Stretching', 'Hobby', 'Social activity', 'Breaks'].map(item => (
                <button
                  key={item}
                  type="button"
                  className={healthyBehaviors.includes(item) ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => toggleHealthyBehavior(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="outline-button" onClick={close}>Cancel</button>
          <button type="button" className="primary-button" onClick={handleSave}>
            <Check size={16} /> Save Defaults
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
