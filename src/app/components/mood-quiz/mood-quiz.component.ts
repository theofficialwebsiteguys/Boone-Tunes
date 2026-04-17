import { Component, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SearchService } from '../../services/search.service';
import { PlayerService } from '../../services/player.service';
import { Track } from '../../models/track.model';
import { TrackRowComponent } from '../track-row/track-row.component';

/* ── Data types ───────────────────────────────────────────────────────────── */

type Phase = 'idle' | 'quiz' | 'results';
type Answers = Record<string, string>;

interface QuizOption  { id: string; label: string; emoji: string; }
interface QuizQuestion { id: string; question: string; subtitle: string; options: QuizOption[]; }

interface VirtualPlaylist {
  id: string; name: string; emoji: string; description: string; query: string;
  tracks: Track[]; loading: boolean; error: boolean; showAll: boolean;
}

/* ── Static quiz data ─────────────────────────────────────────────────────── */

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'mood',
    question: 'How are you feeling right now?',
    subtitle: "Be honest — we won't judge.",
    options: [
      { id: 'happy',      label: 'Happy & Upbeat',     emoji: '😄' },
      { id: 'chill',      label: 'Chill & Easy',        emoji: '😌' },
      { id: 'focused',    label: 'Focused & Sharp',     emoji: '🎯' },
      { id: 'reflective', label: 'Reflective & Deep',   emoji: '💭' },
      { id: 'hype',       label: 'Hype & Wired',        emoji: '⚡' },
    ],
  },
  {
    id: 'scene',
    question: "What's the scene?",
    subtitle: 'Where are you right now?',
    options: [
      { id: 'home',   label: 'Solo at Home',       emoji: '🏠' },
      { id: 'people', label: 'With People',         emoji: '🎉' },
      { id: 'work',   label: 'Working / Studying',  emoji: '💻' },
      { id: 'active', label: 'Moving & Active',     emoji: '🏋️' },
      { id: 'road',   label: 'On the Road',         emoji: '🚗' },
    ],
  },
  {
    id: 'energy',
    question: 'Pick your energy:',
    subtitle: 'How much gas are you on?',
    options: [
      { id: 'full', label: 'Full Send',   emoji: '🔥' },
      { id: 'flow', label: 'In the Flow', emoji: '🌊' },
      { id: 'low',  label: 'Low & Slow',  emoji: '🌙' },
    ],
  },
  {
    id: 'era',
    question: 'What era are you feeling?',
    subtitle: 'Music hits different by decade.',
    options: [
      { id: 'classic',   label: '60s – 70s',        emoji: '🎸' },
      { id: 'nostalgia', label: '80s – 90s',         emoji: '📼' },
      { id: 'early2k',   label: '2000s – 2010s',     emoji: '📀' },
      { id: 'now',       label: 'Right Now',          emoji: '🎧' },
      { id: 'any',       label: "Doesn't Matter",     emoji: '🌀' },
    ],
  },
  {
    id: 'sound',
    question: "What's your sound?",
    subtitle: 'Pick the genre that fits.',
    options: [
      { id: 'pop',        label: 'Pop / Mainstream',    emoji: '🎤' },
      { id: 'hiphop',     label: 'Hip-Hop / R&B',       emoji: '🎵' },
      { id: 'rock',       label: 'Rock / Alternative',  emoji: '🎸' },
      { id: 'electronic', label: 'Electronic / EDM',    emoji: '🎛️' },
      { id: 'country',    label: 'Country / Folk',      emoji: '🤠' },
      { id: 'jazz',       label: 'Jazz / Soul',         emoji: '🎷' },
    ],
  },
];

/* ── Vibe name lookup (mood × scene) ──────────────────────────────────────── */

