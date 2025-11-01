import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, easeOut, animate } from "framer-motion";

// Optimized Video Component
const VideoElement = React.memo(({ src, index, preloadedVideo, isLoaded }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (preloadedVideo && videoRef.current) {
      // Clone the preloaded video element
      const currentVideo = videoRef.current;
      currentVideo.src = preloadedVideo.src;
      currentVideo.currentTime = preloadedVideo.currentTime;
      
      // Start playing immediately if preloaded
      if (isLoaded) {
        currentVideo.play().catch(console.warn);
        setIsPlaying(true);
      }
    }
  }, [preloadedVideo, isLoaded]);

  const handleVideoLoad = useCallback(() => {
    if (videoRef.current && !isPlaying) {
      videoRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return (
    <video
      ref={videoRef}
      src={!preloadedVideo ? src : undefined}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      onCanPlayThrough={handleVideoLoad}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none',
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
});

export function ThreeDImageRing({
  images,
  videos,
  width = 300,
  perspective = 2000,
  imageDistance = 500,
  initialRotation = 180,
  animationDuration = 1.5,
  staggerDelay = 0.1,
  hoverOpacity = 0.5,
  containerClassName,
  ringClassName,
  imageClassName,
  backgroundColor,
  draggable = true,
  ease = "easeOut",
  mobileBreakpoint = 768,
  mobileScaleFactor = 0.8,
  inertiaPower = 0.8,
  inertiaTimeConstant = 300,
  inertiaVelocityMultiplier = 20,
}) {
  const containerRef = useRef(null);
  const ringRef = useRef(null);

  const rotationY = useMotionValue(initialRotation);
  const startX = useRef(0);
  const currentRotationY = useRef(initialRotation);
  const isDragging = useRef(false);
  const velocity = useRef(0);

  const [currentScale, setCurrentScale] = useState(1);
  const [showImages, setShowImages] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState(new Set());
  const [preloadedVideos, setPreloadedVideos] = useState(new Map());

  const mediaItems = videos || images;
  const isVideo = !!videos;
  const angle = useMemo(() => 360 / mediaItems.length, [mediaItems.length]);

  // Preload videos for smooth playback
  const preloadVideos = useCallback(async () => {
    if (!isVideo) return;
    
    const videoMap = new Map();
    const loadPromises = mediaItems.map((videoUrl, index) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        
        const handleCanPlay = () => {
          videoMap.set(index, video);
          setLoadedVideos(prev => new Set([...prev, index]));
          resolve();
        };
        
        const handleError = () => {
          console.warn(`Failed to preload video: ${videoUrl}`);
          resolve(); // Don't block other videos
        };
        
        video.addEventListener('canplaythrough', handleCanPlay, { once: true });
        video.addEventListener('error', handleError, { once: true });
        
        // Start loading
        video.load();
      });
    });
    
    // Load first few videos immediately, then load others
    await Promise.all(loadPromises.slice(0, 3));
    setPreloadedVideos(videoMap);
    
    // Continue loading remaining videos in background
    Promise.all(loadPromises.slice(3));
  }, [mediaItems, isVideo]);

  useEffect(() => {
    preloadVideos();
  }, [preloadVideos]);

  const getBgPos = (imageIndex, currentRot, scale) => {
    const scaledImageDistance = imageDistance * scale;
    const effectiveRotation = currentRot - 180 - imageIndex * angle;
    const parallaxOffset = ((effectiveRotation % 360 + 360) % 360) / 360;
    return `${-(parallaxOffset * (scaledImageDistance / 1.5))}px 0px`;
  };

  useEffect(() => {
    const unsubscribe = rotationY.on("change", (latestRotation) => {
      if (ringRef.current) {
        Array.from(ringRef.current.children).forEach((imgElement, i) => {
          imgElement.style.backgroundPosition = getBgPos(
            i,
            latestRotation,
            currentScale
          );
        });
      }
      currentRotationY.current = latestRotation;
    });
    return () => unsubscribe();
  }, [rotationY, mediaItems.length, imageDistance, currentScale, angle]);

  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const newScale = viewportWidth <= mobileBreakpoint ? mobileScaleFactor : 1;
      setCurrentScale(newScale);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint, mobileScaleFactor]);

  useEffect(() => {
    setShowImages(true);
  }, []);

  // Auto-rotation effect with smoother animation
  useEffect(() => {
    if (!draggable) return;
    
    let animationId;
    let lastTime = performance.now();
    const rotationSpeed = 0.005; // Even slower rotation (degrees per millisecond)

    const autoRotate = (currentTime) => {
      if (!isDragging.current) {
        const deltaTime = currentTime - lastTime;
        const currentRotation = rotationY.get();
        // Smooth rotation based on actual time elapsed
        rotationY.set(currentRotation + (rotationSpeed * deltaTime));
      }
      lastTime = currentTime;
      animationId = requestAnimationFrame(autoRotate);
    };

    animationId = requestAnimationFrame(autoRotate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [draggable, rotationY]);

  const handleDragStart = (event) => {
    if (!draggable) return;
    isDragging.current = true;
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    startX.current = clientX;
    rotationY.stop();
    velocity.current = 0;
    if (ringRef.current) {
      ringRef.current.style.cursor = "grabbing";
    }
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDrag);
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleDrag = (event) => {
    if (!draggable || !isDragging.current) return;

    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const deltaX = clientX - startX.current;

    velocity.current = -deltaX * 0.5;

    rotationY.set(currentRotationY.current + velocity.current);

    startX.current = clientX;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    if (ringRef.current) {
      ringRef.current.style.cursor = "grab";
      currentRotationY.current = rotationY.get();
    }

    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDrag);
    document.removeEventListener("touchend", handleDragEnd);

    const initial = rotationY.get();
    const velocityBoost = velocity.current * inertiaVelocityMultiplier;
    const target = initial + velocityBoost;

    animate(initial, target, {
      type: "inertia",
      velocity: velocityBoost,
      power: inertiaPower,
      timeConstant: inertiaTimeConstant,
      restDelta: 0.5,
      modifyTarget: (target) => Math.round(target / angle) * angle,
      onUpdate: (latest) => {
        rotationY.set(latest);
      },
    });

    velocity.current = 0;
  };

  const imageVariants = {
    hidden: { y: 0, opacity: 1 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden select-none relative ${containerClassName || ''}`}
      style={{
        backgroundColor,
        transform: `scale(${currentScale})`,
        transformOrigin: "center center",
      }}
      onMouseDown={draggable ? handleDragStart : undefined}
      onTouchStart={draggable ? handleDragStart : undefined}
    >
      <div
        style={{
          perspective: `${perspective}px`,
          width: `${width}px`,
          height: `${width * 1.33}px`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <motion.div
          ref={ringRef}
          className={ringClassName || ''}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            transformStyle: "preserve-3d",
            rotateY: rotationY,
            cursor: draggable ? "grab" : "default",
          }}
        >
          <AnimatePresence>
            {showImages && mediaItems.map((mediaUrl, index) => (
              <motion.div
                key={index}
                className={imageClassName || ''}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  rotateY: index * -angle,
                  z: -imageDistance * currentScale,
                  transformOrigin: `50% 50% ${imageDistance * currentScale}px`,
                  overflow: 'hidden',
                  borderRadius: '20px',
                }}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={imageVariants}
                custom={index}
                transition={{
                  delay: index * staggerDelay,
                  duration: animationDuration,
                  ease: easeOut,
                }}
                whileHover={{ opacity: 1, transition: { duration: 0.15 } }}
                onHoverStart={() => {
                  if (isDragging.current) return;
                  if (ringRef.current) {
                    Array.from(ringRef.current.children).forEach((imgEl, i) => {
                      if (i !== index) {
                        imgEl.style.opacity = `${hoverOpacity}`;
                      }
                    });
                  }
                }}
                onHoverEnd={() => {
                  if (isDragging.current) return;
                  if (ringRef.current) {
                    Array.from(ringRef.current.children).forEach((imgEl) => {
                      imgEl.style.opacity = `1`;
                    });
                  }
                }}
              >
                {isVideo ? (
                  <VideoElement
                    src={mediaUrl}
                    index={index}
                    preloadedVideo={preloadedVideos.get(index)}
                    isLoaded={loadedVideos.has(index)}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(${mediaUrl})`,
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: getBgPos(index, currentRotationY.current, currentScale),
                    }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default ThreeDImageRing;
