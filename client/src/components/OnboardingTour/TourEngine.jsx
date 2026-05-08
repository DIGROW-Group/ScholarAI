import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Fade,
  LinearProgress,
  Paper,
  Slide,
  Snackbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { Check } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const STEP_EVENT_NAME = 'scholarai:onboarding-tour-step';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const uniquePlacements = (placements) => placements.filter((p, idx) => placements.indexOf(p) === idx);

const getViewport = () => ({
  width: window.innerWidth || 0,
  height: window.innerHeight || 0,
});

const getTargetRectFromEl = (el) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const buildCandidatePosition = ({ placement, targetRect, tooltipSize, gap }) => {
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  if (placement === 'bottom') {
    return {
      top: targetRect.top + targetRect.height + gap,
      left: targetCenterX - tooltipSize.width / 2,
    };
  }

  if (placement === 'top') {
    return {
      top: targetRect.top - tooltipSize.height - gap,
      left: targetCenterX - tooltipSize.width / 2,
    };
  }

  if (placement === 'left') {
    return {
      top: targetCenterY - tooltipSize.height / 2,
      left: targetRect.left - tooltipSize.width - gap,
    };
  }

  // right
  return {
    top: targetCenterY - tooltipSize.height / 2,
    left: targetRect.left + targetRect.width + gap,
  };
};

const fitsInViewport = ({ top, left, tooltipSize, viewport, margin }) => {
  const right = left + tooltipSize.width;
  const bottom = top + tooltipSize.height;
  return (
    top >= margin &&
    left >= margin &&
    right <= viewport.width - margin &&
    bottom <= viewport.height - margin
  );
};

const clampToViewport = ({ top, left, tooltipSize, viewport, margin }) => {
  return {
    top: clamp(top, margin, Math.max(margin, viewport.height - margin - tooltipSize.height)),
    left: clamp(left, margin, Math.max(margin, viewport.width - margin - tooltipSize.width)),
  };
};