const VIBE_NAMES: Record<string, Record<string, [string, string]>> = {
  happy: {
    home:   ['Sunshine In',        'Just you and the good stuff'],
    people: ['Good Times Roll',    'Turn it up for the room'],
    work:   ['Bright Desk Energy', 'Stay smiling while you grind'],
    active: ['Feel-Good Fuel',     'Moving with a smile'],
    road:   ['Windows Down',       'Singing every word'],
  },
  chill: {
    home:   ['Cozy Corner',   'Settle in and let go'],
    people: ['Easy Company',  'No pressure, just good music'],
    work:   ['Soft Focus',    'Calm, collected, on track'],
    active: ['Recovery Mode', 'Easy does it today'],
    road:   ['Cruise Control','Nowhere to be, music to hear'],
  },
  focused: {
    home:   ['Deep Work',          'Distractions: off'],
    people: ['Locked In',          'Tuning the outside world out'],
    work:   ['The Zone',           'Maximum output mode'],
    active: ['Eyes On The Prize',  'Head down, grind on'],
    road:   ['Long Haul',          'Miles and momentum'],
  },
  reflective: {
    home:   ['Quiet Hours',     'Just you and the feels'],
    people: ['Story Time',      'Music that means something'],
    work:   ['Thinking Cap',    'Slow thoughts, deep work'],
    active: ['Inner Distance',  'Moving through it'],
    road:   ['Miles & Memories','Roads and reflection'],
  },
  hype: {
    home:   ['Pre-Game',            "Getting ready to go"],
    people: ['Party Starter',       "Someone had to do it"],
    work:   ['Power Hour',          "Locked in and loud"],
    active: ['Beast Mode',          "No days off"],
    road:   ['Pedal To The Metal',  "Gas, no brake"],
  },
};

/* ── Query builders ───────────────────────────────────────────────────────── */

const ERA:    Record<string, string> = {
  classic: '60s 70s', nostalgia: '80s 90s', early2k: '2000s 2010s', now: '2020s', any: '',
};
const SOUND:  Record<string, string> = {
  pop: 'pop', hiphop: 'hip hop R&B', rock: 'rock alternative',
  electronic: 'electronic', country: 'country', jazz: 'jazz soul',
};
const MOOD_Q: Record<string, string> = {
  happy: 'feel good', chill: 'chill', focused: 'focus', reflective: 'emotional', hype: 'hype',
};
const SCENE_Q: Record<string, string> = {
  home: 'home', people: 'party', work: 'study', active: 'workout', road: 'road trip',
};
const ENERGY_Q: Record<string, string> = {
  full: 'high energy', flow: 'mid tempo', low: 'slow',
};

const MOOD_EMOJI: Record<string, string>  = {
  happy: '😄', chill: '😌', focused: '🎯', reflective: '💭', hype: '⚡',
};
const SCENE_EMOJI: Record<string, string> = {
  home: '🏠', people: '🎉', work: '💻', active: '🏋️', road: '🚗',
};

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

function buildPlaylists(a: Answers): Omit<VirtualPlaylist, 'tracks' | 'loading' | 'error' | 'showAll'>[] {
  const era    = ERA[a['era']];
  const sound  = SOUND[a['sound']];
  const mood   = MOOD_Q[a['mood']];
  const scene  = SCENE_Q[a['scene']];
  const energy = ENERGY_Q[a['energy']];

  const [vibeName, vibeDesc] = VIBE_NAMES[a['mood']]?.[a['scene']] ?? ['Your Vibe', 'A personalised soundtrack'];

  return [
    {
      id: 'core',
      name: vibeName,
      emoji: MOOD_EMOJI[a['mood']] ?? '🎵',
      description: vibeDesc,
      query: join(era, sound, mood, 'hits'),
    },
    {
      id: 'scene',
      name: scenePlaylistName(a),
      emoji: SCENE_EMOJI[a['scene']] ?? '🎶',
      description: `Built for ${scene.toLowerCase()}`,
      query: join(scene, energy, sound),
    },
    {
      id: 'discovery',
      name: discoveryName(a),
      emoji: '🔮',
      description: "A little something you might not have heard",
      query: join('best', era, sound, 'songs'),
    },
  ];
}

