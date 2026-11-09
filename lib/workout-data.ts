export interface WorkoutExercise {
  id: string;
  order: number;
  name: string;
  durationSeconds: number; // 60 seconds per exercise
  image: string;
  focus: string;
  description: string;
  tips: string[];
}

export const WORKOUT_EXERCISES: WorkoutExercise[] = [
  {
    id: 'jumping_jacks',
    order: 1,
    name: 'Jumping Jacks',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise1_jumping_jacks.png',
    focus: 'Cardio & Full Body',
    description: 'Start with feet together and arms at your sides, then jump while spreading arms and legs.',
    tips: [
      'Land softly on the balls of your feet',
      'Keep your core engaged throughout',
      'Maintain a steady, rhythmic breathing pattern',
    ],
  },
  {
    id: 'squats',
    order: 2,
    name: 'Squats',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise2_squats.png',
    focus: 'Quads, Glutes & Hamstrings',
    description: 'Lower your hips down and back as if sitting in a chair, keeping knees aligned over ankles.',
    tips: [
      'Keep your chest high and back straight',
      'Drive weight up through your heels',
      'Lower until thighs are parallel to floor',
    ],
  },
  {
    id: 'pushups',
    order: 3,
    name: 'Pushups',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise3_pushups.png',
    focus: 'Chest, Shoulders & Triceps',
    description: 'Place hands shoulder-width apart, lower your chest until near the floor, then press back up.',
    tips: [
      'Maintain a rigid straight plank line',
      'Keep elbows at a 45-degree angle from torso',
      'Do knee pushups if modifying for endurance',
    ],
  },
  {
    id: 'lunges',
    order: 4,
    name: 'Lunges',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise4_lunges.png',
    focus: 'Quads, Calves & Balance',
    description: 'Step one foot forward and lower hips until both knees bend at approximately 90 degrees.',
    tips: [
      'Keep front knee directly above your front ankle',
      'Keep your torso upright and shoulders relaxed',
      'Alternate legs smoothly with each repetition',
    ],
  },
  {
    id: 'plank',
    order: 5,
    name: 'Plank',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise5_plank.png',
    focus: 'Core, Stability & Shoulders',
    description: 'Hold a static position resting on forearms and toes, forming a straight line head to heels.',
    tips: [
      'Do not allow lower back or hips to sag',
      'Tighten your glutes and draw navel toward spine',
      'Breathe smoothly and consistently',
    ],
  },
  {
    id: 'mountain_climbers',
    order: 6,
    name: 'Mountain Climbers',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise6_mountain_climbers.png',
    focus: 'Core & High Intensity Cardio',
    description: 'In a high plank position, rapidly alternate driving knees towards your chest.',
    tips: [
      'Keep shoulders stacked directly over wrists',
      'Keep hips level and avoid bouncing excessively',
      'Maintain a brisk, steady pace',
    ],
  },
  {
    id: 'burpees',
    order: 7,
    name: 'Burpees',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise7_burpees.png',
    focus: 'Full Body Explosive Conditioning',
    description: 'From standing, drop into a squat, kick feet back to plank, return feet, and jump upward.',
    tips: [
      'Pace yourself steadily over the full minute',
      'Land softly when jumping up',
      'Keep core braced when kicking back to plank',
    ],
  },
  {
    id: 'high_knees',
    order: 8,
    name: 'High Knees',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise8_high_knees.png',
    focus: 'Cardio, Hip Flexors & Agility',
    description: 'Run in place while driving knees up towards hip height with an active arm swing.',
    tips: [
      'Pump arms rhythmically with your legs',
      'Stay light on your feet',
      'Keep your chest proud and avoid leaning back',
    ],
  },
  {
    id: 'glute_bridge',
    order: 9,
    name: 'Glute Bridge',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise9_glute_bridge.png',
    focus: 'Glutes, Lower Back & Hamstrings',
    description: 'Lie on your back with knees bent, feet flat, and lift hips toward the ceiling squeezing glutes.',
    tips: [
      'Pause and squeeze at the top of the bridge',
      'Do not hyperextend your lower back',
      'Drive through your heels',
    ],
  },
  {
    id: 'bicycle_crunches',
    order: 10,
    name: 'Bicycle Crunches',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise10_bicycle_crunches.png',
    focus: 'Abs & Obliques',
    description: 'Lie on back and rotate torso, bringing opposite elbow towards opposite knee in a pedaling motion.',
    tips: [
      'Focus on slow, controlled torso rotation',
      'Do not pull on your neck with your hands',
      'Fully extend the trailing leg',
    ],
  },
  {
    id: 'superman',
    order: 11,
    name: 'Superman',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise11_superman.png',
    focus: 'Lower Back & Posterior Chain',
    description: 'Lie face down and simultaneously raise arms, chest, and legs off the floor, holding briefly.',
    tips: [
      'Keep neck neutral and look down toward the floor',
      'Squeeze glutes and lower back at the top for 1-2 seconds',
      'Control the descent smoothly',
    ],
  },
  {
    id: 'bear_crawl',
    order: 12,
    name: 'Bear Crawl',
    durationSeconds: 60,
    image: '/assets/aistudio/exercises/exercise12_bear_crawl.png',
    focus: 'Full Body Coordination & Core',
    description: 'Hover knees inches above the floor on all fours, crawling forward and backward with control.',
    tips: [
      'Keep knees hovering just 2 inches off the ground',
      'Maintain a flat back like a tabletop',
      'Move opposite hand and foot simultaneously',
    ],
  },
];

