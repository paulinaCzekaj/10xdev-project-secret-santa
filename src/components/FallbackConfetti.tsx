import { useEffect, useRef } from "react";

/**
 * Fallback confetti animation using CSS animations
 * Used when react-confetti fails to load
 */
export function FallbackConfetti() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const container = containerRef.current;

    // Function to update container dimensions
    const updateDimensions = () => {
      if (container) {
        container.style.width = window.innerWidth + "px";
        container.style.height = window.innerHeight + "px";
      }
    };

    // Set initial dimensions
    updateDimensions();

    // Prevent horizontal scroll during animation
    document.body.classList.add("confetti-active");

    const colors = ["#dc2626", "#16a34a", "#fbbf24", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6"];

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + "s";
      piece.style.animationDuration = Math.random() * 2 + 2 + "s";

      container.appendChild(piece);
    }

    // Update dimensions on window resize
    window.addEventListener("resize", updateDimensions);

    // Clean up after animation
    const timer = setTimeout(() => {
      if (container) {
        container.innerHTML = "";
      }
      document.body.classList.remove("confetti-active");
    }, 4000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateDimensions);
      document.body.classList.remove("confetti-active");
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="confetti-container fixed top-0 left-0 pointer-events-none z-50 overflow-hidden"
      style={{
        right: 0,
        bottom: 0,
        maxWidth: "100vw",
        width: "100vw",
      }}
    />
  );
}
