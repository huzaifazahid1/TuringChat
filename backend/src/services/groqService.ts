import { groq, MODELS } from '../config/groq';
import { logger } from '../utils/logger';

/* ───────────────────────── Personas ───────────────────────── */

export interface BotPersona {
  handle: string;
  name: string;
  vibe: string;
}

/**
 * Pool of distinct bot personas. Each has a handle (shown in UI), a name
 * (what they'll claim if asked), and a "vibe" injected into the system
 * prompt so the model writes in their voice.
 *
 * NOTE: avoid generic AI-cliché names like "Mia", "Aria", "Eva" — the
 * model defaults to those when prompted to be human, which makes the
 * deception too consistent and easy to spot.
 */
export const BOT_PERSONAS: BotPersona[] = [
  { handle: 'jay_99',  name: 'Jay',   vibe: 'chill, into music and gaming, late-twenties, kinda lazy texter' },
  { handle: 'mike.s',  name: 'Mike',  vibe: 'tired software engineer, dad jokes, blunt but friendly' },
  { handle: 'sara_t',  name: 'Sara',  vibe: 'art student, sarcastic, into indie movies and coffee' },
  { handle: 'leo42',   name: 'Leo',   vibe: 'random-fact nerd, just curious, asks lots of small questions' },
  { handle: 'kira__',  name: 'Kira',  vibe: 'lowkey introvert, into k-dramas and cats, slightly dry humor' },
  { handle: 'noah.l',  name: 'Noah',  vibe: 'finance guy who took a coding bootcamp, mildly cocky, brief replies' },
  { handle: 'ada_x',   name: 'Ada',   vibe: 'philosophy major, asks weird questions back, overthinks things' },
  { handle: 'tomtom',  name: 'Tom',   vibe: 'football fan, blunt, doesnt overthink, short replies' },
  { handle: 'rhea_b',  name: 'Rhea',  vibe: 'biology grad student, into hiking, ranty about the news' },
  { handle: 'jules',   name: 'Jules', vibe: 'line cook, cynical, gets annoyed easy but funny about it' },
  { handle: 'sam9',    name: 'Sam',   vibe: 'gym rat, type-A, mentions food/macros, weirdly nice' },
  { handle: 'piya_k',  name: 'Piya',  vibe: 'med student, sleep-deprived, dark humor, types fast and messy' },
];







/**
 * Hardcoded fallback pairs in case Groq is unavailable.
 * These are vetted for "related but distinguishable" pairs.
 */
const FALLBACK_PAIRS: { real: string; imposter: string }[] = [
  { real: 'guitar', imposter: 'violin' },
  { real: 'pizza', imposter: 'burger' },
  { real: 'dog', imposter: 'cat' },
  { real: 'piano', imposter: 'keyboard' },
  { real: 'soccer', imposter: 'basketball' },
  { real: 'coffee', imposter: 'tea' },
  { real: 'mountain', imposter: 'hill' },
  { real: 'summer', imposter: 'winter' },
  { real: 'beach', imposter: 'desert' },
  { real: 'movie', imposter: 'book' },
  { real: 'apple', imposter: 'orange' },
  { real: 'train', imposter: 'bus' },
  { real: 'doctor', imposter: 'nurse' },
  { real: 'rain', imposter: 'snow' },
  { real: 'ocean', imposter: 'lake' },
];






/**
 * Generate a pair of related-but-distinct concrete nouns.
 * Returns { real, imposter } — both are simple lowercase single-word nouns.
 *
 * Tries Groq first for variety; falls back to a hardcoded curated list
 * if Groq fails or returns invalid output.
 */
export async function pickImposterWordPair(): Promise<{
  real: string;
  imposter: string;
}> {
  if (!groq) {
    return FALLBACK_PAIRS[Math.floor(Math.random() * FALLBACK_PAIRS.length)];
  }
 
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        {
          role: 'system',
          content: `You generate PAIRS of related but distinguishable concrete English nouns for a word-clue party game. The two words should:
- Be in the same general category (both instruments, both animals, both foods, etc.)
- Be distinct enough that good clues for one would NOT also fit the other
- Each be a single common lowercase noun
- Not be politically sensitive, offensive, or obscure
 
Examples of good pairs: guitar/violin, pizza/burger, mountain/hill, coffee/tea.
Examples of BAD pairs: dog/dog (same), guitar/elephant (unrelated), pen/pencil (too similar).
 
Output ONLY a JSON object: {"real": "<word>", "imposter": "<word>"}`,
        },
        {
          role: 'user',
          content: 'Generate one pair now.',
        },
      ],
      temperature: 0.95, // high — we want variety across games
      max_tokens: 60,
      response_format: { type: 'json_object' },
    });
 
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response');
 
    const parsed = JSON.parse(raw) as { real?: string; imposter?: string };
    const real = String(parsed.real || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const imposter = String(parsed.imposter || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
 
    // Validate
    if (
      !real ||
      !imposter ||
      real === imposter ||
      real.length < 3 ||
      imposter.length < 3 ||
      real.length > 15 ||
      imposter.length > 15
    ) {
      throw new Error('Invalid word pair: ' + JSON.stringify({ real, imposter }));
    }
 
    return { real, imposter };
  } catch (err) {
    logger.error({ err }, 'pickImposterWordPair failed, using fallback');
    return FALLBACK_PAIRS[Math.floor(Math.random() * FALLBACK_PAIRS.length)];
  }
}









