import { sitePath } from '@/lib/asset-path';
import './SceneNavigator.css';

export type NavigationScene = 'wake' | 'bookstore' | 'outfit' | 'stage' | 'camp' | 'memory';

const destinations: ReadonlyArray<{ id: NavigationScene; label: string; href: string }> = [
  { id: 'wake', label: '叫醒呆小咖', href: sitePath('/') },
  { id: 'bookstore', label: '书店', href: sitePath('/?scene=bookstore') },
  { id: 'outfit', label: '服装店', href: sitePath('/?scene=outfit') },
  { id: 'stage', label: '舞台', href: sitePath('/?scene=stage') },
  { id: 'camp', label: '露营地', href: sitePath('/?scene=camp') },
  { id: 'memory', label: '小游戏', href: sitePath('/memory') },
];

export function SceneNavigator({ active }: { active?: NavigationScene }) {
  return (
    <nav className="scene-navigator" aria-label="快速前往">
      <span className="scene-navigator-title">快速前往</span>
      <div className="scene-navigator-links">
        {destinations.map((destination) => (
          <a
            key={destination.id}
            href={destination.href}
            className={destination.id === active ? 'is-active' : undefined}
            aria-current={destination.id === active ? 'page' : undefined}
          >
            {destination.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
