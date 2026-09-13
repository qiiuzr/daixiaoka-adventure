'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { assetPath, sitePath } from '@/lib/asset-path';
import './memory.css';

type Card = {
  id: string;
  pair: string;
  image: string;
};

const CHARACTERS = [
  { pair: 'taekwondo', image: assetPath('/memory/full-taekwondo-v3.png') },
  { pair: 'overalls', image: assetPath('/memory/full-overalls-v3.png') },
  { pair: 'chef', image: assetPath('/memory/full-chef-v3.png') },
  { pair: 'magic', image: assetPath('/memory/full-magic-v3.png') },
  { pair: 'pajamas', image: assetPath('/memory/full-pajamas-v3.png') },
  { pair: 'dinosaur', image: assetPath('/memory/full-dinosaur-v3.png') },
] as const;

const JOURNEY_DESTINATIONS = [
  { label: '从头体验一次', href: sitePath('/') },
  { label: '书店', href: sitePath('/?scene=bookstore') },
  { label: '服装店', href: sitePath('/?scene=outfit') },
  { label: '舞台', href: sitePath('/?scene=stage') },
  { label: '露营地', href: sitePath('/?scene=camp') },
  { label: '呆小咖的小屋', href: sitePath('/?scene=home') },
] as const;

function makeDeck(round: number): Card[] {
  const cards = CHARACTERS.flatMap((character) => [0, 1].map((copy) => ({
    id: `${round}-${character.pair}-${copy}`,
    pair: character.pair,
    image: character.image,
  })));

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

export default function MemoryGame() {
  const [round, setRound] = useState(1);
  const [deck, setDeck] = useState<Card[]>([]);
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showJourneyMenu, setShowJourneyMenu] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    setDeck(makeDeck(round));
    setOpenCards([]);
    setMatchedPairs([]);
    setLocked(false);
    setMoves(0);
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, [round]);

  function chooseCard(card: Card) {
    if (locked || openCards.includes(card.id) || matchedPairs.includes(card.pair)) return;

    if (openCards.length === 0) {
      setOpenCards([card.id]);
      return;
    }

    const firstCard = deck.find((item) => item.id === openCards[0]);
    setOpenCards((current) => [...current, card.id]);
    setMoves((current) => current + 1);

    if (firstCard?.pair === card.pair) {
      setMatchedPairs((current) => [...current, card.pair]);
      window.setTimeout(() => setOpenCards([]), 360);
      return;
    }

    setLocked(true);
    resetTimer.current = window.setTimeout(() => {
      setOpenCards([]);
      setLocked(false);
      resetTimer.current = null;
    }, 850);
  }

  const won = deck.length > 0 && matchedPairs.length === CHARACTERS.length;

  return (
    <main className="memory-game-shell" style={{ backgroundImage: `url(${assetPath('/memory/background.png')})` }}>
      <div className="memory-sky-glow" aria-hidden="true" />
      <section className="memory-game" aria-labelledby="memory-title">
        <header className="memory-header">
          <div>
            <p className="memory-kicker">呆小咖的梦境小游戏</p>
            <h1 id="memory-title">翻开记忆，找到一样的呆小咖</h1>
          </div>
          <div className="memory-progress" aria-live="polite">
            <span>已找到 {matchedPairs.length} / {CHARACTERS.length} 对</span>
            <span>{moves} 次尝试</span>
          </div>
        </header>

        <div className="memory-board" aria-label="翻牌记忆配对游戏">
          {deck.map((card) => {
            const isOpen = openCards.includes(card.id) || matchedPairs.includes(card.pair);
            const isMatched = matchedPairs.includes(card.pair);
            return (
              <button
                key={card.id}
                type="button"
                className={`memory-card ${isOpen ? 'is-open' : ''} ${isMatched ? 'is-matched' : ''}`}
                data-character={card.pair}
                onClick={() => chooseCard(card)}
                disabled={locked || isMatched}
                aria-label={isMatched ? '已经配对成功的卡片' : isOpen ? '已翻开的卡片' : '翻开卡片'}
                aria-pressed={isOpen}
              >
                <span className="memory-card-inner">
                  <span className="memory-card-face memory-card-back" aria-hidden="true">
                    <img src={assetPath('/memory/card-back.png')} alt="" draggable={false} />
                  </span>
                  <span className="memory-card-face memory-card-front">
                    <span className="memory-character-frame" aria-hidden="true">
                      <img
                        className="memory-character-image"
                        src={card.image}
                        alt=""
                        draggable={false}
                      />
                    </span>
                    {isMatched && <Sparkles className="memory-match-sparkle" aria-hidden="true" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {won && (
          <div className="memory-victory" role="dialog" aria-modal="true" aria-labelledby="victory-title">
            <div className={`memory-victory-card ${showJourneyMenu ? 'is-journey-menu' : ''}`}>
              <Sparkles aria-hidden="true" />
              {showJourneyMenu ? (
                <>
                  <p className="memory-victory-kicker">接下来想去哪里？</p>
                  <h2 id="victory-title">继续和呆小咖一起玩吧</h2>
                  <div className="memory-journey-grid">
                    {JOURNEY_DESTINATIONS.map((destination) => (
                      <a key={destination.href} href={destination.href}>{destination.label}</a>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="memory-victory-kicker">全部找到啦</p>
                  <h2 id="victory-title">呆小咖的记忆被点亮了！</h2>
                  <p>你用了 {moves} 次尝试，找到了全部六对造型。</p>
                  <div className="memory-victory-actions">
                    <button type="button" onClick={() => { setShowJourneyMenu(false); setRound((current) => current + 1); }}>
                      <RotateCcw aria-hidden="true" />
                      再玩一次
                    </button>
                    <button type="button" className="memory-stop-button" onClick={() => setShowJourneyMenu(true)}>
                      不玩啦
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
      <BackgroundMusic
        onPaper={false}
        waiting
        muted={soundMuted}
        onToggle={() => setSoundMuted((current) => !current)}
      />
    </main>
  );
}