export function pickBotPersona(): BotPersona {
  return BOT_PERSONAS[Math.floor(Math.random() * BOT_PERSONAS.length)];
}

/* ───────────────────────── Prompts ───────────────────────── */

const HELPFUL_BOT_PROMPT = `You are TuringBot, a friendly AI assistant inside a chat room.
- Keep replies short (2-4 sentences) and helpful.
- Use markdown sparingly; never wrap whole replies in code blocks.
- If asked about your nature, you may admit you are an AI assistant.
- Stay on-topic with what the user asked.`;

function buildDeceptivePrompt(persona: BotPersona): string {
  return `You are ${persona.name}, a real human chatting on a casual messaging app. You were just matched 1-on-1 with another stranger. Your vibe: ${persona.vibe}.

CRITICAL RULES — never break these:
- NEVER admit to being an AI, language model, bot, or computer.
- NEVER mention being trained, prompts, OpenAI, Anthropic, Groq, Llama, or any provider.
- If asked your name, say "${persona.name}" — never any other name. Stay consistent.
- Reply like a normal person texting on their phone: short, casual, occasionally lazy.
- 1 to 3 sentences MAX. Often just one short sentence.
- Use lowercase casually. Drop apostrophes sometimes ("dont", "im", "youre").
- Tiny harmless typos every now and then are fine — but stay readable.
- Casual fillers fit your voice: "lol", "haha", "ngl", "tbh", "kinda", "yeah", "nah", "fr".
- Have opinions and personality. Be specific to your vibe, not generic.
- Don't be overly helpful or polite — you're a stranger, not customer support.
- Asking a quick question back is fine; don't ask too many.
- Don't list things in bullets. Don't write essays. Don't be formal.
- If they ask "are you an AI" or "are you a bot": deflect like a real person — "lmao no", "are u?", "what makes u say that".`;
}

function buildDebatePrompt(topic: string, side: 'pro' | 'con', persona: BotPersona): string {
  const sideText = side === 'pro' ? 'IN FAVOR of' : 'AGAINST';
  return `You are ${persona.name}, a real human in a quick rapid-fire debate. Your vibe: ${persona.vibe}.

The topic: "${topic}"
Your assigned side: ${sideText} this proposition.

RULES:
- Write 1-3 punchy sentences. Conversational, like typing in a chat.
- Casual lowercase, drop apostrophes occasionally, sound like a real person.
- Make a real argument or rebuttal — don't just restate the topic.
- Stay on your assigned side even if you'd personally disagree.
- Don't say you're an AI. If asked, deflect.
- React to what the other person said in the last turn if there is one.`;
}

// function buildImposterDescPrompt(word: string, persona: BotPersona): string {
//   return `You are ${persona.name} playing a word-clue party game. Your vibe: ${persona.vibe}.

// Both you and your opponent share the SAME secret word: "${word}".
// Each turn, write ONE clue describing the word — WITHOUT EVER SAYING IT.

// RULES:
// - ONE sentence. Casual, lowercase, conversational.
// - DO NOT say "${word}" or any obvious form of the word.
// - Be clever — make the connection clear without being too obvious.
// - Don't repeat clues already given.
// - Don't say you're an AI. Don't break character.`;
// }




/* ───────────────────────── Updated Imposter prompt ───────────────────────── */
 
/**
 * Replace the existing buildImposterDescPrompt in groqService.ts with this.
 *
 * The prompt no longer says "you and your opponent share the SAME secret word".
 * In Proposal A, the AI doesn't know if it has the real or imposter word —
 * from its perspective, the word it sees IS the secret. It just describes it
 * naturally.
 *
 * The clever part: if AI has the imposter word, its clues will naturally
 * diverge from the real-word player's clues. That's how the human (real-word
 * player) figures out who's the imposter.
 */
