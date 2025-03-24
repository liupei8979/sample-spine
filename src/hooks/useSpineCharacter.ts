import { useCallback, useEffect, useRef, useState } from "react";

// 타입 정의 추가
interface SpineModelOptions {
  atlasPath: string;
  skeletonPath: string;
  initialScale: number;
  position?: { x: number; y: number };
}

// 반환 타입을 명시적으로 정의
interface SpineCharacterHookResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  animations: string[];
  error: string | null;
  setExternalAnimation: (animName: string) => void;
  setExternalScale: (newScale: number) => void;
}

export function useSpineCharacter(
  id: string,
  {
    atlasPath,
    skeletonPath,
    initialScale,
    position = { x: 0, y: 0 },
  }: SpineModelOptions,
  isPlaying: boolean,
  onDebugInfo: (info: string) => void
): SpineCharacterHookResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animations, setAnimations] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 중요: 외부 입력용 ref 사용 (상태가 아님!)
  const currentAnimationRef = useRef<string>("");
  const currentScaleRef = useRef<number>(initialScale);

  // CanvasKit 및 렌더링 관련 객체들을 ref로 저장
  const ckRef = useRef<any>(null);
  const surfaceRef = useRef<any>(null);
  const drawableRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animationChangeBlockedRef = useRef<boolean>(false);

  // 외부에서 애니메이션 설정하는 함수
  const setExternalAnimation = useCallback(
    (animName: string) => {
      if (animName === currentAnimationRef.current) return;

      currentAnimationRef.current = animName;
      onDebugInfo(`${id}: 외부에서 애니메이션 요청: ${animName}`);

      if (!isLoaded || !drawableRef.current) return;

      // 애니메이션 변경 차단 상태면 무시
      if (animationChangeBlockedRef.current) {
        onDebugInfo(`${id}: 애니메이션 변경 차단됨 (진행 중): ${animName}`);
        return;
      }

      changeAnimation(animName);
    },
    [id, isLoaded, onDebugInfo]
  );

  // 외부에서 스케일 설정하는 함수
  const setExternalScale = useCallback(
    (newScale: number) => {
      if (newScale === currentScaleRef.current) return;

      currentScaleRef.current = newScale;

      if (!isLoaded || !drawableRef.current) return;

      if (drawableRef.current && drawableRef.current.skeleton) {
        drawableRef.current.skeleton.scaleX = newScale;
        drawableRef.current.skeleton.scaleY = newScale;
        onDebugInfo(`${id}: 스케일 변경: ${newScale.toFixed(2)}`);
      }
    },
    [id, isLoaded, onDebugInfo]
  );

  // 애니메이션 변경 함수 (실제 구현)
  const changeAnimation = useCallback(
    (animName: string) => {
      onDebugInfo(`${id}: 애니메이션 변경 시도: ${animName}`);

      if (!drawableRef.current || !drawableRef.current.animationState) {
        onDebugInfo(
          `${id}: 드로어블 또는 애니메이션 상태가 초기화되지 않았습니다`
        );
        return;
      }

      try {
        // 변경 중 상태로 설정
        animationChangeBlockedRef.current = true;

        const animState = drawableRef.current.animationState;

        // 모든 트랙 클리어
        animState.clearTracks();

        // 모든 리스너 제거
        animState.clearListeners();

        // 애니메이션 상태 업데이트
        animState.update(0);

        // 포즈 리셋
        drawableRef.current.skeleton.setToSetupPose();

        // 새 애니메이션 설정
        const trackEntry = animState.setAnimation(0, animName, true);

        if (trackEntry) {
          trackEntry.trackTime = 0;
          onDebugInfo(`${id}: 애니메이션 변경 성공: ${animName}`);
        } else {
          onDebugInfo(`${id}: 트랙 엔트리를 생성하지 못했습니다: ${animName}`);
        }

        // Physics 에러 방지
        try {
          animState.apply(drawableRef.current.skeleton);
          drawableRef.current.skeleton.updateWorldTransform();
        } catch (e) {
          // 물리 관련 오류 무시
        }

        // 잠시 후 변경 차단 해제
        setTimeout(() => {
          animationChangeBlockedRef.current = false;
        }, 200); // 애니메이션 변경 완료 후 일정 시간 동안 다른 변경 차단
      } catch (error) {
        onDebugInfo(`${id}: 애니메이션 변경 중 오류: ${error}`);
        animationChangeBlockedRef.current = false;
      }
    },
    [id, onDebugInfo]
  );

  // WebGL 지원 확인 함수
  const checkWebGLSupport = () => {
    try {
      const canvas = document.createElement("canvas");
      return (
        !!window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  };

  // Spine 캐릭터 초기화 함수
  const initializeSpineCharacter = async () => {
    if (!canvasRef.current) {
      onDebugInfo("캔버스 요소를 찾을 수 없습니다");
      return;
    }

    // WebGL 지원 확인
    if (!checkWebGLSupport()) {
      const errorMsg =
        "WebGL이 지원되지 않습니다. 브라우저를 업데이트하거나 다른 브라우저를 사용해 보세요.";
      onDebugInfo(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      onDebugInfo("CanvasKit 초기화 중...");

      // 캔버스 크기 설정 (고해상도 지원)
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // 파일 읽기 도우미 함수
      const readFile = async (path: string) => {
        onDebugInfo(`파일 로드 중: ${path}`);
        try {
          const response = await fetch(path);
          if (!response.ok)
            throw new Error(`Could not load file ${path}: ${response.status}`);
          return await response.arrayBuffer();
        } catch (error) {
          onDebugInfo(`파일 로드 실패: ${path} - ${error}`);
          throw error;
        }
      };

      // CanvasKit 초기화 또는 전역 인스턴스 사용
      const ck = window.ckInstance || (await window.CanvasKitInit());
      ckRef.current = ck;
      if (!window.ckInstance) {
        window.ckInstance = ck;
      }

      // 캔버스에서 서피스 생성
      const surface = ck.MakeCanvasSurface(id);
      if (!surface) {
        const errorMsg = "서피스를 생성할 수 없습니다. WebGL이 지원되나요?";
        onDebugInfo(errorMsg);
        setError(errorMsg);
        return;
      }
      surfaceRef.current = surface;

      // 좌표계 스케일링
      surface.getCanvas().scale(dpr, dpr);

      // 에셋 로드
      try {
        onDebugInfo("Spine 에셋 로드 중...");

        // Atlas 로드
        onDebugInfo("atlas 로드 중...");
        const atlas = await window.spine.loadTextureAtlas(
          ck,
          atlasPath,
          readFile
        );
        onDebugInfo("atlas 로드 완료");

        // 스켈레톤 데이터 로드
        onDebugInfo("skeleton 데이터 로드 중...");
        const skeletonData = await window.spine.loadSkeletonData(
          skeletonPath,
          atlas,
          readFile
        );
        onDebugInfo("skeleton 데이터 로드 완료");

        // 드로어블 생성 및 스케일링, 위치 설정
        onDebugInfo("SkeletonDrawable 생성 중...");
        const drawable = new window.spine.SkeletonDrawable(skeletonData);
        drawable.skeleton.scaleX = drawable.skeleton.scaleY = initialScale;
        drawable.skeleton.x = position.x || width / 2;
        drawable.skeleton.y = position.y || height - 50;
        drawableRef.current = drawable;
        onDebugInfo("SkeletonDrawable 생성 완료");

        // 렌더러 생성
        onDebugInfo("SkeletonRenderer 생성 중...");
        const renderer = new window.spine.SkeletonRenderer(ck);
        rendererRef.current = renderer;
        onDebugInfo("SkeletonRenderer 생성 완료");

        // 사용 가능한 애니메이션 목록 설정
        const animList = skeletonData.animations.map((a: any) => a.name);
        setAnimations(animList);
        onDebugInfo(`사용 가능한 애니메이션: ${animList.join(", ")}`);

        // 초기 애니메이션 설정
        if (animList.length > 0) {
          const firstAnim = animList[0];
          drawable.animationState.setAnimation(0, firstAnim, true);
          currentAnimationRef.current = firstAnim;
          onDebugInfo(`초기 애니메이션 설정: ${firstAnim}`);
        }

        // 로딩 완료 처리
        setIsLoaded(true);
        lastTimeRef.current = performance.now();

        // 애니메이션 루프 시작
        setTimeout(() => {
          onDebugInfo("애니메이션 루프 시작...");
          startAnimationLoop();
        }, 100);
      } catch (error) {
        const errorMsg = `Spine 에셋 로드 중 오류: ${error}`;
        onDebugInfo(errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `CanvasKit 초기화 중 오류: ${error}`;
      onDebugInfo(errorMsg);
      setError(errorMsg);
    }
  };

  // 애니메이션 루프 함수
  const startAnimationLoop = () => {
    if (
      !surfaceRef.current ||
      !drawableRef.current ||
      !rendererRef.current ||
      !ckRef.current
    ) {
      onDebugInfo("렌더링에 필요한 객체가 초기화되지 않았습니다");
      return;
    }

    // 오류 처리 래퍼 함수
    const safeRender = () => {
      try {
        const canvas = surfaceRef.current.getCanvas();

        // 캔버스 클리어 - 알파값을 0으로 설정하여 투명하게
        canvas.clear(ckRef.current.Color(52, 52, 54, 0));

        if (isPlaying) {
          // 델타 타임 계산
          const now = performance.now();
          const deltaTime = (now - lastTimeRef.current) / 1000;
          lastTimeRef.current = now;

          // 애니메이션 업데이트
          drawableRef.current.update(deltaTime);
        }

        try {
          // 스켈레톤 렌더링 시도
          rendererRef.current.render(canvas, drawableRef.current);
        } catch (e) {
          // 렌더링 실패 시 오류 기록하고 계속 진행
          console.error("렌더링 중 오류 발생:", e);
        }

        // 다음 프레임 요청
        animLoopRef.current =
          surfaceRef.current.requestAnimationFrame(safeRender);
      } catch (e) {
        onDebugInfo(`애니메이션 루프 오류: ${e}`);
        // 오류 복구 시도
        setTimeout(() => {
          animLoopRef.current =
            surfaceRef.current?.requestAnimationFrame?.(safeRender);
        }, 1000);
      }
    };

    // 애니메이션 루프 시작
    animLoopRef.current = surfaceRef.current.requestAnimationFrame(safeRender);
  };

  // 컴포넌트 마운트/언마운트 처리
  useEffect(() => {
    let checkCanvasKitInterval: ReturnType<typeof setInterval>;

    const setupCanvasKit = () => {
      try {
        if (
          typeof window.CanvasKitInit === "function" &&
          typeof window.spine === "object"
        ) {
          onDebugInfo("CanvasKit 및 Spine 라이브러리가 로드되었습니다.");
          initializeSpineCharacter();
        } else {
          onDebugInfo("CanvasKit 또는 Spine 라이브러리 로드 대기 중...");
          checkCanvasKitInterval = setInterval(() => {
            if (
              typeof window.CanvasKitInit === "function" &&
              typeof window.spine === "object"
            ) {
              onDebugInfo("CanvasKit 및 Spine 라이브러리 로드 감지!");
              clearInterval(checkCanvasKitInterval);
              initializeSpineCharacter();
            }
          }, 200);

          // 15초 후에도 로드되지 않으면 타임아웃
          setTimeout(() => {
            if (checkCanvasKitInterval) {
              clearInterval(checkCanvasKitInterval);
              if (
                typeof window.CanvasKitInit !== "function" ||
                typeof window.spine !== "object"
              ) {
                const errorMsg =
                  "CanvasKit 또는 Spine 라이브러리 로드 타임아웃";
                onDebugInfo(errorMsg);
                setError(errorMsg);
              }
            }
          }, 15000);
        }
      } catch (e) {
        onDebugInfo(`setupCanvasKit 오류: ${e}`);
      }
    };

    setTimeout(setupCanvasKit, 100);

    // 컴포넌트 언마운트 시 정리
    return () => {
      try {
        if (checkCanvasKitInterval) {
          clearInterval(checkCanvasKitInterval);
        }

        if (animLoopRef.current !== null) {
          if (surfaceRef.current) {
            try {
              surfaceRef.current.cancelAnimationFrame(animLoopRef.current);
            } catch (e) {
              console.error("cancelAnimationFrame 오류:", e);
            }
          } else {
            cancelAnimationFrame(animLoopRef.current);
          }
          animLoopRef.current = null;
        }

        // 리소스 정리
        if (surfaceRef.current) {
          try {
            surfaceRef.current.delete();
          } catch (e) {
            console.error("surface 삭제 오류:", e);
          }
          surfaceRef.current = null;
        }

        // 다른 리소스들 정리
        drawableRef.current = null;
        rendererRef.current = null;
        ckRef.current = null;

        onDebugInfo("리소스가 정리되었습니다.");
      } catch (e) {
        console.error("정리 중 오류:", e);
      }
    };
  }, [atlasPath, skeletonPath]);

  // 재생 상태 변경 시 처리
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
    }
  }, [isPlaying]);

  // 스케일 변경 효과 적용
  useEffect(() => {
    if (drawableRef.current && drawableRef.current.skeleton) {
      drawableRef.current.skeleton.scaleX = currentScaleRef.current;
      drawableRef.current.skeleton.scaleY = currentScaleRef.current;
    }
  }, [isPlaying]);

  return {
    canvasRef,
    animations,
    error,
    setExternalAnimation,
    setExternalScale,
  };
}
