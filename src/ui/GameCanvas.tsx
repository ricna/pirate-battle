import { Application } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import './GameCanvas.css';

type RendererStatus = 'loading' | 'ready' | 'error';

export function GameCanvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializationQueue = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<RendererStatus>('loading');

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) {
      throw new Error('The arena requires its authored viewport and canvas.');
    }

    let disposed = false;
    let initialized = false;
    let application: Application | null = null;
    let resizeObserver: ResizeObserver | null = null;

    function destroyApplication() {
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (!application) return;

      if (application.renderer) {
        // React owns the canvas element; PixiJS owns the rendering resources.
        application.destroy({ removeView: false }, { children: true });
      } else {
        application.stage.destroy({ children: true });
      }
      application = null;
    }

    async function initialize() {
      if (disposed) return;

      const app = new Application();
      application = app;

      try {
        await app.init({
          canvas: canvas!,
          width: Math.max(1, viewport!.clientWidth),
          height: Math.max(1, viewport!.clientHeight),
          resolution: Math.min(window.devicePixelRatio, 2),
          autoDensity: true,
          preference: 'webgl',
          background: '#123744',
          // This stage is static; a simulation loop will be introduced later.
          autoStart: false,
          sharedTicker: false,
        });
        initialized = true;

        if (disposed) {
          destroyApplication();
          return;
        }

        resizeObserver = new ResizeObserver(() => {
          if (disposed) return;
          const width = viewport!.clientWidth;
          const height = viewport!.clientHeight;
          if (width <= 0 || height <= 0) return;
          app.renderer.resize(width, height);
          app.render();
        });
        resizeObserver.observe(viewport!);
        app.render();
        setStatus('ready');
      } catch (error) {
        destroyApplication();
        if (!disposed) {
          console.error('Unable to initialize the arena renderer.', error);
          setStatus('error');
        }
      }
    }

    // Serialize setup so Strict Mode and hot reload cannot race on one canvas.
    initializationQueue.current = initializationQueue.current.then(initialize);

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (initialized) destroyApplication();
      // Pending initialization disposes its resources immediately after resolving.
    };
  }, []);

  return (
    <section className="game-canvas" aria-labelledby="arena-heading">
      <div className="game-canvas__header">
        <h2 id="arena-heading" className="game-canvas__title">Arena preview</h2>
        <p className="game-canvas__status" role="status">
          {status === 'loading' && 'Preparing arena…'}
          {status === 'ready' && 'Ready'}
          {status === 'error' && 'Unavailable'}
        </p>
      </div>

      <div ref={viewportRef} className="game-canvas__viewport" aria-busy={status === 'loading'}>
        <canvas ref={canvasRef} className="game-canvas__surface" aria-label="Game arena" />
      </div>

      {status === 'error' && (
        <p className="game-canvas__error" role="alert">
          Unable to open the arena. Refresh the page to try again.
        </p>
      )}
    </section>
  );
}