export default function TourEngine({ steps, refs }) {
  const { completeOnboarding } = useAuth();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const normalizedSteps = useMemo(() => (Array.isArray(steps) ? steps : []), [steps]);
  const totalSteps = normalizedSteps.length;

  const [open, setOpen] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPlacement, setTooltipPlacement] = useState('bottom');
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const activeStep = normalizedSteps[activeIndex];

  const getTargetEl = useCallback(() => {
    if (!activeStep?.refKey || !refs) return null;
    const refObj = refs[activeStep.refKey];
    return refObj?.current || null;
  }, [activeStep?.refKey, refs]);

  const updateTargetRect = useCallback(() => {
    const el = getTargetEl();
    const nextRect = getTargetRectFromEl(el);
    if (!nextRect) return false;
    setTargetRect(nextRect);
    return true;
  }, [getTargetEl]);

  // Notify dashboards about the current step so they can reveal tabbed content if needed.
  useEffect(() => {
    if (!open || !activeStep?.refKey) return;
    window.dispatchEvent(
      new CustomEvent(STEP_EVENT_NAME, {
        detail: { refKey: activeStep.refKey, stepIndex: activeIndex },
      })
    );
  }, [open, activeIndex, activeStep?.refKey]);

  // Smooth scrolling + initial measurement per step.
  useEffect(() => {
    if (!open) return;

    const el = getTargetEl();
    if (el?.scrollIntoView) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }

    let cancelled = false;
    const start = performance.now();

    const tick = () => {
      if (cancelled) return;
      const ok = updateTargetRect();
      if (ok) return;
      if (performance.now() - start < 2500) {
        window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [open, activeIndex, getTargetEl, updateTargetRect, prefersReducedMotion]);

  // Recalculate on scroll/resize.
  useEffect(() => {
    if (!open) return;

    const handle = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, updateTargetRect]);

  // ResizeObserver for target changes.
  useEffect(() => {
    if (!open) return;

    const el = getTargetEl();
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      updateTargetRect();
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [open, activeIndex, getTargetEl, updateTargetRect]);

  // Tooltip positioning.
  useLayoutEffect(() => {
    if (!open) return;

    const viewport = getViewport();
    const tooltipEl = tooltipRef.current;

    if (!tooltipEl) return;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const tooltipSize = { width: tooltipRect.width, height: tooltipRect.height };

    const gap = 12;
    const margin = 12;

    // If target isn't ready yet, center the tooltip.
    if (!targetRect) {
      setTooltipPlacement(activeStep?.position || 'bottom');
      setTooltipPos({
        top: clamp(viewport.height / 2 - tooltipSize.height / 2, margin, viewport.height - margin),
        left: clamp(viewport.width / 2 - tooltipSize.width / 2, margin, viewport.width - margin),
      });
      return;
    }

    const preferred = activeStep?.position || 'bottom';
    const candidates = uniquePlacements([preferred, 'bottom', 'top', 'left', 'right']);

    for (const placement of candidates) {
      const candidate = buildCandidatePosition({ placement, targetRect, tooltipSize, gap });
      const clamped = clampToViewport({ ...candidate, tooltipSize, viewport, margin });
      if (fitsInViewport({ ...clamped, tooltipSize, viewport, margin })) {
        setTooltipPlacement(placement);
        setTooltipPos(clamped);
        return;
      }
    }

    // If nothing fully fits, clamp preferred.
    const fallback = buildCandidatePosition({ placement: preferred, targetRect, tooltipSize, gap });
    setTooltipPlacement(preferred);
    setTooltipPos(clampToViewport({ ...fallback, tooltipSize, viewport, margin }));
  }, [open, activeIndex, targetRect, activeStep?.position]);

  const finishTour = useCallback(async () => {
    setOpen(false);

    try {
      await completeOnboarding();
    } catch (e) {
      // If this fails, backend flag won't persist; we still close the tour.
      // eslint-disable-next-line no-console
      console.error('Failed to mark onboarding complete:', e);
    }

    setSnackbarOpen(true);
  }, [completeOnboarding]);

  const handleSkip = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const handleNext = useCallback(() => {
    if (activeIndex >= totalSteps - 1) {
      finishTour();
      return;
    }
    setActiveIndex((prev) => prev + 1);
  }, [activeIndex, totalSteps, finishTour]);

  // Keyboard support.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleNext, handleSkip]);

  const progressValue = totalSteps > 0 ? ((activeIndex + 1) / totalSteps) * 100 : 0;

  const highlightStyle = useMemo(() => {
    if (!targetRect) return null;

    const baseTransition = prefersReducedMotion
      ? 'none'
      : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    return {
      position: 'fixed',
      top: targetRect.top,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
      borderRadius: '12px',
      border: '2px solid #ea9b20',
      boxShadow: '0 0 0 4px rgba(234, 155, 32, 0.25), 0 0 0 9999px rgba(0,0,0,0.55)',
      transition: baseTransition,
      backgroundColor: 'transparent',
      zIndex: 2000,
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: -8,
        borderRadius: '16px',
        border: '2px solid rgba(234, 155, 32, 0.35)',
        transformOrigin: 'center',
        animation: prefersReducedMotion ? 'none' : 'tourPulse 1.6s ease-in-out infinite',
      },
      '@keyframes tourPulse': {
        '0%': { transform: 'scale(1)', opacity: 0.7 },
        '100%': { transform: 'scale(1.04)', opacity: 0.2 },
      },
    };
  }, [targetRect, prefersReducedMotion]);

  const tooltipArrowSx = useMemo(() => {
    const base = {
      position: 'absolute',
      width: 14,
      height: 14,
      zIndex: 1,
      '@keyframes tourCaret': {
        '0%': { transform: 'rotate(45deg) translate(0, 0)' },
        '50%': { transform: 'rotate(45deg) translate(0, -2px)' },
        '100%': { transform: 'rotate(45deg) translate(0, 0)' },
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundColor: 'background.paper',
        transform: 'rotate(45deg)',
        borderLeft: '1px solid rgba(0,0,0,0.12)',
        borderTop: '1px solid rgba(0,0,0,0.12)',
        boxSizing: 'border-box',
        animation: prefersReducedMotion ? 'none' : 'tourCaret 1s ease-in-out infinite',
      },
    };

    if (tooltipPlacement === 'top') {
      return { ...base, bottom: -7, left: '50%', transform: 'translateX(-50%)' };
    }

    if (tooltipPlacement === 'left') {
      return { ...base, right: -7, top: '50%', transform: 'translateY(-50%)' };
    }

    if (tooltipPlacement === 'right') {
      return { ...base, left: -7, top: '50%', transform: 'translateY(-50%)' };
    }

    // bottom
    return { ...base, top: -7, left: '50%', transform: 'translateX(-50%)' };
  }, [tooltipPlacement, prefersReducedMotion]);

  if (finished || totalSteps === 0) {
    return null;
  }

  return (
    <>
      {open && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          {!targetRect && (
            <Box
              sx={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            />
          )}

          {highlightStyle && <Box sx={highlightStyle} />}

          <Box
            sx={{
              position: 'fixed',
              top: tooltipPos.top,
              left: tooltipPos.left,
              pointerEvents: 'auto',
              zIndex: 2001,
              maxWidth: 360,
              width: 'calc(100vw - 24px)',
            }}
            key={activeIndex}
          >
            <Slide
              direction="up"
              in
              appear={!prefersReducedMotion}
              timeout={prefersReducedMotion ? 0 : 320}
            >
              <Fade in timeout={prefersReducedMotion ? 0 : 260}>
                <Paper
                  ref={tooltipRef}
                  elevation={6}
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'visible',
                    p: 2,
                  }}
                >
                  <Box sx={tooltipArrowSx} />

                  <Typography variant="caption" color="text.secondary">
                    Step {activeIndex + 1} of {totalSteps}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{ fontSize: 22, lineHeight: 1 }}>{activeStep?.emoji}</Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {activeStep?.headline}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.75,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {activeStep?.description}
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{
                      mt: 1.5,
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#ea9b20',
                      },
                    }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mt: 1.5,
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={handleSkip}
                      sx={{
                        color: 'text.secondary',
                        textTransform: 'none',
                      }}
                    >
                      Skip tour
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{
                        backgroundColor: '#ea9b20',
                        textTransform: 'none',
                        fontWeight: 700,
                        '&:hover': {
                          backgroundColor: '#d68918',
                        },
                      }}
                    >
                      {activeIndex >= totalSteps - 1 ? "Let's go! 🚀" : 'Next →'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1.25 }}>
                    {normalizedSteps.map((_, idx) => {
                      const isCompleted = idx < activeIndex;
                      const isCurrent = idx === activeIndex;

                      if (isCompleted) {
                        return (
                          <Box
                            key={idx}
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(234,155,32,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ea9b20',
                              border: '1px solid rgba(234,155,32,0.5)',
                            }}
                          >
                            <Check sx={{ fontSize: 12 }} />
                          </Box>
                        );
                      }

                      return (
                        <Box
                          key={idx}
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: isCurrent ? '#ea9b20' : 'transparent',
                            border: isCurrent ? '1px solid #ea9b20' : '1px solid rgba(0,0,0,0.25)',
                          }}
                        />
                      );
                    })}
                  </Box>
                </Paper>
              </Fade>
            </Slide>
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => {
          setSnackbarOpen(false);
          setFinished(true);
        }}
        message="You're all set! Explore Scholar AI 🎉"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