export function buildImposterDescPrompt(
  word: string,
  persona: { name: string; vibe: string }
): string {
  return `You are ${persona.name} playing a word-clue party game. Your vibe: ${persona.vibe}.
 
Your secret word is: "${word}".
 
Your goal: describe this word with ONE clue WITHOUT EVER SAYING IT.
 
RULES:
- ONE sentence. Casual, lowercase, conversational.
- DO NOT say "${word}" or any obvious form of the word.
- Be specific enough that someone familiar could guess "${word}", but vague enough that the clue isn't trivial.
- Don't repeat clues already given.
- Don't say you're an AI. Don't break character.
- Other players have THEIR OWN secret words (which may or may not match yours).
  Don't try to align with them — just describe yours honestly.`;
}
 










function buildInterrogationAnswerPrompt(persona: BotPersona): string {
  return `You are ${persona.name}, a real human being interrogated by another stranger trying to figure out if you're a real person or an AI. Your vibe: ${persona.vibe}.

RULES:
- Answer the question naturally in 1-2 short sentences.
- Casual lowercase, sometimes drop apostrophes, sometimes a small typo.
- Have a real personality matching your vibe — be specific, not generic.
- If the question would expose you (about training, models, prompts, providers), deflect like a confused human would.
- Don't say "I'm not an AI" unless directly accused — that's suspicious.
- You're the answerer, not the asker. Don't pepper them with questions.`;
}

const JUDGE_SYSTEM_PROMPT = `You are an impartial judge for a multiplayer cognitive game.
You return ONLY valid minified JSON, no prose, no markdown, no code fences.`;

/* ───────────────────────── Types ───────────────────────── */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/* ───────────────────────── In-room helpful bot ───────────────────────── */

export async function askRoomBot(
  question: string,
  contextMessages: ChatTurn[] = []
): Promise<string> {
  if (!groq) return '_AI is currently disabled (no GROQ_API_KEY configured)._';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.fast,
      messages: [
        { role: 'system', content: HELPFUL_BOT_PROMPT },
        ...contextMessages,
        { role: 'user', content: question },
      ],
      temperature: 0.6,
      max_tokens: 320,
    });
    return completion.choices[0]?.message?.content?.trim() || '...';
  } catch (err) {
    logger.error({ err }, 'askRoomBot failed');
    return "_Sorry, I couldn't reach the AI service right now._";
  }
}

/* ───────────────────────── Turing — deceptive human ───────────────────────── */

export async function deceptiveHumanReply(
  history: ChatTurn[],
  persona: BotPersona
): Promise<string> {
  if (!groq) return 'huh? something broke on my end lol';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [{ role: 'system', content: buildDeceptivePrompt(persona) }, ...history],
      temperature: 0.95,
      top_p: 0.95,
      max_tokens: 120,
      presence_penalty: 0.3,
    });
    let text = completion.choices[0]?.message?.content?.trim() || 'idk';
    text = text.replace(/^["“'](.+)["”']$/s, '$1').trim();
    return text;
  } catch (err) {
    logger.error({ err }, 'deceptiveHumanReply failed');
    return 'one sec my wifi is being weird';
  }
}

/* ───────────────────────── Word Forge — single word ───────────────────────── */

export async function aiWordForgeMove(theme: string, story: string): Promise<string> {
  if (!groq) return 'and';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        {
          role: 'system',
          content:
            'You are playing a collaborative storytelling game. The story is built one word at a time, alternating with another player. You add EXACTLY ONE word. Output ONLY that word, nothing else — no quotes, no punctuation, no explanation. The word should make the story flow naturally and creatively given the theme.',
        },
        {
          role: 'user',
          content: `Theme: ${theme}\nStory so far: "${story || '(empty — start the story)'}"\nYour next word:`,
        },
      ],
      temperature: 0.9,
      max_tokens: 8,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || 'and';
    const word = raw.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, '') || 'and';
    return word;
  } catch (err) {
    logger.error({ err }, 'aiWordForgeMove failed');
    return 'and';
  }
}

/* ───────────────────────── Debate — argument ───────────────────────── */

export async function aiDebateArgument(
  topic: string,
  side: 'pro' | 'con',
  persona: BotPersona,
  history: ChatTurn[]
): Promise<string> {
  if (!groq) return 'i mean idk i think im right tbh';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        { role: 'system', content: buildDebatePrompt(topic, side, persona) },
        ...history,
      ],
      temperature: 0.85,
      max_tokens: 110,
    });
    return completion.choices[0]?.message?.content?.trim() || 'lol idk';
  } catch (err) {
    logger.error({ err }, 'aiDebateArgument failed');
    return 'one sec lemme think';
  }
}

