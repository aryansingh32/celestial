// Handcrafted fragment library for generating rich fallback palm readings.
// Combines fragments to produce thousands of unique variations.

export type ReadingSections = {
  personality: string;
  love: string;
  career: string;
  wealth: string;
  lifePath: string;
  challenges: string;
  guidance: string;
  luckyColor: string;
  luckyNumber: string;
  luckyDay: string;
  summary: string;
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const join2 = (a: string[]) => `${pick(a)} ${pick(a)}`;

const personality = [
  "Your palm reveals a soul that carries both quiet strength and a restless creative spark.",
  "There is a rare warmth in the way your lines curve — a sign of a heart that leads with empathy.",
  "Your hand suggests an intuitive mind, one that senses truths long before words can shape them.",
  "A steady confidence lives in your palm, softened by a natural, disarming curiosity.",
  "Your lines speak of someone who feels deeply, thinks carefully, and moves with grace.",
  "There is a magnetic quality in your palm — people are drawn to your calm assurance.",
  "Your hand carries the mark of a dreamer who has learned the discipline of doing.",
];
const personalityExtra = [
  "You are more resilient than you often give yourself credit for.",
  "You have a rare ability to make others feel truly seen.",
  "Your imagination is one of your quietest superpowers.",
  "You carry a natural sense of timing, knowing when to act and when to wait.",
  "There is a steady inner compass guiding your choices.",
];

const love = [
  "In love, your palm suggests a heart that opens slowly but loves without holding back.",
  "Your heart line indicates a season of meaningful connection ahead — one built on truth, not performance.",
  "You are drawn to depth rather than spectacle, and love that honors that will find you.",
  "A gentle chapter of emotional clarity is beginning to unfold in your relationships.",
  "Your palm points to a love that will feel like recognition rather than pursuit.",
];
const loveExtra = [
  "Allow yourself to receive care as easily as you give it.",
  "The right people will match your energy without asking you to shrink.",
  "A soft conversation this month may open a door you did not expect.",
];

const career = [
  "Your fate line suggests you are quietly outgrowing what once fit — new work is calling.",
  "There is a creative direction in your path that has been whispering for a while; it is worth listening to.",
  "Your palm indicates that discipline and vision are finally beginning to align in your work.",
  "A period of recognition is approaching, especially where you have been consistent in silence.",
  "Your hand shows a natural leadership that emerges when you stop waiting for permission.",
];
const careerExtra = [
  "Say yes to the opportunity that scares you a little — that is usually the correct one.",
  "A collaboration begun this season could reshape your path in the best way.",
  "Your best work comes when you build slowly and refuse shortcuts.",
];

const wealth = [
  "Your palm suggests abundance built through patience rather than luck.",
  "There are signs of steady growth — small, wise choices compounding into real freedom.",
  "Your money line shows resilience; you recover from setbacks faster than most.",
  "A gentle reminder from your palm: prosperity follows clarity of intention.",
  "Your hand indicates a healthy relationship with wealth is forming — one rooted in enough, not more.",
];

const lifePath = [
  "Your life line is deep and full — it suggests vitality and a journey lived on your own terms.",
  "You are entering a chapter where your outer life begins to reflect your inner one.",
  "Your path is not a straight line, and that is exactly its beauty; each turn has taught you something essential.",
  "There is a quiet turning point ahead — subtle, but it will reorient your next several years.",
  "Your palm speaks of a life that gathers meaning slowly, then all at once.",
];

const challenges = [
  "A gentle caution: do not carry the weight of decisions that are not yours to make.",
  "Be mindful of overextending yourself for people who have not asked you to.",
  "One small challenge ahead may test your patience — meet it with rest, not force.",
  "Watch for the temptation to rush a decision that deserves stillness.",
];
const challengesExtra = [
  "Protect your energy in the mornings — that is where your clarity lives.",
  "Say no more often, kindly and without apology.",
  "Give yourself permission to change your mind.",
];

const guidance = [
  "Trust the pace of your own becoming — it is right on time.",
  "The next right step is smaller than you think, and closer than you imagined.",
  "Return to what once made you feel alive; the answer is often there.",
  "Let your intuition lead this season; it is unusually accurate right now.",
  "Simplify. What matters will remain, and what remains will grow.",
];

const colors = [
  "Deep Indigo", "Royal Purple", "Champagne Gold", "Emerald", "Midnight Blue",
  "Rose Quartz", "Sage Green", "Amber", "Ivory", "Bronze", "Sapphire",
];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function luckyNumber(): string {
  const n = 1 + Math.floor(Math.random() * 44);
  return String(n);
}

export function generateFallbackReading(seed?: number): ReadingSections {
  // Optional seed variance via seed for palm-shape-influenced variety
  if (typeof seed === "number") Math.random(); // keep simple; entropy comes from Math.random
  const p = `${pick(personality)} ${pick(personalityExtra)}`;
  const l = `${pick(love)} ${pick(loveExtra)}`;
  const c = `${pick(career)} ${pick(careerExtra)}`;
  const w = pick(wealth);
  const lp = pick(lifePath);
  const ch = `${pick(challenges)} ${pick(challengesExtra)}`;
  const g = `${pick(guidance)} ${pick(guidance)}`;
  const color = pick(colors);
  const num = luckyNumber();
  const day = pick(days);
  const summary = `A season of quiet realignment: your palm suggests strength, tender love, and a career that is finally catching up to your vision.`;
  return {
    personality: p,
    love: l,
    career: c,
    wealth: w,
    lifePath: lp,
    challenges: ch,
    guidance: g,
    luckyColor: color,
    luckyNumber: num,
    luckyDay: day,
    summary,
  };
}

export const READING_KEYS: Array<keyof ReadingSections> = [
  "personality","love","career","wealth","lifePath","challenges","guidance","luckyColor","luckyNumber","luckyDay",
];