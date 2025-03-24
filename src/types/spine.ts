export interface SpineModel {
  atlasPath: string;
  skeletonPath: string;
  initialScale: number;
  position?: {
    x: number;
    y: number;
  };
}

export interface SpineCharacterProps {
  id: string;
  model: SpineModel;
  zIndex: number;
  isPlaying: boolean;
  onLoad: (animations: string[]) => void;
  onError: (message: string) => void;
  onDebugInfo: (info: string) => void;
}

export interface AnimationControlsProps {
  title: string;
  animations: string[];
  currentAnimation: string;
  scale: number;
  isLoaded: boolean;
  onAnimationChange: (animation: string) => void;
  onScaleChange: (scale: number) => void;
}

// 전역 타입 정의 export
declare global {
  interface Window {
    spine: any;
    CanvasKitInit: () => Promise<any>;
    ckInstance: any;
  }
}
