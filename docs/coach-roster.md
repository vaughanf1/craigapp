# Coach roster — demographics against style

Twelve fictional coaches, twelve methodologies. No coach is named after, modelled on
or "in the style of" any real person. Catchphrases are original. Each coach's voice
lives in `server/shared/voices/<id>.json`; the roster is `server/shared/coaches.ts`.

## The grid

| Coach | Gender | Age | Heritage | Accent | Methodology | Tone band | Clip |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Maya | F | 20s | Black British | London | High-energy hype | soft | kept |
| Jake | M | 20s | White British | Cardiff | Warm encourager | soft | kept |
| Sophia | F | 30s | White British | Edinburgh | Stoic | soft | kept |
| Marcus | M | 30s | Black British | South London | Commercial operator | firm | kept |
| Fiona | F | 30s | White Scottish | Glasgow | High standards | firm | **new** |
| David | M | 40s | White British | Leeds | Systems & habits | analytical | kept |
| Karim | M | 40s | British Lebanese | Birmingham (Lebanese-born) | Mindfulness | soft | **new** |
| Priya | F | 40s | British Indian | Leicester | Accountability partner | analytical | **new** |
| Margaret | F | 50s | White British | Surrey (RP) | Socratic questioner | analytical | kept |
| Arun | M | 50s | British Indian | Bradford | Strategic planner | analytical | **new** |
| Ken | M | 60s | British Chinese | Liverpool (Hong Kong-born) | Athletic performance | firm | **new** |
| Grace | F | 60s | Black British (Nigerian-born) | London | Plain-spoken mentor | firm | **new** |

Retired: Elena (warm mentor, overlapped with Margaret and Jake) and Richard
(old-school discipline — the stereotype pairing we are deliberately avoiding).
Existing profiles pointing at them resolve to Priya and Fiona respectively
(`RETIRED_COACHES` in `coaches.ts`).

## Pattern check

