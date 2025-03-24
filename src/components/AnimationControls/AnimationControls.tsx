import "../App/App.css";

interface AnimationControlsProps {
    title: string;
    animations: string[];
    currentAnimation: string;
    scale: number;
    isLoaded: boolean;
    onAnimationChange: (animation: string) => void;
    onScaleChange: (scale: number) => void;
}

export function AnimationControls({
    title,
    animations,
    currentAnimation,
    scale,
    isLoaded,
    onAnimationChange,
    onScaleChange,
}: AnimationControlsProps) {
    return (
        <div className="animation-buttons">
            <h3>{title} 애니메이션</h3>
            <div className="button-group">
                {animations.map((anim) => (
                    <button
                        key={anim}
                        onClick={() => onAnimationChange(anim)}
                        className={currentAnimation === anim ? "active" : ""}
                        disabled={!isLoaded}
                    >
                        {anim}
                    </button>
                ))}
            </div>

            {/* 스케일 조정 슬라이더 */}
            <div className="scale-control">
                <label>
                    스케일: <span className="scale-value">{scale.toFixed(2)}</span>
                    <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={scale}
                        onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                        disabled={!isLoaded}
                    />
                </label>
            </div>
        </div>
    );
}
