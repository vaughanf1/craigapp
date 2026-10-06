# Voice provider research — alternatives to ElevenLabs (6 Oct 2026)

Status: **provisional**. No provider has been chosen. Prices were read from vendor pages on
6 Oct 2026 and will drift; items marked *unverified* could not be confirmed from a primary source.

## Headline findings

1. **No provider, hosted or open, sells a fixed stock catalogue with Glasgow / Liverpool / Birmingham / Leeds / Cardiff / South London voices.** Every commercial catalogue checked (Azure, Google, Polly, Deepgram, Cartesia, Rime, Inworld, OpenAI) labels UK voices simply "en-GB / British" (RP-ish). Irish and Nigerian English exist as stock locales in a few places (Azure, Polly, Rime, Deepgram Aura-1). Nobody has British-Lebanese.
2. **The only way to get our 12 regional personas without cloning a real person is text-prompted "voice design"**: ElevenLabs Voice Design v3 (verified: prompts such as "thick Scottish accent", Cockney, Geordie, Scouse, Brummie are documented), Hume Octave (voice-from-description, English only; accent fidelity unverified), MiniMax Voice Design ($3/voice; unverified), and open-weight Qwen3-TTS-VoiceDesign (Apache-2.0; unverified). Designed voices are synthetic, so they sit cleanly inside the "no real people" rule.
3. **The only open-weight route to real regional UK accents is the VCTK corpus (CC BY 4.0, Edinburgh University)**, exposed as speaker IDs in Piper `en_GB-vctk-medium` (109 speakers) and as voice embeddings in Kyutai Pocket TTS. VCTK contains 19 Scottish speakers (5 from Edinburgh), 6 Northern Irish (5 Belfast), 9 Irish, 1 Welsh (Cardiff). Glasgow, Liverpool, Birmingham and Leeds speakers are not confirmed. These are real, anonymous, consenting research volunteers: licensed, but still real people, so it is a legal call whether that satisfies our rule.
4. **The price gap is huge.** ElevenLabs' cheapest API model is $40 per 1M chars (Flash v2.5 / v4 Turbo list), and plans work out at $100–220 per 1M. Azure/Polly/Google Neural are $16/1M, Inworld $15–25, Fish $15, Speechify $6–10, Kokoro via DeepInfra $0.62/1M.
5. **ElevenLabs' Default (premade) voices expire 31 Dec 2026** (verified in their docs). Any coach on a Default voice ID must be migrated this year regardless.

## Comparison table

USD per 1M input characters unless noted. "UK regional" = regional accents from stock voices. "Telephony" = native 8 kHz mu-law output (otherwise transcode PCM in Node).