function scenePlaylistName(a: Answers): string {
  const map: Record<string, Record<string, string>> = {
    home:   { full: 'House Party of One', flow: 'Home Session',       low: 'Lights Low'        },
    people: { full: 'Crowd Energy',        flow: 'Group Groove',       low: 'Laid-Back Hang'    },
    work:   { full: 'Grind Hours',         flow: 'Flow State',         low: 'Soft Background'   },
    active: { full: 'Max Effort',          flow: 'In Stride',          low: 'Cool Down'         },
    road:   { full: 'Highway Burner',      flow: 'Open Road',          low: 'Night Drive'       },
  };
  return map[a['scene']]?.[a['energy']] ?? 'The Scene';
}

function discoveryName(a: Answers): string {
  const map: Record<string, string> = {
    pop: 'Hidden Hits', hiphop: 'Underrated Bars', rock: 'Deep Cuts',
    electronic: 'Off The Grid', country: 'Off The Beaten Path', jazz: 'The B-Side',
  };
  return map[a['sound']] ?? 'The Discovery';
}

/* ── Component ───────────────────────────────────────────────────────────── */

@Component({
  selector: 'app-mood-quiz',
  standalone: true,
  imports: [TrackRowComponent],
  templateUrl: './mood-quiz.component.html',
  styleUrl: './mood-quiz.component.css',
})
export class MoodQuizComponent {
  private searchSvc = inject(SearchService);
  private player    = inject(PlayerService);

  readonly questions = QUESTIONS;

  phase: Phase        = 'idle';
  step                = 0;
  answers: Answers    = {};
  transitioning       = false;
  playlists: VirtualPlaylist[] = [];

  /** Vibe label shown in the results header */
  vibeLabel = '';
  vibeSubtitle = '';

  get currentQuestion(): QuizQuestion { return this.questions[this.step]; }
  get totalSteps():      number        { return this.questions.length; }
  get stepDots():        number[]      { return Array.from({ length: this.totalSteps }, (_, i) => i); }

  startQuiz(): void {
    this.answers     = {};
    this.step        = 0;
    this.transitioning = false;
    this.phase       = 'quiz';
  }

  selectOption(optionId: string): void {
    if (this.transitioning) return;
    this.answers[this.currentQuestion.id] = optionId;

    if (this.step < this.totalSteps - 1) {
      this.transitioning = true;
      setTimeout(() => {
        this.step++;
        this.transitioning = false;
      }, 220);
    } else {
      this.transitioning = true;
      setTimeout(() => {
        this.transitioning = false;
        this.buildResults();
      }, 220);
    }
  }

  goBack(): void {
    if (this.transitioning || this.step === 0) return;
    this.transitioning = true;
    setTimeout(() => {
      this.step--;
      this.transitioning = false;
    }, 180);
  }

  retake(): void {
    this.playlists = [];
    this.startQuiz();
  }

  /* ── Results ──────────────────────────────────────────────────────────── */

  private buildResults(): void {
    const defs = buildPlaylists(this.answers);

    const [vName, vSub] = VIBE_NAMES[this.answers['mood']]?.[this.answers['scene']]
      ?? ['Your Vibe', 'A personalised soundtrack'];
    this.vibeLabel    = vName;
    this.vibeSubtitle = vSub;

    this.playlists = defs.map(d => ({
      ...d, tracks: [], loading: true, error: false, showAll: false,
    }));
    this.phase = 'results';

    // Fetch all three playlists concurrently
    this.playlists.forEach((pl, i) => {
      this.searchSvc.search(pl.query, 12).subscribe({
        next: res => {
          this.playlists[i].tracks  = res.tracks;
          this.playlists[i].loading = false;
        },
        error: () => {
          this.playlists[i].loading = false;
          this.playlists[i].error   = true;
        },
      });
    });
  }

  visibleTracks(pl: VirtualPlaylist): Track[] {
    return pl.showAll ? pl.tracks : pl.tracks.slice(0, 5);
  }

  playAll(pl: VirtualPlaylist): void {
    if (pl.tracks.length) this.player.appendTracksToQueue(pl.tracks);
  }

  shuffleAll(pl: VirtualPlaylist): void {
    if (pl.tracks.length) this.player.shuffleAndAppendToQueue(pl.tracks);
  }

  playTrack(track: Track): void {
    this.player.appendTracksToQueue([track]);
  }

  addToQueue(track: Track): void {
    this.player.addToQueue(track);
  }
}
