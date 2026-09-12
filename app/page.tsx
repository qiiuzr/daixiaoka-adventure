'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { MousePointerClick } from 'lucide-react';
import { positionHotspot, positionInteractionLabel, SCENE_HOTSPOTS } from '@/lib/scene-hotspots';
import { BOOK_CLIP, BOOK_PAGE, bookSceneLayout, holdVideoFrame, isBookTap, resumeBookClosing } from '@/lib/book-scene';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { SceneDepthText } from '@/components/SceneDepthText';
import { CrayonProfile } from '@/components/CrayonProfile';

type Phase = 'ready' | 'starting' | 'playing' | 'finished' | 'travel-starting' | 'traveling' | 'bookstore' | 'book-starting' | 'book-playing' | 'reading' | 'book-closing' | 'outfit-starting' | 'outfit-traveling' | 'outfit-store' | 'clothing-entering' | 'wardrobe' | 'changing' | 'dressed' | 'clothing-exiting' | 'stage-starting' | 'stage-traveling' | 'stage' | 'stage-entering' | 'stage-entry-playing' | 'stage-ready' | 'stage-dancing' | 'stage-choice' | 'stage-curtain' | 'camp-starting' | 'camp-traveling' | 'camp-arrived' | 'camp-entering' | 'camp-idle' | 'camp-interacting' | 'camp-exiting' | 'home-starting' | 'home-traveling' | 'home-arrived' | 'home-entering' | 'home-inside' | 'photo-wall-entering' | 'photo-wall' | 'photo-wall-interacting' | 'home-exiting' | 'game-invitation';
type ClickEffect = { id: number; x: number; y: number };
type CampInteraction = 'chair' | 'coffee' | 'snack' | 'flower';
type PhotoInteraction = 'dough' | 'fishing' | 'cookies' | 'cave' | 'burger';

const STAGE_CLIP = { ready: 3.18, danceEnd: 11.83 } as const;
const CAMP_VIDEO = {
  travel: '/stage-to-camp.mp4',
  enter: '/camp-enter.mp4',
  exit: '/camp-exit.mp4',
  interactions: {
    chair: '/camp-chair.mp4',
    coffee: '/camp-coffee.mp4',
    snack: '/camp-snack.mp4',
    flower: '/camp-flower.mp4',
  },
} as const;

const HOME_VIDEO = {
  travel: '/camp-to-home.mp4',
  enter: '/home-enter.mp4',
  photoWall: '/photo-wall-enter.mp4',
  exit: '/home-exit.mp4',
} as const;

const PHOTO_INTERACTIONS = [
  { id: 'dough', label: '擀面团', src: '/photo-dough.mp4', left: 32.8, top: 42.5 },
  { id: 'fishing', label: '钓鱼', src: '/photo-fishing.mp4', left: 58.3, top: 42.5 },
  { id: 'cookies', label: '吃饼干', src: '/photo-cookies.mp4', left: 82.3, top: 43 },
  { id: 'cave', label: '洞穴探险', src: '/photo-cave.mp4', left: 45.4, top: 80.7 },
  { id: 'burger', label: '汉堡店', src: '/photo-burger.mp4', left: 75.6, top: 81.1 },
] as const satisfies ReadonlyArray<{ id: PhotoInteraction; label: string; src: string; left: number; top: number }>;

const OUTFITS = [
  { id: 1, left: 44.9, width: 6.4, image: '/outfit-01.png', start: 6.72, end: 8.74 },
  { id: 2, left: 51.8, width: 6.2, image: '/outfit-02.png', start: 8.82, end: 10.54 },
  { id: 3, left: 58.7, width: 6.5, image: '/outfit-03.png', start: 10.62, end: 12.54 },
  { id: 4, left: 65.6, width: 6.2, image: '/outfit-04.png', start: 12.62, end: 14.54 },
  { id: 5, left: 72.9, width: 6.8, image: '/outfit-05.png', start: 14.62, end: 16.54 },
  { id: 6, left: 81.0, width: 7.5, image: '/outfit-06.png', start: 16.62, end: 18.54 },
  { id: 7, left: 89.2, width: 7.2, image: '/outfit-07.png', start: 18.62, end: 19.16 },
] as const;

function initialPhaseForScene(scene: string | null): Phase {
  if (scene === 'bookstore') return 'bookstore';
  if (scene === 'outfit') return 'outfit-store';
  if (scene === 'stage') return 'stage';
  if (scene === 'camp') return 'camp-arrived';
  if (scene === 'home') return 'home-inside';
  if (scene === 'photos') return 'photo-wall';
  return 'ready';
}

function initialCampVideoForScene(scene: string | null) {
  if (scene === 'home') return HOME_VIDEO.enter;
  if (scene === 'photos') return HOME_VIDEO.photoWall;
  return CAMP_VIDEO.travel;
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const target = Math.max(0, Math.min(time, Number.isFinite(video.duration) ? video.duration : time));
    if (Math.abs(video.currentTime - target) < 0.025) {
      resolve();
      return;
    }
    const done = () => resolve();
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = target;
  });
}

