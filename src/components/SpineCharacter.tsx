import { useEffect } from "react";
import { useSpineCharacter } from "../hooks/useSpineCharacter";

interface SpineCharacterProps {
    id: string;
    atlasPath: string;
    skeletonPath: string;
    initialScale: number;
    position?: { x: number; y: number };
    zIndex: number;
    isPlaying: boolean;
    currentAnimation: string;
    scale: number;
    onAnimationsLoaded: (animations: string[]) => void;
    onError?: (error: string) => void;
    onDebugInfo: (info: string) => void;
}

export function SpineCharacter({
    id,
    atlasPath,
    skeletonPath,
    initialScale,
    position,
    zIndex,
    isPlaying,
    currentAnimation,
    scale,
    onAnimationsLoaded,
    onError,
    onDebugInfo,
}: SpineCharacterProps) {
    // 중요: 이제 onAnimationChanged와 onScaleChanged를 제거했습니다

    const {
        canvasRef,
        animations,
        error,
        setExternalAnimation, // 새로운 함수
        setExternalScale, // 새로운 함수
    } = useSpineCharacter(
        id,
        {
            atlasPath,
            skeletonPath,
            initialScale,
            position,
        },
        isPlaying,
        onDebugInfo
    );

    // 애니메이션 목록이 로드되면 상위 컴포넌트에 알림
    useEffect(() => {
        if (animations.length > 0) {
            onAnimationsLoaded(animations);
        }
    }, [animations, onAnimationsLoaded]);

    // 오류가 발생하면 상위 컴포넌트에 알림
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    // 상위 컴포넌트로부터 애니메이션 변경 요청 처리
    useEffect(() => {
        if (currentAnimation) {
            setExternalAnimation(currentAnimation);
        }
    }, [currentAnimation, setExternalAnimation]);

    // 상위 컴포넌트로부터 스케일 변경 요청 처리
    useEffect(() => {
        setExternalScale(scale);
    }, [scale, setExternalScale]);

    return (
        <canvas
            id={id}
            ref={canvasRef}
            style={{
                width: "800px",
                height: "600px",
                margin: "20px auto",
                display: "block",
                backgroundColor: "transparent",
                imageRendering: "crisp-edges",
                position: "absolute",
                zIndex,
            }}
        />
    );
}