Styles grouped into three tone bands, then counted by demographic. **Tone note (8 Oct 2026, after Craig's first test):** "firm" means high standards and plain speaking, never punitive. Every coach follows the Be More Way in `server/src/coach/rules.ts` (kind, positive, no judgement, no refusals, no "do you still want this"), and the hard edge is reserved for measurable goals — the life area sets the register, not the coach. The voice guides were rewritten to match.

| Band | Coaches | Women / Men | White / Black / S. Asian / E. Asian / M. Eastern | Ages |
| --- | --- | --- | --- | --- |
| Firm (discipline, operator, mentor, athletic) | Fiona, Marcus, Grace, Ken | 2 / 2 | 1 / 2 / 0 / 1 / 0 | 30s, 30s, 60s, 60s |
| Soft (hype, encourager, stoic, mindfulness) | Maya, Jake, Sophia, Karim | 2 / 2 | 2 / 1 / 0 / 0 / 1 | 20s, 20s, 30s, 40s |
| Analytical (systems, partner, socratic, strategist) | David, Priya, Margaret, Arun | 2 / 2 | 2 / 0 / 2 / 0 / 0 | 40s, 40s, 50s, 50s |

- **Gender**: 2/2 in every band. The disciplinarian is a woman in her 30s; the nurturing encourager is a man in his 20s.
- **Ethnicity**: no band is all-white or all-minority. The two Black coaches in the hard band (Marcus, Grace) are balanced by the Black coach in the soft band (Maya), and the hard band also has a white and an East Asian coach. The two South Asian coaches are both analytical (Priya, Arun) — a mild cluster, noted below.
- **Age**: the soft band skews younger because the two kept 20s clips (Maya, Jake) are both naturally soft styles. The hard band has both ends (30s and 60s), so "older = harsher" doesn't hold.
- **Named stereotypes avoided**: drill sergeant ≠ older man (Fiona); hype ≠ young Black man (Maya is a Black woman, Jake is the white 20s man and he's the *encourager*); mindfulness ≠ East Asian (Karim; Ken the East Asian coach is the *athletic* coach); strategist ≠ East Asian (Arun is South Asian, 50s; Margaret, the only RP voice, asks questions rather than issues orders); plain-spoken old-school mentor ≠ white man (Grace).

**Residual pattern worth knowing about**: the two South Asian coaches both sit in the analytical band. Swapping Priya to a soft style would fix it but would put the accountability partner (a peer role) back on a white coach and leave the soft band 3 white / 1 Black. Judged the lesser issue; flag if you disagree.

## Why these coaches were kept or retired

Each kept coach's clip was reviewed (frame at 3s) and its on-screen persona matched to the methodology:
Maya's clip is bouncy and loud → hype; Jake's is grinning and encouraging → encourager;
Sophia's is still and calm → stoic; Marcus is in a gym, direct to camera → operator;
David is relaxed and practical → systems; Margaret is animated and curious → Socratic.
Elena's warmth overlapped with both Jake and Margaret; Richard's "firm handshake,
old-school discipline" is exactly the pairing the brief says not to default to.

## Intro clip generation prompts (new coaches)

**How the original eight were made** (confirmed from the 18 Sep 2026 session transcript): the vidIQ
`generate_video` tool, model `gemini-omni-flash`, 8 seconds, 720p, 9:16, speech included, roughly
160 vidIQ credits a clip. Output is H.264 + AAC, 720×1280, about 2 MB, encoder tag "Google". The
six prompts below follow the same template word for word so the set looks consistent.
Review every generated face for resemblance to any identifiable real person before accepting; regenerate if in doubt.
Nothing else is needed: no HeyGen, no self-hosted lip-sync (that was only researched last time, never used).

### fiona.mp4
> A realistic video-call style shot of a white Scottish woman in her early 30s, athletic, dark red hair pulled back tight, no make-up, wearing a grey technical t-shirt. She is framed head-and-shoulders, looking directly into the phone camera, bright modern kitchen with morning light, shallow depth of field. Composed and level, a quick dry half-smile at the end, speaks clearly to camera in a Glaswegian accent, lips perfectly synced to the words: "Morning. I'm Fiona. Two boxes: done, not done. My job is getting you into the first one every day, and I'll be chuffed every time you are. Let's go." Minimal gestures, no captions, no text on screen, no music.

### karim.mp4
> A realistic video-call style shot of a British Lebanese man in his mid-40s, olive skin, short dark hair greying at the temples, neat beard, wearing a soft navy jumper. He is framed head-and-shoulders, looking directly into the phone camera, calm living room with a plant and a window behind him, late-afternoon light, shallow depth of field. He takes one slow breath before speaking, relaxed and unhurried, speaks clearly to camera in a warm Birmingham accent, lips perfectly synced to the words: "Hi, I'm Karim. Before anything else, one breath. Notice what's here. Then we decide. I'll be with you for both." Gentle gestures, no captions, no text on screen, no music.

### priya.mp4
> A realistic video-call style shot of a British Indian woman in her early 40s, medium-brown skin, shoulder-length black hair, hoop earrings, wearing a mustard-yellow hoodie. She is framed head-and-shoulders, holding the phone at arm's length while walking slowly along a leafy suburban street, daylight, shallow depth of field. Grinning like she's talking to a mate, slightly out of breath, speaks clearly to camera in a Leicester accent, lips perfectly synced to the words: "Alright, I'm Priya. I'm not above you, I'm beside you. You say what you'll do, I say when I'll check. Your word's on the table, and so's mine." Natural hand gestures, no captions, no text on screen, no music.

### arun.mp4
> A realistic video-call style shot of a British Indian man in his mid-50s, brown skin, close-cropped grey hair and a trimmed grey beard, rimless glasses, wearing a pale blue shirt with the sleeves rolled. He is framed head-and-shoulders, looking directly into the phone camera, tidy home office with a wall calendar behind him, afternoon light, shallow depth of field. Calm and organised, a slight nod as he speaks, speaks clearly to camera in a Bradford accent, lips perfectly synced to the words: "Hello, I'm Arun. We start at the finish line and walk back. Every goal gets a date, every date gets a job. Yours starts this week." Measured gestures, no captions, no text on screen, no music.

### ken.mp4
> A realistic video-call style shot of a British Chinese man in his mid-60s, short grey hair, lean and weathered, wearing a dark zip-up track top with a stopwatch on a lanyard. He is framed head-and-shoulders, looking directly into the phone camera, at the edge of a running track in soft early light, shallow depth of field. Steady, kind, unhurried, speaks clearly to camera in a Liverpool accent, lips perfectly synced to the words: "I'm Ken. Forty years around athletes taught me one thing. Build the base, recover on purpose, load a little more. Nobody peaks in week one." Small gestures, no captions, no text on screen, no music.

### grace.mp4
> A realistic video-call style shot of a Black British woman in her mid-60s, dark skin, short silver-grey natural hair, reading glasses pushed up on her head, wearing a bright patterned blouse. She is framed head-and-shoulders, looking directly into the phone camera, warm family kitchen with a pot on the stove behind her, shallow depth of field. Straight-backed and direct with a dry twinkle, speaks clearly to camera in a London accent with Nigerian roots, lips perfectly synced to the words: "I'm Grace. Plain truth, plain food, early night. Nobody's coming to do it for you. Good, you've got hands. Come on." Expressive hand gestures, no captions, no text on screen, no music.
