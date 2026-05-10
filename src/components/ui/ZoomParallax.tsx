import { useScroll, useTransform, motion, type MotionValue } from "framer-motion";
import { useRef } from "react";

export interface ZoomImage {
  src: string;
  srcSet?: string;
  alt?: string;
}

interface Props {
  images: ZoomImage[];
}

// Original horizontal layout from the 21st.dev demo.
// Pairs with 1920x1080 source images pre-cropped to 16:9 in Gallery.astro.
const POSITIONS: { top: string; left: string; height: string; width: string }[] = [
  { top: "0", left: "0", height: "25vh", width: "25vw" },
  { top: "-30vh", left: "5vw", height: "30vh", width: "35vw" },
  { top: "-10vh", left: "-25vw", height: "45vh", width: "20vw" },
  { top: "0", left: "27.5vw", height: "25vh", width: "25vw" },
  { top: "27.5vh", left: "5vw", height: "25vh", width: "20vw" },
  { top: "27.5vh", left: "-22.5vw", height: "25vh", width: "30vw" },
  { top: "22.5vh", left: "25vw", height: "15vh", width: "15vw" },
];

export default function ZoomParallax({ images }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Original demo scales — the dramatic crescendo where the smallest
  // back-positioned image (index 6) grows from 15vw to fill most of the
  // viewport at 9x is what makes the effect feel cinematic. We keep the
  // higher-resolution Cloudinary delivery (5400/9000) + image-rendering
  // hints to fight any softness at peak zoom.
  const scales: MotionValue<number>[] = [
    useTransform(scrollYProgress, [0, 1], [1, 4]),
    useTransform(scrollYProgress, [0, 1], [1, 5]),
    useTransform(scrollYProgress, [0, 1], [1, 6]),
    useTransform(scrollYProgress, [0, 1], [1, 5]),
    useTransform(scrollYProgress, [0, 1], [1, 6]),
    useTransform(scrollYProgress, [0, 1], [1, 8]),
    useTransform(scrollYProgress, [0, 1], [1, 9]),
  ];

  return (
    <div ref={container} className="zoom-parallax">
      <div className="zp-sticky">
        {images.slice(0, 7).map(({ src, srcSet, alt }, i) => {
          const pos = POSITIONS[i] ?? POSITIONS[0];
          // First 4 images come into peak zoom early — load eagerly with high
          // priority so the user never sees a blurry placeholder mid-zoom.
          const isPriority = i < 4;
          return (
            <motion.div key={i} style={{ scale: scales[i] }} className="zp-item">
              <div
                className="zp-inner"
                style={{
                  position: "relative",
                  top: pos.top,
                  left: pos.left,
                  height: pos.height,
                  width: pos.width,
                }}
              >
                <img
                  src={src}
                  srcSet={srcSet}
                  alt={alt ?? ""}
                  loading={isPriority ? "eager" : "lazy"}
                  fetchPriority={isPriority ? "high" : "auto"}
                  decoding="async"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