| Provider / model | Cost per 1M chars | Free tier / minimum | Streaming | UK regional accents from stock | Licence / clone risk | Telephony |
|---|---|---|---|---|---|---|
| **ElevenLabs** Flash v2.5, v4 Turbo | $40 API list (v4 Turbo promo $11 until 12 Oct); v3 / v4 $80; plans effectively $100–220 | Free 10k credits, non-commercial; Starter ~$5, Creator $22, Pro $99 (promo) | Yes, WS; Flash ~75 ms | **Partial via Voice Design v3** (prompted Scottish/Cockney/Geordie/Scouse). Catalogue: RP only | Paid = commercial. Library voices are consented clones of real people. Defaults expire 31 Dec 2026 | **Yes** `ulaw_8000` |
| OpenAI gpt-4o-mini-tts | ~$10–15/1M (token-billed); tts-1 $15; tts-1-hd $30 | None | Yes | **No.** 13 voices, US-centric; accent via `instructions` is per-request, not a stable voice | Commercial; no cloning | No (transcode) |
| Deepgram Aura-2 | $30 PAYG (Aura-1 $15) | $200 credit | Yes, WS | **No.** 2 British; Irish only in Aura-1 | Commercial; no cloning | **Yes** |
| Cartesia Sonic-3.6 | Startup $49/1.25M (~$39); Scale ~$37 | Free 20k (non-commercial) | Yes, ~90 ms | **No regional.** British stock voices; `accent` field incl. Irish, SA, NZ and non-native accents on English (full list *unverified*) | Commercial from $5. Instant clone exists (don't use) | **Yes** |
| Google Cloud TTS | Neural2 $16; Chirp 3 HD $30; Studio $160 | 1M Neural2/Chirp3 free per month | Yes | **No.** en-GB all RP. No en-IE/en-NG | Commercial; cloning gated | **Yes** |
| Azure AI Speech Neural | $16 neural; HD $22 (*secondary source*) | 0.5M chars/month free | Yes | **No regional.** 14 en-GB; **en-IE** Emily/Connor; **en-NG** Ezinne/Abeo; en-ZA, en-IN | Commercial; cloning gated | **Yes** |
| Amazon Polly | Neural $16; Generative $30 | 12 months: 1M neural/month | Yes | **No regional.** en-GB Amy/Brian/Emma/Arthur; en-GB-WLS Geraint (old engine only); **en-IE** Niamh | Commercial; no self-serve cloning | **Yes** |
| Inworld TTS-2 | $25 / Flash $15 | ~70 min included | Yes | *Unverified*; some British voices | Paid = commercial. Instant clone exists | 8 kHz WAV; mu-law *unverified* |
| Rime Coda | $50 (Mist v3 $30) | 3,000 free minutes | Yes | **Partial.** 4 British, 3 Irish, **1 Nigerian** (baobab). No regional UK | Stock voices only, no public cloning: low risk | *unverified* |
| Hume Octave | ~$70–100 effective | Free 10k; Creator ~$10–14 | Yes | **Possible via voice design**; *unverified* | Commercial on Creator+. Clone exists | No |
| MiniMax speech-2.8 | HD $100; Turbo $60; Voice Design $3/voice | — | Yes | **Possible via Voice Design**; *unverified* | Commercial; clone-centric | — |
| Speechify Simba | $6–10 | Free, no card | Yes | *Unverified* | Paid = commercial | *unverified* |
| Fish Audio hosted | $15 | Free credits | Yes | None found | Platform is clone-centric; **open weights research-only** | *unverified* |
| PlayHT / Play.ai | — | — | — | — | **Gone** (wound down after acquisition) | — |

### Open-weight models (GitHub stats read live on 6 Oct 2026)

| Model | Stars / last push / licence | Stock voice IDs? | British / regional | CPU-friendly? | Hosted cost | Verdict |
|---|---|---|---|---|---|---|
| **Kokoro-82M** | 9.2k / Aug 2025 / Apache-2.0 | 54 voices | **8 British (4F 4M), all RP**, graded B- to D | Yes | DeepInfra $0.62/1M streaming | Cheapest viable; no regional; project quiet 14 months |
| **Chatterbox** (Resemble) | 26.8k / Jul 2026 / MIT | **No: every call needs a ~10 s reference clip** | Clones what you feed it | Nano: 3x realtime on 8 cores | Replicate ~$0.004/run | Clone-only; you'd need a licensed/synthetic reference voice per coach |
| **Piper** / piper1-gpl | 11.3k archived / successor GPL-3.0 | Speaker IDs | **Yes, the only open option with real regional UK voices**: `alba` (Scottish), `vctk` (Edinburgh x5, Belfast x5, Cardiff x1 confirmed), `aru` (Liverpool-recorded, accents undocumented), `northern_english_male`. `semaine` is CC BY-NC-SA, avoid | Yes, tiny | Self-host on Railway CPU | 2023 VITS quality, clearly synthetic |
| **Kyutai Pocket TTS** | 9.8k / Oct 2026 / MIT code, CC-BY-4.0 weights | CC-licensed catalogue (VCTK CC BY, donations CC0; Expresso is CC BY-NC, avoid) | VCTK regional voices available | **Yes**: 100M params, 2 cores, ~200 ms TTFB | Self-host CPU | Most modern CPU option; licence bans cloning without consent |
| **Qwen3-TTS** | 13.7k / Mar 2026 / Apache-2.0 | 9 timbres (English both American); **VoiceDesign** model | Only via prompt; *unverified* | No, GPU | Alibaba ~$10/1M (*secondary*) | Worth a test for designed accents |
| Orpheus 3B | 6.3k / Apache-2.0 | 8 US voices | No | No | — | Not for UK |
| Dia 1.6B | 19.4k / Apache-2.0 | None (voice varies per run) | No | No | — | Unsuitable for personas |
| Fish Speech / OpenAudio S1 | 33k / **commercial needs separate licence** | Clone | — | No | — | **Flag** |
| F5-TTS | 15.3k / **weights CC-BY-NC** | Clone | — | No | — | **Flag** |
| Coqui XTTS-v2 | 46k / dead / **weights non-commercial** | Clone | — | No | — | **Flag** |
| Higgs Audio v3 | 8.4k / **non-commercial** | Clone + presets | — | No | — | **Flag** |
| Index-TTS2 | 24.3k / bilibili licence, "contact us for commercial" | Clone | — | No | — | Ambiguous |
| VibeVoice (Microsoft) | 54.7k / MIT | 11 English style voices | No regional | No, GPU | — | Podcast-focused |
| MeloTTS | 7.7k / stale / MIT | Yes | 1 British voice | Yes | — | Too few voices |

## Three recommendations

**Best for UK regional accents and best raw quality: stay on ElevenLabs, but build the 12 coaches with Voice Design v3 and run them on Flash v2.5 or v4 Turbo.** It is the only vendor with documented regional-accent prompting producing a fully synthetic, saveable voice, which is the cleanest fit for the legal rule. Native `ulaw_8000` for Twilio later. Worked example: 300 users x 30 turns/day x 300 chars = ~2.7M chars/month = ~$108/month at API list price. Caveats: pricing page is distorted by promos until 12 Oct; Default voices die 31 Dec 2026.

**Best quality for money hosted: Cartesia Sonic-3.6 (~$39 per 1M effective), with Azure Neural ($16 per 1M, 0.5M free/month) as the boring, safe fallback.** Cartesia has British stock voices, an `accent` parameter that is the only parametric path found to a "Lebanese-flavoured English" (list must be pulled with a key), ~90 ms streaming, native mu-law. Azure is 2.5x cheaper and has the only stock Nigerian English voices plus Irish, but zero regional UK and a more "IVR" sound.

**Cheapest viable: Kokoro-82M via DeepInfra ($0.62 per 1M) or self-hosted on the Railway CPU.** Eight British voices (all RP, mediocre grades) would cover 8 of 12 coaches distinctly; the example volume costs under $2/month. For regional accents at near-zero cost, Kyutai Pocket TTS with VCTK Edinburgh/Belfast/Cardiff embeddings is the modern option and Piper the crude one; both use real consenting research volunteers under CC BY, which is a legal call for us.

**Hybrid worth considering**: ElevenLabs Voice Design for the accent-defining coaches, Kokoro or Azure for bulk or as the fallback tier. All three paths output PCM or mu-law that the Node server can pipe to Twilio later.

## Verified caveats

- Kokoro has exactly 8 British voices (bf_alice, bf_emma, bf_isabella, bf_lily, bm_daniel, bm_fable, bm_george, bm_lewis), all RP, graded B- to D in the official VOICES.md.
- Chatterbox has no built-in voice IDs; every generate call takes a reference clip.
- Piper `semaine` is CC BY-NC-SA; `northern_english_male` / `southern_english_female` are CC BY-SA; piper1-gpl is GPL-3.0 (fine server-side, no distribution).
- VCTK: Edinburgh (5), Belfast (5), Cardiff (1) confirmed. Glasgow, Liverpool, Birmingham, Leeds **not confirmed**.
- Non-commercial or restricted open weights: Coqui XTTS-v2, F5-TTS weights, Fish Speech / OpenAudio S1, Higgs Audio v3.
- ElevenLabs: Library voices are consented clones of real contributors; Default voices expire 31 Dec 2026; Flash/Turbo bill at 0.5 credit/char via API.
- Polly's only Welsh voice (Geraint) is the old standard engine.
- Google has no en-IE / en-NG / en-ZA voices.
- Twilio-native 8 kHz mu-law verified for ElevenLabs, Deepgram, Cartesia, Azure, Polly, Google. Transcode needed for OpenAI, Hume and all open-weight models.

## Could not verify

Azure and Google exact prices (pages need sign-in or would not render; figures are from June 2026 secondary sources). Hume official pricing. Inworld accents and mu-law. Rime mu-law. Cartesia's full `/accents` list. **Any accent fidelity: nobody listened to samples.** Have a native speaker from each region ear-test shortlisted voices before committing.

## Sources

Hosted pricing: [Deepgram](https://deepgram.com/pricing), [Cartesia](https://cartesia.ai/pricing), [OpenAI](https://developers.openai.com/api/docs/pricing), [Google TTS](https://cloud.google.com/text-to-speech/pricing), [Azure Speech](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/), [Amazon Polly](https://aws.amazon.com/polly/pricing/), [Inworld](https://inworld.ai/pricing), [Rime](https://rime.ai/pricing), [MiniMax](https://platform.minimax.io/docs/guides/pricing-paygo), [Fish Audio](https://fish.audio/developers/), [Speechify](https://speechify.ai/pricing).

Voice catalogues: [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), [Polly voices](https://docs.aws.amazon.com/polly/latest/dg/available-voices.html), [Google voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types), [Deepgram TTS models](https://developers.deepgram.com/docs/tts-models), [Cartesia British voices](https://www.cartesia.ai/voices/british-accent), [Cartesia accents](https://docs.cartesia.ai/build-with-cartesia/capability-guides/multilingual-voices), [Rime Coda voices](https://docs.rime.ai/docs/voices-coda).

ElevenLabs: [pricing](https://elevenlabs.io/pricing), [API pricing](https://elevenlabs.io/pricing/api), [models](https://elevenlabs.io/docs/overview/models), [voices and Default expiry](https://elevenlabs.io/docs/overview/capabilities/voices), [output formats](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [Voice Design v3](https://elevenlabs.io/blog/voice-design-v3), [v3 accent tags](https://elevenlabs.io/blog/eleven-v3-audio-tags-emulating-accents-with-precision).

Open-weight: [Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [Kokoro on DeepInfra](https://deepinfra.com/hexgrad/Kokoro-82M), [Chatterbox](https://github.com/resemble-ai/chatterbox), [Piper voices](https://huggingface.co/rhasspy/piper-voices/blob/main/voices.json), [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), [VCTK corpus](https://datashare.ed.ac.uk/handle/10283/3443), [Kyutai Pocket TTS](https://github.com/kyutai-labs/pocket-tts), [Kyutai tts-voices](https://huggingface.co/kyutai/tts-voices), [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), [Fish Speech licence](https://github.com/fishaudio/fish-speech/blob/main/LICENSE), [F5-TTS](https://github.com/SWivid/F5-TTS), [Higgs Audio](https://github.com/boson-ai/higgs-audio), [Dia](https://github.com/nari-labs/dia), [VibeVoice](https://github.com/microsoft/VibeVoice), [MeloTTS](https://github.com/myshell-ai/MeloTTS).