function GlobalClickEffects() {
  const [effects, setEffects] = useState<ClickEffect[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const timers = new Set<number>();
    function createEffect(event: PointerEvent) {
      const id = ++idRef.current;
      setEffects((current) => [...current, { id, x: event.clientX, y: event.clientY }]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setEffects((current) => current.filter((effect) => effect.id !== id));
      }, 520);
      timers.add(timer);
    }

    document.addEventListener('pointerdown', createEffect, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', createEffect);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className="click-effects" aria-hidden="true">
      {effects.map((effect) => (
        <span
          className="click-effect"
          key={effect.id}
          style={{ left: effect.x, top: effect.y } as CSSProperties}
        >
          {[0, 90, 180, 270].map((angle) => (
            <i className="click-ray" key={angle} style={{ '--angle': `${angle}deg` } as CSSProperties} />
          ))}
          {Array.from({ length: 8 }, (_, index) => (
            <i className="click-particle" key={index} style={{ '--angle': `${index * 45 + 22.5}deg` } as CSSProperties} />
          ))}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const requestedScene = useSearchParams().get('scene');
  const sceneRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const travelRef = useRef<HTMLVideoElement>(null);
  const bookRef = useRef<HTMLVideoElement>(null);
  const outfitRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLVideoElement>(null);
  const stageDanceRef = useRef<HTMLVideoElement>(null);
  const campRef = useRef<HTMLVideoElement>(null);
  const outfitChangeRef = useRef<HTMLVideoElement>(null);
  const outfitChangeEnd = useRef(0);
  const outfitPlaybackMode = useRef<'enter' | 'change' | 'exit'>('enter');
  const outfitFrameRequest = useRef<number | null>(null);
  const stageFrameRequest = useRef<number | null>(null);
  const stagePlaybackEnd = useRef<number>(STAGE_CLIP.ready);
  const stagePlaybackMode = useRef<'entry' | 'dance' | 'curtain'>('entry');
  const campPlaybackMode = useRef<'travel' | 'enter' | 'interaction' | 'exit' | 'home-travel' | 'home-enter' | 'photo-wall' | 'photo-interaction' | 'home-exit'>('travel');
  const activeCampInteraction = useRef<CampInteraction | null>(null);
  const bookViewportRef = useRef<HTMLDivElement>(null);
  const bookGesture = useRef<{ x: number; y: number; movement: number; scrolled: boolean } | null>(null);
  const pendingPlay = useRef(false);
  const frameRequest = useRef<{ video: HTMLVideoElement; id: number } | null>(null);
  const mounted = useRef(true);
  const [phase, setPhase] = useState<Phase>(() => initialPhaseForScene(requestedScene));
  const [soundMuted, setSoundMuted] = useState(false);
  const [bellStyle, setBellStyle] = useState<CSSProperties>();
  const [bedStyle, setBedStyle] = useState<CSSProperties>();
  const [returnedBedStyle, setReturnedBedStyle] = useState<CSSProperties>();
  const [doorStyle, setDoorStyle] = useState<CSSProperties>();
  const [clothingDoorStyle, setClothingDoorStyle] = useState<CSSProperties>();
  const [stageBedStyle, setStageBedStyle] = useState<CSSProperties>();
  const [stageEntryStyle, setStageEntryStyle] = useState<CSSProperties>();
  const [campArrivalStyle, setCampArrivalStyle] = useState<CSSProperties>();
  const [campHomeStyle, setCampHomeStyle] = useState<CSSProperties>();
  const [photoWallStyle, setPhotoWallStyle] = useState<CSSProperties>();
  const [campObjectStyles, setCampObjectStyles] = useState<Record<CampInteraction, CSSProperties>>();
  const [photoItemStyles, setPhotoItemStyles] = useState<CSSProperties[]>([]);
  const [outfitChoiceStyles, setOutfitChoiceStyles] = useState<CSSProperties[]>([]);
  const [hintStyles, setHintStyles] = useState<Record<'bell' | 'bed' | 'returnedBed' | 'door', CSSProperties>>();
  const [storefrontSource, setStorefrontSource] = useState<'arrival' | 'book'>('arrival');
  const [bookLayout, setBookLayout] = useState<ReturnType<typeof bookSceneLayout>>();
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [leftClothingStore, setLeftClothingStore] = useState(false);
  const [finishedStageShow, setFinishedStageShow] = useState(false);
  const [completedCampInteractions, setCompletedCampInteractions] = useState<CampInteraction[]>([]);
  const [campHoldFrame, setCampHoldFrame] = useState<string | null>(null);
  const [leftCamp, setLeftCamp] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (frameRequest.current) {
        frameRequest.current.video.cancelVideoFrameCallback(frameRequest.current.id);
      }
      if (outfitFrameRequest.current !== null) outfitChangeRef.current?.cancelVideoFrameCallback(outfitFrameRequest.current);
      if (stageFrameRequest.current !== null) stageDanceRef.current?.cancelVideoFrameCallback(stageFrameRequest.current);
    };
  }, []);

  useEffect(() => {
    if (requestedScene === 'bookstore' || requestedScene === 'outfit') {
      const video = requestedScene === 'bookstore' ? travelRef.current : outfitRef.current;
      if (!video) return;

      function openDestinationPreview() {
        video!.pause();
        video!.currentTime = Math.max(0, video!.duration - 0.04);
        if (requestedScene === 'bookstore') {
          setStorefrontSource('arrival');
          setPhase('bookstore');
        } else {
          setLeftClothingStore(false);
          setPhase('outfit-store');
        }
      }

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        openDestinationPreview();
        return;
      }

      video.addEventListener('loadedmetadata', openDestinationPreview, { once: true });
      return () => video.removeEventListener('loadedmetadata', openDestinationPreview);
    }

    if (requestedScene === 'home') {
      const video = campRef.current;
      if (!video) return;

      function openHomePreview() {
        video!.pause();
        video!.currentTime = Math.max(0, video!.duration - 0.04);
        campPlaybackMode.current = 'home-enter';
        setPhase('home-inside');
      }

      video.src = HOME_VIDEO.enter;
      video.load();
      video.addEventListener('loadedmetadata', openHomePreview, { once: true });
      return () => video.removeEventListener('loadedmetadata', openHomePreview);
    }

    if (requestedScene === 'photos') {
      const video = campRef.current;
      if (!video) return;

      function openPhotoWallPreview() {
        video!.pause();
        video!.currentTime = Math.max(0, video!.duration - 0.04);
        campPlaybackMode.current = 'photo-wall';
        setPhase('photo-wall');
      }

      video.src = HOME_VIDEO.photoWall;
      video.load();
      video.addEventListener('loadedmetadata', openPhotoWallPreview, { once: true });
      return () => video.removeEventListener('loadedmetadata', openPhotoWallPreview);
    }

    if (requestedScene === 'stage') {
      const video = stageRef.current;
      if (!video) return;

      function openStagePreview() {
        video!.pause();
        video!.currentTime = Math.max(0, video!.duration - 0.04);
        setFinishedStageShow(false);
        setPhase('stage');
      }

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        openStagePreview();
        return;
      }

      video.addEventListener('loadedmetadata', openStagePreview, { once: true });
      return () => video.removeEventListener('loadedmetadata', openStagePreview);
    }

    if (requestedScene !== 'camp') return;
    const video = campRef.current;
    if (!video) return;
    const campVideo = video;

    function openCampPreview() {
      campVideo.pause();
      campVideo.currentTime = Math.max(0, campVideo.duration - 0.04);
      setPhase('camp-arrived');
    }

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      openCampPreview();
      return;
    }

    video.addEventListener('loadedmetadata', openCampPreview, { once: true });
    return () => video.removeEventListener('loadedmetadata', openCampPreview);
  }, [requestedScene]);

  useEffect(() => {
    const scene = sceneRef.current;
    const opening = videoRef.current;
    const travel = travelRef.current;
    const book = bookRef.current;
    const outfit = outfitRef.current;
    const stage = stageRef.current;
    const camp = campRef.current;
    const changing = outfitChangeRef.current;
    if (!scene || !opening || !travel || !book || !outfit || !stage || !camp || !changing) return;

    function alignHotspots() {
      if (!scene || !opening || !travel || !book || !outfit || !stage || !camp || !changing) return;
      const viewport = { width: scene.clientWidth, height: scene.clientHeight };
      const openingSize = { width: opening.videoWidth || 3184, height: opening.videoHeight || 1792 };
      const travelSize = { width: travel.videoWidth || 3840, height: travel.videoHeight || 2160 };
      const bookSize = {
        width: book.videoWidth || BOOK_CLIP.width,
        height: book.videoHeight || BOOK_CLIP.height,
      };
      const bell = positionHotspot(viewport, openingSize, SCENE_HOTSPOTS.bell);
      const bed = positionHotspot(viewport, openingSize, SCENE_HOTSPOTS.bed);
      const returnedBed = positionHotspot(viewport, bookSize, SCENE_HOTSPOTS.bed);
      const door = positionHotspot(viewport, travelSize, SCENE_HOTSPOTS.door);
      const outfitSize = { width: outfit.videoWidth || 3840, height: outfit.videoHeight || 2160 };
      const clothingDoor = positionHotspot(viewport, outfitSize, SCENE_HOTSPOTS.clothingDoor);
      const stageSize = { width: stage.videoWidth || 3184, height: stage.videoHeight || 1792 };
      const campSize = { width: camp.videoWidth || 3184, height: camp.videoHeight || 1792 };
      const changingSize = { width: changing.videoWidth || 3184, height: changing.videoHeight || 1792 };
      setBellStyle(bell);
      setBedStyle(bed);
      setReturnedBedStyle(returnedBed);
      setDoorStyle(door);
      setClothingDoorStyle(clothingDoor);
      setStageBedStyle(positionHotspot(viewport, stageSize, SCENE_HOTSPOTS.stageBed));
      setStageEntryStyle(positionHotspot(viewport, stageSize, SCENE_HOTSPOTS.stageEntrance));
      setCampArrivalStyle(positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campArrival));
      setCampHomeStyle(positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campHomeBed));
      setPhotoWallStyle(positionHotspot(viewport, campSize, {
        centerX: 0.226,
        top: 0.07,
        width: 0.13,
        height: 0.29,
      }));
      setCampObjectStyles({
        chair: positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campChair),
        coffee: positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campCoffee),
        snack: positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campSnack),
        flower: positionHotspot(viewport, campSize, SCENE_HOTSPOTS.campFlower),
      });
      setPhotoItemStyles(PHOTO_INTERACTIONS.map((photo) => positionHotspot(viewport, campSize, {
        centerX: photo.left / 100,
        top: (photo.top - 4.5) / 100,
        width: 0.07,
        height: 0.09,
      })));
      setOutfitChoiceStyles(OUTFITS.map((choice) => positionHotspot(viewport, changingSize, {
        centerX: choice.left / 100,
        top: 0.105,
        width: choice.width / 100,
        height: 0.61,
      })));
      setHintStyles({
        bell: positionInteractionLabel(viewport, bell),
        bed: positionInteractionLabel(viewport, bed),
        returnedBed: positionInteractionLabel(viewport, returnedBed),
        door: positionInteractionLabel(viewport, door, 'above'),
      });
      setBookLayout(bookSceneLayout(viewport, bookSize));
    }

    const observer = new ResizeObserver(alignHotspots);
    observer.observe(scene);
    opening.addEventListener('loadedmetadata', alignHotspots);
    travel.addEventListener('loadedmetadata', alignHotspots);
    book.addEventListener('loadedmetadata', alignHotspots);
    outfit.addEventListener('loadedmetadata', alignHotspots);
    stage.addEventListener('loadedmetadata', alignHotspots);
    camp.addEventListener('loadedmetadata', alignHotspots);
    changing.addEventListener('loadedmetadata', alignHotspots);
    window.addEventListener('resize', alignHotspots);
    alignHotspots();
    return () => {
      observer.disconnect();
      opening.removeEventListener('loadedmetadata', alignHotspots);
      travel.removeEventListener('loadedmetadata', alignHotspots);
      book.removeEventListener('loadedmetadata', alignHotspots);
      outfit.removeEventListener('loadedmetadata', alignHotspots);
      stage.removeEventListener('loadedmetadata', alignHotspots);
      camp.removeEventListener('loadedmetadata', alignHotspots);
      changing.removeEventListener('loadedmetadata', alignHotspots);
      window.removeEventListener('resize', alignHotspots);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'book-playing' || !bookRef.current) return;
    return holdVideoFrame(bookRef.current, BOOK_CLIP.holdTime, () => {
      pendingPlay.current = false;
      setPhase('reading');
    });
  }, [phase]);

  useEffect(() => {
    const viewport = bookViewportRef.current;
    if (!viewport || !bookLayout) return;
    viewport.scrollTo({
      left: phase === 'reading' ? bookLayout.readingOffset : bookLayout.centered,
      behavior: (phase === 'reading' || phase === 'book-closing') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
    });
  }, [phase, bookLayout]);

  function cancelPendingFrame() {
    if (!frameRequest.current) return;
    frameRequest.current.video.cancelVideoFrameCallback(frameRequest.current.id);
    frameRequest.current = null;
  }

  function cancelOutfitFrame() {
    if (outfitFrameRequest.current === null) return;
    outfitChangeRef.current?.cancelVideoFrameCallback(outfitFrameRequest.current);
    outfitFrameRequest.current = null;
  }

  function cancelStageFrame() {
    if (stageFrameRequest.current === null) return;
    stageDanceRef.current?.cancelVideoFrameCallback(stageFrameRequest.current);
    stageFrameRequest.current = null;
  }

  function finishCampSegment(video: HTMLVideoElement) {
    const mode = campPlaybackMode.current;
    video.pause();
    pendingPlay.current = false;
    if (mode === 'travel') {
      setPhase('camp-arrived');
      return;
    }
    if (mode === 'enter') {
      setPhase('camp-idle');
      return;
    }
    if (mode === 'exit') {
      setLeftCamp(true);
      setPhase('camp-arrived');
      return;
    }
    if (mode === 'home-travel') {
      setPhase('home-arrived');
      return;
    }
    if (mode === 'home-enter') {
      setPhase('home-inside');
      return;
    }
    if (mode === 'photo-wall') {
      setPhase('photo-wall');
      return;
    }
    if (mode === 'photo-interaction') {
      setPhase('photo-wall');
      return;
    }
    if (mode === 'home-exit') {
      setPhase('game-invitation');
      return;
    }
    const completed = activeCampInteraction.current;
    if (completed) {
      setCompletedCampInteractions((current) => current.includes(completed) ? current : [...current, completed]);
    }
    activeCampInteraction.current = null;
    setPhase('camp-idle');
  }

  async function finishStageSegment(video: HTMLVideoElement) {
    const stopAt = stagePlaybackEnd.current;
    const mode = stagePlaybackMode.current;
    cancelStageFrame();
    video.pause();
    // After the dance, hold on the same dim stage frame used before the lights come up.
    // The curtain action still resumes from the real end of the dance below.
    await seekVideo(video, mode === 'dance' ? STAGE_CLIP.ready : stopAt);
    if (!mounted.current) return;
    pendingPlay.current = false;
    setPhase(mode === 'entry' ? 'stage-ready' : 'stage-choice');
  }

  function watchStageSegment(video: HTMLVideoElement) {
    cancelStageFrame();
    const watch = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (stagePlaybackMode.current === 'curtain') return;
      if (metadata.mediaTime >= stagePlaybackEnd.current) {
        finishStageSegment(video);
        return;
      }
      stageFrameRequest.current = video.requestVideoFrameCallback(watch);
    };
    stageFrameRequest.current = video.requestVideoFrameCallback(watch);
  }

  function finishOutfitSegment(video: HTMLVideoElement) {
    const stopAt = outfitChangeEnd.current;
    outfitChangeEnd.current = Number.POSITIVE_INFINITY;
    cancelOutfitFrame();
    video.pause();
    video.currentTime = stopAt;
    pendingPlay.current = false;
    setPhase(outfitPlaybackMode.current === 'enter' ? 'wardrobe' : 'dressed');
  }

  function watchOutfitSegment(video: HTMLVideoElement) {
    cancelOutfitFrame();
    const watch = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      if (outfitPlaybackMode.current === 'exit') return;
      if (metadata.mediaTime >= outfitChangeEnd.current) {
        finishOutfitSegment(video);
        return;
      }
      outfitFrameRequest.current = video.requestVideoFrameCallback(watch);
    };
    outfitFrameRequest.current = video.requestVideoFrameCallback(watch);
  }

  function recoverPlayback(clip: 'opening' | 'travel' | 'book' | 'book-close' | 'outfit') {
    if (!mounted.current) return;
    cancelPendingFrame();
    pendingPlay.current = false;
    const player = clip === 'opening' ? videoRef.current : clip === 'travel' ? travelRef.current : clip === 'outfit' ? outfitRef.current : bookRef.current;
    player?.pause();
    if (clip === 'book-close') {
      if (player) player.currentTime = BOOK_CLIP.holdTime;
      setPhase('reading');
      setPlaybackError('暂时没能合上书，再点一下书本试试。');
      return;
    }
    if (clip === 'book') setStorefrontSource('arrival');
    setPhase(clip === 'opening' ? 'ready' : clip === 'travel' ? 'finished' : 'bookstore');
    setPlaybackError(clip === 'opening' ? '暂时没能播放，点一下铃铛再试试。' : clip === 'travel' ? '暂时没能出发，点一下床车再试试。' : clip === 'outfit' ? '暂时没能前往服装店，再点一下床车试试。' : '暂时没能翻开书，点一下大门再试试。');
  }

  async function startAnimation() {
    const video = videoRef.current;
    if (!video || phase !== 'ready' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('starting');
    try {
      if (video.error) video.load();
      video.currentTime = 0;
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      setPhase((current) => current === 'starting' ? 'playing' : current);
    } catch {
      recoverPlayback('opening');
    }
  }

  async function goToBookstore() {
    const video = travelRef.current;
    if (!video || phase !== 'finished' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('travel-starting');
    try {
      if (video.error) video.load();
      video.currentTime = 0;
      // Keep the opening clip's last frame visible until the next clip has decoded a frame.
      // Switching sources on one video element would temporarily clear the image.
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(() => {
          frameRequest.current = null;
          if (!mounted.current) return;
          setPhase((current) => current === 'travel-starting' ? 'traveling' : current);
        });
        frameRequest.current = { video, id };
      }
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      if (typeof video.requestVideoFrameCallback !== 'function') {
        setPhase((current) => current === 'travel-starting' ? 'traveling' : current);
      }
    } catch {
      recoverPlayback('travel');
    }
  }

  async function openBook() {
    const video = bookRef.current;
    if (!video || phase !== 'bookstore' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('book-starting');
    try {
      if (video.error) video.load();
      video.currentTime = 0;
      // Use the matching storefront at the beginning of the supplied clip as the join.
      // Keep the arrival frame underneath until the new clip can actually be displayed.
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(() => {
          frameRequest.current = null;
          if (mounted.current) setPhase((current) => current === 'book-starting' ? 'book-playing' : current);
        });
        frameRequest.current = { video, id };
      }
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      if (typeof video.requestVideoFrameCallback !== 'function') {
        setPhase((current) => current === 'book-starting' ? 'book-playing' : current);
      }
    } catch {
      recoverPlayback('book');
    }
  }

  async function closeBook() {
    const video = bookRef.current;
    if (!video || phase !== 'reading' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('book-closing');
    try {
      await resumeBookClosing(video);
      if (mounted.current) pendingPlay.current = false;
    } catch {
      recoverPlayback('book-close');
    }
  }

  function handleBookTap(event: MouseEvent<HTMLElement>) {
    // A real tap closes the book; swiping pages, scrolling or selecting text does not.
    if (event.detail !== 0) {
      const gesture = bookGesture.current;
      if (!gesture || !isBookTap({ ...gesture, textSelected: Boolean(window.getSelection()?.toString()) })) return;
    }
    bookGesture.current = null;
    void closeBook();
  }

  async function goToClothingStore() {
    const video = outfitRef.current;
    if (!video || phase !== 'bookstore' || storefrontSource !== 'book' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('outfit-starting');
    try {
      if (video.error) video.load();
      video.currentTime = 0;
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(() => {
          frameRequest.current = null;
          if (mounted.current) setPhase((current) => current === 'outfit-starting' ? 'outfit-traveling' : current);
        });
        frameRequest.current = { video, id };
      }
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      if (typeof video.requestVideoFrameCallback !== 'function') {
        setPhase((current) => current === 'outfit-starting' ? 'outfit-traveling' : current);
      }
    } catch {
      recoverPlayback('outfit');
    }
  }

  async function enterClothingStore() {
    if (phase !== 'outfit-store' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setSelectedOutfit(null);
    setPhase('clothing-entering');
    const video = outfitChangeRef.current;
    if (!video) return;
    outfitPlaybackMode.current = 'enter';
    // Keep the complete entrance and facial-expression beat before the first outfit begins.
    outfitChangeEnd.current = 6.58;
    video.pause();
    try {
      await seekVideo(video, 0);
      await video.play();
      watchOutfitSegment(video);
    } catch {
      pendingPlay.current = false;
      setPhase('wardrobe');
    }
  }

  async function chooseOutfit(outfit: typeof OUTFITS[number]) {
    if (!['wardrobe', 'dressed'].includes(phase) || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setSelectedOutfit(outfit.image);
    setPhase('changing');
    const video = outfitChangeRef.current;
    if (!video) return;
    outfitPlaybackMode.current = 'change';
    outfitChangeEnd.current = outfit.end;
    video.pause();
    try {
      await seekVideo(video, outfit.start);
      await video.play();
      watchOutfitSegment(video);
    } catch {
      pendingPlay.current = false;
      setPhase('dressed');
    }
  }

  function leaveClothingStore() {
    if (!['wardrobe', 'dressed'].includes(phase) || pendingPlay.current) return;
    pendingPlay.current = true;
    setPhase('clothing-exiting');
    const video = outfitChangeRef.current;
    if (!video) return;
    outfitPlaybackMode.current = 'exit';
    cancelOutfitFrame();
    video.pause();
    video.currentTime = 19.36;
    void video.play().catch(() => {
      pendingPlay.current = false;
      setLeftClothingStore(true);
      setPhase('outfit-store');
    });
  }

  async function goToStage() {
    const video = stageRef.current;
    if (!video || phase !== 'outfit-store' || !leftClothingStore || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('stage-starting');
    try {
      if (video.error) video.load();
      video.currentTime = 0;
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(() => {
          frameRequest.current = null;
          if (mounted.current) setPhase((current) => current === 'stage-starting' ? 'stage-traveling' : current);
        });
        frameRequest.current = { video, id };
      }
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      if (typeof video.requestVideoFrameCallback !== 'function') {
        setPhase((current) => current === 'stage-starting' ? 'stage-traveling' : current);
      }
    } catch {
      cancelPendingFrame();
      pendingPlay.current = false;
      video.pause();
      setPhase('outfit-store');
      setPlaybackError('暂时没能前往舞台，再点一下床车试试。');
    }
  }

  async function enterStage() {
    const video = stageDanceRef.current;
    if (!video || phase !== 'stage' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    setPhase('stage-entering');
    try {
      if (video.error) video.load();
      stagePlaybackMode.current = 'entry';
      stagePlaybackEnd.current = STAGE_CLIP.ready;
      video.pause();
      await seekVideo(video, 0);
      if (typeof video.requestVideoFrameCallback === 'function') {
        const id = video.requestVideoFrameCallback(() => {
          frameRequest.current = null;
          if (mounted.current) setPhase((current) => current === 'stage-entering' ? 'stage-entry-playing' : current);
        });
        frameRequest.current = { video, id };
      }
      await video.play();
      if (!mounted.current) return;
      pendingPlay.current = false;
      if (typeof video.requestVideoFrameCallback === 'function') {
        watchStageSegment(video);
      } else {
        setPhase((current) => current === 'stage-entering' ? 'stage-entry-playing' : current);
      }
    } catch {
      cancelPendingFrame();
      pendingPlay.current = false;
      video.pause();
      setPhase('stage');
      setPlaybackError('暂时没能进入舞台，再点一下舞台或呆小咖试试。');
    }
  }

  function holdCurrentCampFrame(video: HTMLVideoElement) {
    if (!video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCampHoldFrame(canvas.toDataURL('image/jpeg', 0.92));
  }

  async function playCampClip(mode: 'travel' | 'enter' | 'interaction' | 'exit' | 'home-travel' | 'home-enter' | 'photo-wall' | 'photo-interaction' | 'home-exit', src: string, interaction: CampInteraction | null = null) {
    const video = campRef.current;
    if (!video || pendingPlay.current) return;
    holdCurrentCampFrame(video);
    pendingPlay.current = true;
    setPlaybackError(null);
    campPlaybackMode.current = mode;
    activeCampInteraction.current = interaction;
    video.pause();
    setPhase(mode === 'travel' ? 'camp-starting' : mode === 'enter' ? 'camp-entering' : mode === 'exit' ? 'camp-exiting' : mode === 'home-travel' ? 'home-starting' : mode === 'home-enter' ? 'home-entering' : mode === 'photo-wall' ? 'photo-wall-entering' : mode === 'photo-interaction' ? 'photo-wall-interacting' : mode === 'home-exit' ? 'home-exiting' : 'camp-interacting');
    try {
      if (video.getAttribute('src') !== src || video.error) {
        video.src = src;
        video.load();
        await new Promise<void>((resolve, reject) => {
          const ready = () => { cleanup(); resolve(); };
          const failed = () => { cleanup(); reject(new Error('camp video failed')); };
          const cleanup = () => {
            video.removeEventListener('loadeddata', ready);
            video.removeEventListener('error', failed);
          };
          video.addEventListener('loadeddata', ready, { once: true });
          video.addEventListener('error', failed, { once: true });
        });
      }
      video.currentTime = 0;
      video.playbackRate = mode === 'photo-wall' ? 1.55 : mode === 'photo-interaction' ? 1.18 : 1;
      await video.play();
      if (!mounted.current) return;
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => {
          if (mounted.current) setCampHoldFrame(null);
        });
      } else {
        setCampHoldFrame(null);
      }
      if (mode === 'travel') setPhase('camp-traveling');
      if (mode === 'home-travel') setPhase('home-traveling');
    } catch {
      pendingPlay.current = false;
      activeCampInteraction.current = null;
      setPhase(mode === 'travel' ? 'stage' : mode === 'enter' ? 'camp-arrived' : mode === 'home-travel' ? 'camp-arrived' : mode === 'home-enter' ? 'home-arrived' : mode === 'photo-wall' ? 'home-inside' : mode === 'photo-interaction' || mode === 'home-exit' ? 'photo-wall' : 'camp-idle');
      setPlaybackError(mode === 'travel' ? '暂时没能前往露营地，再点一下试试。' : mode === 'home-travel' ? '暂时没能前往小屋，再点一下试试。' : mode === 'home-enter' ? '暂时没能进入小屋，再点一下试试。' : mode === 'photo-wall' ? '暂时没能打开照片墙，再点一下试试。' : mode === 'photo-interaction' ? '这张照片暂时没能打开，再点一下试试。' : mode === 'home-exit' ? '暂时没能离开小屋，再点一下试试。' : '这段互动暂时没能播放，再点一下试试。');
    }
  }

  function goToCamp() {
    if (phase !== 'stage' || !finishedStageShow) return;
    setCompletedCampInteractions([]);
    setLeftCamp(false);
    void playCampClip('travel', CAMP_VIDEO.travel);
  }

  function enterCamp() {
    if (phase !== 'camp-arrived') return;
    void playCampClip('enter', CAMP_VIDEO.enter);
  }

  function playCampInteraction(interaction: CampInteraction) {
    if (phase !== 'camp-idle') return;
    void playCampClip('interaction', CAMP_VIDEO.interactions[interaction], interaction);
  }

  function leaveCamp() {
    if (phase !== 'camp-idle') return;
    void playCampClip('exit', CAMP_VIDEO.exit);
  }

  function prepareHomeJourney() {
    if (phase !== 'camp-arrived' || !leftCamp) return;
    void playCampClip('home-travel', HOME_VIDEO.travel);
  }

  function enterHome() {
    if (phase !== 'home-arrived') return;
    void playCampClip('home-enter', HOME_VIDEO.enter);
  }

  function enterPhotoWall() {
    if (phase !== 'home-inside') return;
    void playCampClip('photo-wall', HOME_VIDEO.photoWall);
  }

  function playPhotoInteraction(src: string) {
    if (phase !== 'photo-wall') return;
    void playCampClip('photo-interaction', src);
  }

  function leaveHome() {
    if (phase !== 'photo-wall') return;
    void playCampClip('home-exit', HOME_VIDEO.exit);
  }

  function openMemoryGame() {
    window.location.assign('/memory');
  }

  async function startStagePerformance() {
    const video = stageDanceRef.current;
    if (!video || !['stage-ready', 'stage-choice'].includes(phase) || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    stagePlaybackMode.current = 'dance';
    stagePlaybackEnd.current = STAGE_CLIP.danceEnd;
    cancelStageFrame();
    video.pause();
    video.playbackRate = 1;
    setPhase('stage-dancing');
    try {
      await seekVideo(video, STAGE_CLIP.ready);
      await video.play();
      if (typeof video.requestVideoFrameCallback === 'function') watchStageSegment(video);
    } catch {
      pendingPlay.current = false;
      setPhase('stage-ready');
      setPlaybackError('暂时没能开始表演，再点一下试试。');
    }
  }

  async function finishStagePerformance() {
    const video = stageDanceRef.current;
    if (!video || phase !== 'stage-choice' || pendingPlay.current) return;
    pendingPlay.current = true;
    setPlaybackError(null);
    stagePlaybackMode.current = 'curtain';
    cancelStageFrame();
    video.pause();
    video.playbackRate = 1.35;
    setPhase('stage-curtain');
    try {
      await seekVideo(video, STAGE_CLIP.danceEnd);
      await video.play();
    } catch {
      pendingPlay.current = false;
      video.playbackRate = 1;
      setPhase('stage-choice');
      setPlaybackError('暂时没能完成谢幕，再点一下试试。');
    }
  }

  const showingBookContent = phase === 'book-playing' || phase === 'reading' || phase === 'book-closing';
  const showBook = showingBookContent || (storefrontSource === 'book' && (phase === 'bookstore' || phase === 'book-starting' || phase === 'outfit-starting'));
  const showTravel = phase === 'traveling' || phase === 'bookstore' || phase === 'book-starting' || showBook;
  const showOutfit = phase === 'outfit-traveling' || phase === 'outfit-store' || phase === 'clothing-entering' || phase === 'clothing-exiting' || phase === 'stage-starting';
  const showStage = phase === 'stage-traveling' || phase === 'stage' || phase === 'stage-entering';
  const showStagePerformance = ['stage-entry-playing', 'stage-ready', 'stage-dancing', 'stage-choice', 'stage-curtain'].includes(phase);
  const showCamp = ['camp-starting', 'camp-traveling', 'camp-arrived', 'camp-entering', 'camp-idle', 'camp-interacting', 'camp-exiting', 'home-starting', 'home-traveling', 'home-arrived', 'home-entering', 'home-inside', 'photo-wall-entering', 'photo-wall', 'photo-wall-interacting', 'home-exiting', 'game-invitation'].includes(phase);
  const showChangingRoom = ['clothing-entering', 'wardrobe', 'changing', 'dressed', 'clothing-exiting'].includes(phase);

  return (
    <main className={`experience phase-${phase}`}>
      <section ref={sceneRef} className="scene-frame" aria-label={showingBookContent ? '呆小咖的故事书' : phase === 'bookstore' ? '呆小咖抵达书店门口' : phase === 'outfit-store' ? '呆小咖抵达服装店' : '呆小咖的街道之旅'}>
        <video
          ref={videoRef}
          className="opening-video"
          src="/opening-animation.mp4"
          muted={soundMuted}
          preload="auto"
          playsInline
          onError={() => { if (phase === 'starting' || phase === 'playing') recoverPlayback('opening'); }}
          onEnded={() => { pendingPlay.current = false; setPhase('finished'); }}
          aria-hidden={showTravel}
        />
        <video
          ref={travelRef}
          className={`opening-video bookstore-video ${showTravel ? 'is-visible' : ''}`}
          src="/bookstore-arrival.mp4"
          muted={soundMuted}
          preload="auto"
          playsInline
          onError={() => { if (phase === 'travel-starting' || phase === 'traveling') recoverPlayback('travel'); }}
          onEnded={() => {
            cancelPendingFrame();
            pendingPlay.current = false;
            setPhase('bookstore');
          }}
          aria-hidden={!showTravel || showBook}
        />
        <div
          ref={bookViewportRef}
          className={`book-viewport ${showBook ? 'is-visible' : ''} ${phase === 'reading' ? 'is-reading' : ''}`}
          aria-hidden={!showBook}
          onPointerDownCapture={(event) => {
            bookGesture.current = { x: event.clientX, y: event.clientY, movement: 0, scrolled: false };
          }}
          onPointerMoveCapture={(event) => {
            const gesture = bookGesture.current;
            if (gesture) gesture.movement = Math.max(gesture.movement, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
          }}
          onPointerCancelCapture={() => { bookGesture.current = null; }}
          onScrollCapture={() => { if (bookGesture.current) bookGesture.current.scrolled = true; }}
        >
          <div className="book-canvas" style={bookLayout && { width: bookLayout.width, height: bookLayout.height, top: bookLayout.top }}>
            <video
              ref={bookRef}
              className="opening-video book-video"
              src={BOOK_CLIP.src}
              muted={soundMuted}
              preload="auto"
              playsInline
              onError={() => {
                if (phase === 'book-closing') recoverPlayback('book-close');
                else if (phase === 'book-starting' || phase === 'book-playing') recoverPlayback('book');
              }}
              onEnded={() => {
                if (phase !== 'book-closing') return;
                pendingPlay.current = false;
                // Keep this exact final video frame, rather than swap to another clip's exterior.
                setStorefrontSource('book');
                setPhase('bookstore');
              }}
              aria-hidden="true"
            />
            {phase === 'reading' && (
              <button type="button" className="book-close-hotspot" onClick={handleBookTap} aria-label="合上书本">
                <span className="book-close-hint interaction-copy"><span className="book-close-cue" aria-hidden="true"><MousePointerClick /></span><span>合上书本</span></span>
              </button>
            )}
            {(phase === 'reading' || phase === 'book-closing') && (
              <article
                className={`book-profile ${phase === 'book-closing' ? 'is-leaving' : ''}`}
                style={{ left: `${BOOK_PAGE.left * 100}%`, top: `${BOOK_PAGE.top * 100}%`, width: `${BOOK_PAGE.width * 100}%`, height: `${BOOK_PAGE.height * 100}%` }}
                aria-labelledby="profile-title"
                tabIndex={phase === 'reading' ? 0 : -1}
                aria-hidden={phase === 'book-closing'}
                onClick={handleBookTap}
              >
                <span className="sr-only">左页是奶黄色考拉呆小咖的全身形象，右页是它的基础档案。</span>
                <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
                  <defs><filter id="book-crayon-grain" x="-2%" y="-4%" width="104%" height="108%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="14" result="noise" />
                    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" />
                    <feComponentTransfer><feFuncA type="table" tableValues=".15 .35 .9 1 1" /></feComponentTransfer>
                    <feComposite in="SourceGraphic" operator="in" />
                  </filter></defs>
                </svg>
                <h1 id="profile-title" className="profile-reveal crayon-title" style={{ '--line': 0 } as CSSProperties}>
                  <img src="/book-crayon-title.png" alt="基础档案" width="2172" height="724" draggable={false} />
                </h1>
                <CrayonProfile />
              </article>
            )}
          </div>
        </div>
        <video
          ref={outfitRef}
          className={`opening-video outfit-video ${showOutfit ? 'is-visible' : ''}`}
          src="/clothing-store-arrival.mp4"
          muted={soundMuted}
          preload="auto"
          playsInline
          onError={() => { if (phase === 'outfit-starting' || phase === 'outfit-traveling') recoverPlayback('outfit'); }}
          onEnded={() => {
            cancelPendingFrame();
            pendingPlay.current = false;
            setLeftClothingStore(false);
            setPhase('outfit-store');
          }}
          aria-hidden={!showOutfit}
        />
        <div className={`outfit-room ${showChangingRoom ? 'is-visible' : ''} ${phase === 'clothing-entering' ? 'is-entering' : ''} ${phase === 'changing' ? 'is-changing' : ''} ${phase === 'clothing-exiting' ? 'is-exiting' : ''}`} aria-hidden={!showChangingRoom}>
          <img className="outfit-base" src="/outfit-rack.png" alt="" draggable={false} />
          <video
            ref={outfitChangeRef}
            className="outfit-change-video is-visible"
            src="/outfit-sequence.mp4"
            muted={soundMuted}
            preload="auto"
            playsInline
            onTimeUpdate={(event) => {
              if (outfitPlaybackMode.current === 'exit' || event.currentTarget.currentTime < outfitChangeEnd.current + 0.12) return;
              finishOutfitSegment(event.currentTarget);
            }}
            onEnded={() => {
              if (outfitPlaybackMode.current !== 'exit') return;
              setSelectedOutfit(null);
              pendingPlay.current = false;
              setLeftClothingStore(true);
              setPhase('outfit-store');
            }}
            onError={() => {
              pendingPlay.current = false;
              setPlaybackError('换装视频暂时无法播放，请刷新后再试。');
              setPhase('wardrobe');
            }}
          />
          {phase === 'dressed' && selectedOutfit && (
            <img className="outfit-clean-hold" src={selectedOutfit === '/outfit-07.png' ? '/outfit-prince-video-clean.png' : selectedOutfit} alt="" draggable={false} />
          )}
        </div>
        <video
          ref={stageRef}
          className={`opening-video stage-video ${showStage ? 'is-visible' : ''}`}
          src="/clothing-store-to-stage.mp4"
          muted={soundMuted}
          preload="auto"
          playsInline
          onError={() => {
            if (phase !== 'stage-starting' && phase !== 'stage-traveling') return;
            cancelPendingFrame();
            pendingPlay.current = false;
            setPhase('outfit-store');
            setPlaybackError('暂时没能前往舞台，再点一下床车试试。');
          }}
          onEnded={() => {
            cancelPendingFrame();
            pendingPlay.current = false;
            setPhase('stage');
          }}
          aria-hidden={!showStage}
        />
        <video
          ref={stageDanceRef}
          className={`opening-video stage-performance-video ${showStagePerformance ? 'is-visible' : ''}`}
          src="/enter-stage-dance.mp4"
          muted={soundMuted}
          preload="auto"
          playsInline
          onError={() => {
            if (!['stage-entering', 'stage-entry-playing', 'stage-dancing', 'stage-curtain'].includes(phase)) return;
            cancelStageFrame();
            cancelPendingFrame();
            pendingPlay.current = false;
            setPhase('stage');
            setPlaybackError('暂时没能进入舞台，再点一下舞台或呆小咖试试。');
          }}
          onTimeUpdate={(event) => {
            if (stagePlaybackMode.current === 'curtain' || event.currentTarget.currentTime < stagePlaybackEnd.current) return;
            finishStageSegment(event.currentTarget);
          }}
          onEnded={() => {
            if (phase !== 'stage-curtain' || stagePlaybackMode.current !== 'curtain') return;
            cancelStageFrame();
            cancelPendingFrame();
            pendingPlay.current = false;
            stageDanceRef.current && (stageDanceRef.current.playbackRate = 1);
            if (stagePlaybackMode.current === 'curtain') setFinishedStageShow(true);
            setPhase('stage');
          }}
          aria-hidden={!showStagePerformance}
        />
        <video
          ref={campRef}
          className={`opening-video camp-video ${showCamp ? 'is-visible' : ''}`}
          src={initialCampVideoForScene(requestedScene)}
          muted={soundMuted}
          preload="auto"
          playsInline
          onEnded={(event) => {
            if (!showCamp) return;
            finishCampSegment(event.currentTarget);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (
              campPlaybackMode.current === 'photo-wall' &&
              pendingPlay.current &&
              Number.isFinite(video.duration) &&
              video.currentTime >= video.duration - 0.35
            ) {
              finishCampSegment(video);
            }
          }}
          onError={() => {
            if (!showCamp) return;
            pendingPlay.current = false;
            activeCampInteraction.current = null;
            setPhase(campPlaybackMode.current === 'travel' ? 'stage' : campPlaybackMode.current === 'enter' ? 'camp-arrived' : campPlaybackMode.current === 'home-travel' ? 'camp-arrived' : campPlaybackMode.current === 'home-enter' ? 'home-arrived' : campPlaybackMode.current === 'photo-wall' ? 'home-inside' : campPlaybackMode.current === 'photo-interaction' || campPlaybackMode.current === 'home-exit' ? 'photo-wall' : 'camp-idle');
            setPlaybackError(campPlaybackMode.current === 'home-travel' ? '前往小屋的视频暂时无法播放，再点一下试试。' : campPlaybackMode.current === 'home-enter' ? '进入小屋的视频暂时无法播放，再点一下试试。' : campPlaybackMode.current === 'photo-wall' ? '照片墙视频暂时无法播放，再点一下试试。' : campPlaybackMode.current === 'photo-interaction' ? '照片里的故事暂时无法播放，再点一下试试。' : campPlaybackMode.current === 'home-exit' ? '离开小屋的视频暂时无法播放，再点一下试试。' : '露营地视频暂时无法播放，再点一下试试。');
          }}
          aria-hidden={!showCamp}
        />
        {campHoldFrame && showCamp && (
          <img className="camp-frame-hold" src={campHoldFrame} alt="" aria-hidden="true" />
        )}
        {[CAMP_VIDEO.enter, CAMP_VIDEO.exit, ...Object.values(CAMP_VIDEO.interactions), HOME_VIDEO.travel, HOME_VIDEO.enter, HOME_VIDEO.photoWall, HOME_VIDEO.exit, ...PHOTO_INTERACTIONS.map((item) => item.src)].map((src) => (
          <video key={src} className="media-preload" src={src} preload="auto" muted playsInline aria-hidden="true" />
        ))}
        {phase === 'reading' && <p className="book-pan-hint">左右滑动，看看书页</p>}

        {phase === 'ready' && (
          <button type="button" className="bell-hotspot" style={bellStyle} onClick={startAnimation} aria-label="摇响墙上的铃铛">
            <span className="click-cue" aria-hidden="true"><MousePointerClick /></span>
            <span className="action-caption interaction-copy">点击铃铛，叫醒呆小咖</span>
          </button>
        )}

        {(phase === 'finished' || phase === 'travel-starting') && (
          <>
            <SceneDepthText lines={['前面的书店亮起了灯……', '呆小咖似乎想去看看']} />
            <button
              type="button"
              className="bed-hotspot"
              style={bedStyle}
              onClick={goToBookstore}
              disabled={phase === 'travel-starting'}
              aria-busy={phase === 'travel-starting'}
              aria-label="启动，去书店看看"
            >
              <span className="bed-click-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">启动，去书店看看</span>
            </button>
          </>
        )}
        {(phase === 'bookstore' || phase === 'book-starting') && storefrontSource === 'arrival' && (
          <>
          {phase === 'bookstore' && <SceneDepthText lines={['进去看看吧']} anchor={doorStyle} />}
          <button
            type="button"
            className={`door-hotspot ${phase === 'book-starting' ? 'is-responding' : ''}`}
            style={doorStyle}
            onClick={openBook}
            disabled={phase === 'book-starting'}
            aria-busy={phase === 'book-starting'}
            aria-label="推开书店大门，翻开呆小咖的故事书"
          >
            <span className="door-click-cue" aria-hidden="true"><MousePointerClick /></span>
          </button>
          </>
        )}
        {(phase === 'bookstore' || phase === 'outfit-starting') && storefrontSource === 'book' && (
          <>
            <SceneDepthText lines={['街角传来衣架轻轻碰响的声音……', '呆小咖发现了一家服装店']} />
            <button
              type="button"
              className="bed-hotspot next-stop-hotspot"
              style={returnedBedStyle}
              onClick={goToClothingStore}
              disabled={phase === 'outfit-starting'}
              aria-busy={phase === 'outfit-starting'}
              aria-label="出发，去服装店换装"
            >
              <span className="bed-click-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">出发，去换身新衣服</span>
            </button>
          </>
        )}
        {phase === 'outfit-store' && !leftClothingStore && (
          <>
            <SceneDepthText lines={['进去换身新衣服吧']} anchor={clothingDoorStyle} />
            <button
              type="button"
              className="door-hotspot"
              style={clothingDoorStyle}
              onClick={enterClothingStore}
              aria-label="进入服装店"
            >
              <span className="door-click-cue" aria-hidden="true"><MousePointerClick /></span>
            </button>
          </>
        )}
        {(phase === 'outfit-store' || phase === 'stage-starting') && leftClothingStore && (
          <>
            <SceneDepthText lines={['远处传来了音乐声……', '呆小咖也想登上舞台试试看']} />
            <button
              type="button"
              className="bed-hotspot stage-hotspot"
              style={stageBedStyle}
              onClick={goToStage}
              disabled={phase === 'stage-starting'}
              aria-busy={phase === 'stage-starting'}
              aria-label="出发，去舞台看看"
            >
              <span className="bed-click-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">出发，去舞台看看</span>
            </button>
          </>
        )}
        {(phase === 'stage' || phase === 'stage-entering') && !finishedStageShow && (
          <>
            <div className="stage-waiting-text">
              <SceneDepthText lines={['舞台正在等待它的小明星……']} />
            </div>
            <button
              type="button"
              className="stage-entry-hotspot"
              style={stageEntryStyle}
              onClick={enterStage}
              disabled={phase === 'stage-entering'}
              aria-busy={phase === 'stage-entering'}
              aria-label="点击舞台或呆小咖，让呆小咖闪亮登场"
            >
              <span className="stage-entry-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">呆小咖闪亮登场</span>
            </button>
          </>
        )}
        {phase === 'stage' && finishedStageShow && (
          <>
            <SceneDepthText lines={['风里飘来了青草和咖啡的香气……', '呆小咖想去露营地歇一会儿']} />
            <button
              type="button"
              className="stage-entry-hotspot"
              style={stageEntryStyle}
              onClick={goToCamp}
              aria-label="出发，去露营地看看"
            >
              <span className="stage-entry-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">出发，去露营地看看</span>
            </button>
          </>
        )}
        {phase === 'camp-arrived' && !leftCamp && (
          <>
            <div className="camp-entry-copy">
              <SceneDepthText lines={['进去看看']} />
            </div>
            <button type="button" className="camp-arrival-hotspot" style={campArrivalStyle} onClick={enterCamp} aria-label="进入露营地">
              <span className="camp-interaction-cue" aria-hidden="true"><MousePointerClick /></span>
            </button>
          </>
        )}
        {phase === 'camp-arrived' && leftCamp && (
          <>
            <div className="camp-home-invitation">
              <SceneDepthText lines={['呆小咖发来了做客邀请……', '一起去它家里看看吧']} />
            </div>
            <button type="button" className="bed-hotspot camp-home-hotspot" style={campHomeStyle} onClick={prepareHomeJourney} aria-label="出发，去呆小咖家里做客">
              <span className="bed-click-cue" aria-hidden="true"><MousePointerClick /></span>
              <span className="action-caption interaction-copy">出发，去做客</span>
            </button>
          </>
        )}
        {phase === 'home-arrived' && (
          <>
            <div className="home-arrival-copy">
              <SceneDepthText lines={['这就是呆小咖的家啦']} />
            </div>
            <button type="button" className="stage-control home-entry-control" onClick={enterHome} aria-label="进入小屋看看">
              <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
              <span>进去看看吧</span>
            </button>
          </>
        )}
        {phase === 'home-inside' && (
          <>
            <div className="photo-wall-copy">
              <SceneDepthText lines={['点击照片墙', '看看呆小咖平常都在干些什么吧']} />
            </div>
            <button type="button" className="photo-wall-hotspot" style={photoWallStyle} onClick={enterPhotoWall} aria-label="点击照片墙，看看呆小咖平常都在干些什么">
              <span className="camp-interaction-cue" aria-hidden="true"><MousePointerClick /></span>
            </button>
          </>
        )}
        {phase === 'photo-wall' && (
          <div className="photo-gallery-interactions" aria-label="照片墙上的五张照片">
            <div className="photo-gallery-copy">
              <SceneDepthText lines={['点击图片看看吧']} />
            </div>
            {photoItemStyles.length === PHOTO_INTERACTIONS.length && PHOTO_INTERACTIONS.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="photo-item-hotspot"
                style={photoItemStyles[index]}
                onClick={() => playPhotoInteraction(photo.src)}
                aria-label={`打开第${PHOTO_INTERACTIONS.indexOf(photo) + 1}张照片：${photo.label}`}
              >
                <span className="camp-interaction-cue" aria-hidden="true"><MousePointerClick /></span>
              </button>
            ))}
            <button type="button" className="stage-control leave-home" onClick={leaveHome} aria-label="离开小屋">
              <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
              <span>离开小屋</span>
            </button>
          </div>
        )}
        {phase === 'game-invitation' && (
          <>
            <div className="game-invitation-copy">
              <SceneDepthText lines={['呆小咖发现了一个神秘的翻牌游戏……']} />
            </div>
            <button type="button" className="stage-control game-entry-control" onClick={openMemoryGame} aria-label="出发，去看看翻牌游戏">
              <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
              <span>出发，去看看</span>
            </button>
          </>
        )}
        {phase === 'camp-idle' && campObjectStyles && (
          <div className="camp-interactions" aria-label="露营地里的互动">
            <SceneDepthText lines={['看看呆小咖想在露营地做些什么吧']} />
            {([
              ['chair', '点击椅子，让呆小咖坐下休息'],
              ['coffee', '点击咖啡，让呆小咖喝咖啡'],
              ['snack', '点击零食，让呆小咖吃零食'],
              ['flower', '点击花盆，让呆小咖摘一朵花'],
            ] as const).map(([interaction, label]) => (
              <button
                key={interaction}
                type="button"
                className="camp-object-hotspot"
                style={campObjectStyles[interaction]}
                onClick={() => playCampInteraction(interaction)}
                aria-label={label}
              >
                <span className="camp-interaction-cue" aria-hidden="true"><MousePointerClick /></span>
              </button>
            ))}
          </div>
        )}
        {phase === 'camp-idle' && (
          <button type="button" className="stage-control leave-camp" onClick={leaveCamp} aria-label="离开露营地，回到营地外面">
            <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
            <span>离开营地</span>
          </button>
        )}
        {phase === 'stage-ready' && (
          <button type="button" className="stage-control stage-control-start" onClick={startStagePerformance}>
            <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
            <span>开始表演</span>
          </button>
        )}
        {phase === 'stage-choice' && (
          <div className="stage-choice-actions" aria-label="表演结束后的选择">
            <button type="button" className="stage-control" onClick={startStagePerformance}>
              <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
              <span>再跳一次</span>
            </button>
            <button type="button" className="stage-control" onClick={finishStagePerformance}>
              <span className="stage-control-cue" aria-hidden="true"><MousePointerClick /></span>
              <span>谢幕</span>
            </button>
          </div>
        )}
        {(phase === 'wardrobe' || phase === 'dressed') && (
          <div className="wardrobe-interactions" aria-label="选择要试穿的衣服">
            <SceneDepthText lines={['点击衣架上的衣服，帮呆小咖换装']} />
            {OUTFITS.map((outfit) => (
              <button
                key={outfit.id}
                type="button"
                className="outfit-choice"
                style={outfitChoiceStyles[outfit.id - 1]}
                onClick={() => chooseOutfit(outfit)}
                aria-label={`试穿从左往右第${outfit.id}件衣服`}
              >
                {selectedOutfit === null && (
                  <span className="outfit-choice-cue" aria-hidden="true"><MousePointerClick /></span>
                )}
              </button>
            ))}
          </div>
        )}
        {(phase === 'wardrobe' || phase === 'dressed') && (
          <button type="button" className="leave-outfit-store" onClick={leaveClothingStore}>
            <span aria-hidden="true">←</span>
            <span>离开服装店</span>
          </button>
        )}
        {playbackError && <p className="playback-message" role="alert">{playbackError}</p>}
      </section>
      <BackgroundMusic onPaper={showingBookContent}
        waiting={['ready', 'finished', 'bookstore', 'reading', 'outfit-store', 'wardrobe', 'dressed', 'stage', 'stage-entering', 'stage-ready', 'stage-choice', 'camp-arrived', 'camp-idle', 'home-arrived', 'home-inside', 'photo-wall', 'game-invitation'].includes(phase)}
        muted={soundMuted} onToggle={() => setSoundMuted((value) => !value)} />
      <GlobalClickEffects />
    </main>
  );
}