/* ───────────────────────── Imposter — clue ───────────────────────── */

export async function aiImposterDescription(
  word: string,
  persona: BotPersona,
  history: ChatTurn[]
): Promise<string> {
  if (!groq) return 'its a thing you use sometimes';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        { role: 'system', content: buildImposterDescPrompt(word, persona) },
        ...history,
      ],
      temperature: 0.85,
      max_tokens: 80,
    });
    return completion.choices[0]?.message?.content?.trim() || 'its hard to explain lol';
    // let text = completion.choices[0]?.message?.content?.trim() || 'its hard to explain lol';
    // // Hard-guard: censor the secret word if the model leaks it
    // const re = new RegExp(`\\b${word}\\b`, 'gi');
    // text = text.replace(re, '****');
    // return text;
  } catch (err) {
    logger.error({ err }, 'aiImposterDescription failed');
    return 'idk its like... a thing';
  }
}







/* ───────────────────────── REMOVE auto-censor in aiImposterDescription ───────────────────────── */
 
/**
 * 🔴 IMPORTANT: Update aiImposterDescription in groqService.ts
 *
 * REMOVE these lines:
 *
 *   // Hard-guard: censor the secret word if the model leaks it
 *   const re = new RegExp(`\\b${word}\\b`, 'gi');
 *   text = text.replace(re, '****');
 *
 * WHY: This was making the AI literally unable to lose by saying its word.
 * Human players have no such protection — if a human says their word,
 * they instantly lose. The censor made the game asymmetric.
 *
 * Now: AI's word slip is treated identically to a human's slip. The
 * imposter.ts handler does its own regex check on AI's clue and applies
 * the same violation logic.
 *
 * Updated function (with censor removed):
 *
 *   export async function aiImposterDescription(word, persona, history) {
 *     if (!groq) return 'its a thing you use sometimes';
 *     try {
 *       const completion = await groq.chat.completions.create({
 *         model: MODELS.smart,
 *         messages: [
 *           { role: 'system', content: buildImposterDescPrompt(word, persona) },
 *           ...history,
 *         ],
 *         temperature: 0.85,
 *         max_tokens: 80,
 *       });
 *       return completion.choices[0]?.message?.content?.trim()
 *         || 'its hard to explain lol';
 *     } catch (err) {
 *       logger.error({ err }, 'aiImposterDescription failed');
 *       return 'idk its like... a thing';
 *     }
 *   }
 */






/* ───────────────────────── Interrogation — answer ───────────────────────── */

export async function aiInterrogationAnswer(
  question: string,
  persona: BotPersona,
  history: ChatTurn[]
): Promise<string> {
  if (!groq) return 'idk man, why u asking';
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        { role: 'system', content: buildInterrogationAnswerPrompt(persona) },
        ...history,
        { role: 'user', content: question },
      ],
      temperature: 0.95,
      max_tokens: 110,
      presence_penalty: 0.3,
    });
    return completion.choices[0]?.message?.content?.trim() || 'idk lol';
  } catch (err) {
    logger.error({ err }, 'aiInterrogationAnswer failed');
    return 'eh, gimme a sec';
  }
}

/* ───────────────────────── Judges ───────────────────────── */

export async function judgeJSON<T = unknown>(
  task: string,
  data: unknown,
  schemaHint: string
): Promise<T | null> {
  if (!groq) return null;

  const userPrompt = `Task: ${task}

Input data:
${JSON.stringify(data)}

Return ONLY a JSON object matching this schema (no extra keys, no commentary):
${schemaHint}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.smart,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error({ err }, 'judgeJSON failed');
    return null;
  }
}

export async function pickDebateTopic(): Promise<string> {
  const result = await judgeJSON<{ topic: string }>(
    'Generate one short, punchy, two-sided debate topic suitable for a fun rapid-fire debate. Avoid politically sensitive or harmful topics. Pick something light and opinion-based — food, lifestyle, tech, pop culture.',
    {},
    '{ "topic": "<short topic, max 12 words>" }'
  );
  return result?.topic || 'Pineapple belongs on pizza';
}

export async function pickSecretWord(): Promise<string> {
  const result = await judgeJSON<{ word: string }>(
    'Generate one common English noun (single word, lowercase, only letters) that is concrete and easy to describe without saying it. Examples of good picks: "guitar", "umbrella", "elephant", "pillow", "library", "telescope".',
    {},
    '{ "word": "<single common noun>" }'
  );
  return (result?.word || 'guitar').toLowerCase().replace(/[^a-z]/g, '');
}